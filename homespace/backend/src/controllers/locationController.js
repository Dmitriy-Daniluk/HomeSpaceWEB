const pool = require('../config/db');
const { encryptSecret, decryptSecret } = require('../utils/vaultCrypto');

let encryptedLocationColumnsReady = false;

const ensureEncryptedLocationColumns = async () => {
  if (encryptedLocationColumnsReady) return;

  const [columns] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'user_locations'
       AND COLUMN_NAME IN ('encrypted_latitude', 'encrypted_longitude', 'encrypted_accuracy')`
  );

  const existing = new Set(columns.map((column) => column.COLUMN_NAME));
  const missing = [
    ['encrypted_latitude', 'TEXT NULL'],
    ['encrypted_longitude', 'TEXT NULL'],
    ['encrypted_accuracy', 'TEXT NULL'],
  ].filter(([name]) => !existing.has(name));

  for (const [name, definition] of missing) {
    await pool.query(`ALTER TABLE user_locations ADD COLUMN ${name} ${definition}`);
  }

  encryptedLocationColumnsReady = true;
};

const ensureFamilyMember = async (userId, familyId) => {
  const [membership] = await pool.query(
    'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
    [userId, familyId]
  );
  return membership.length > 0 ? membership[0] : null;
};

const decryptNumber = (value, fallback) => {
  if (!value) return fallback;
  const decrypted = Number(decryptSecret(value));
  return Number.isFinite(decrypted) ? decrypted : fallback;
};

const mapLocation = (location) => {
  const {
    encrypted_latitude: encryptedLatitude,
    encrypted_longitude: encryptedLongitude,
    encrypted_accuracy: encryptedAccuracy,
    ...safeLocation
  } = location;

  return {
    ...safeLocation,
    latitude: decryptNumber(encryptedLatitude, Number(location.latitude)),
    longitude: decryptNumber(encryptedLongitude, Number(location.longitude)),
    accuracy: decryptNumber(encryptedAccuracy, location.accuracy === null ? null : Number(location.accuracy)),
    updatedAt: location.recorded_at,
    updated_at: location.recorded_at,
    isEncrypted: Boolean(encryptedLatitude && encryptedLongitude),
  };
};

const mapGeofence = (geofence) => ({
  ...geofence,
  radius: geofence.radius_meters,
  radiusMeters: geofence.radius_meters,
});

exports.updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    await ensureEncryptedLocationColumns();

    await pool.query(
      `INSERT INTO user_locations
        (user_id, latitude, longitude, accuracy, encrypted_latitude, encrypted_longitude, encrypted_accuracy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        0,
        0,
        null,
        encryptSecret(String(latitude)),
        encryptSecret(String(longitude)),
        accuracy === undefined || accuracy === null ? null : encryptSecret(String(accuracy)),
      ]
    );

    res.json({ message: 'Location updated' });
  } catch (error) {
    next(error);
  }
};

exports.getLatestLocation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await ensureEncryptedLocationColumns();

    if (Number(userId) !== Number(req.user.id)) {
      const [sharedFamilies] = await pool.query(
        `SELECT fm1.family_id
         FROM family_members fm1
         JOIN family_members fm2 ON fm2.family_id = fm1.family_id
         WHERE fm1.user_id = ? AND fm2.user_id = ?
         LIMIT 1`,
        [req.user.id, userId]
      );
      if (sharedFamilies.length === 0) {
        return res.status(403).json({ error: 'Location access denied' });
      }
    }

    const [locations] = await pool.query(
      `SELECT ul.*, u.full_name
       FROM user_locations ul
       JOIN users u ON ul.user_id = u.id
       WHERE ul.user_id = ?
       ORDER BY ul.recorded_at DESC
       LIMIT 1`,
      [userId]
    );

    if (locations.length === 0) {
      return res.json({ message: 'No location data found', data: null });
    }

    const location = mapLocation(locations[0]);
    res.json({ message: 'Location retrieved', data: location, ...location });
  } catch (error) {
    next(error);
  }
};

exports.deleteMyLocation = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM user_locations WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Location deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getGeofences = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const membership = await ensureFamilyMember(req.user.id, familyId);
    if (!membership) return res.status(403).json({ error: 'Not a member of this family' });

    const [geofences] = await pool.query(
      'SELECT * FROM geofences WHERE family_id = ? ORDER BY name ASC',
      [familyId]
    );

    res.json({ message: 'Geofences retrieved', data: geofences.map(mapGeofence) });
  } catch (error) {
    next(error);
  }
};

exports.createGeofence = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const { name, latitude, longitude } = req.body;
    const radiusMeters = req.body.radiusMeters || req.body.radius_meters || req.body.radius;
    const membership = await ensureFamilyMember(req.user.id, familyId);
    if (!membership) return res.status(403).json({ error: 'Not a member of this family' });

    const [result] = await pool.query(
      'INSERT INTO geofences (family_id, name, latitude, longitude, radius_meters) VALUES (?, ?, ?, ?, ?)',
      [familyId, name, latitude, longitude, radiusMeters || 100]
    );

    const [geofences] = await pool.query('SELECT * FROM geofences WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Geofence created', data: mapGeofence(geofences[0]) });
  } catch (error) {
    next(error);
  }
};

exports.deleteGeofence = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [geofences] = await pool.query('SELECT family_id FROM geofences WHERE id = ?', [id]);
    if (geofences.length === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const membership = await ensureFamilyMember(req.user.id, geofences[0].family_id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this family' });

    const [result] = await pool.query('DELETE FROM geofences WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    res.json({ message: 'Geofence deleted' });
  } catch (error) {
    next(error);
  }
};
