const pool = require('../config/db');

exports.submitFeedback = async (req, res, next) => {
  try {
    const { message, rating } = req.body;

    const userId = req.user ? req.user.id : null;

    const [result] = await pool.query(
      'INSERT INTO feedback (user_id, message, rating) VALUES (?, ?, ?)',
      [userId, message, rating || null]
    );

    res.status(201).json({ message: 'Feedback submitted', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};
