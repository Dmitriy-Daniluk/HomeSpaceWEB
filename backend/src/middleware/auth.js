const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'homespace-secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const isParent = (familyIdParam = 'familyId') => async (req, res, next) => {
  try {
    const pool = require('../config/db');
    const familyId = req.params[familyIdParam] || req.query[familyIdParam];

    if (!familyId) {
      return res.status(400).json({ error: 'Family ID required' });
    }

    const [rows] = await pool.query(
      'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
      [req.user.id, familyId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this family' });
    }

    if (rows[0].role !== 'parent') {
      return res.status(403).json({ error: 'Parent access required' });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { auth, isParent };
