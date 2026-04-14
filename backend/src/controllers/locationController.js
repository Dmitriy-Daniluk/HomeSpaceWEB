const pool = require('../config/db');

exports.updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    await pool.query(
      'INSERT INTO user_locations (user_id, latitude, longitude, accuracy) VALUES (?, ?, ?, ?)',
      [req.user.id, latitude, longitude, accuracy || null]
    );

    res.json({ message: 'Location updated' });
  } catch (error) {
    next(error);
  }
};

exports.getLatestLocation = async (req, res, next) => {
  try {
    const { userId } = req.params;

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
      return res.status(404).json({ error: 'No location data found' });
    }

    res.json({ message: 'Location retrieved', data: locations[0] });
  } catch (error) {
    next(error);
  }
};

exports.getGeofences = async (req, res, next) => {
  try {
    const { familyId } = req.params;

    const [geofences] = await pool.query(
      'SELECT * FROM geofences WHERE family_id = ? ORDER BY name ASC',
      [familyId]
    );

    res.json({ message: 'Geofences retrieved', data: geofences });
  } catch (error) {
    next(error);
  }
};

exports.createGeofence = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const { name, latitude, longitude, radiusMeters } = req.body;

    const [result] = await pool.query(
      'INSERT INTO geofences (family_id, name, latitude, longitude, radius_meters) VALUES (?, ?, ?, ?, ?)',
      [familyId, name, latitude, longitude, radiusMeters || 100]
    );

    const [geofences] = await pool.query('SELECT * FROM geofences WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Geofence created', data: geofences[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteGeofence = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM geofences WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    res.json({ message: 'Geofence deleted' });
  } catch (error) {
    next(error);
  }
};
