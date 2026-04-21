const pool = require('../config/db');

exports.submitFeedback = async (req, res, next) => {
  try {
    const { message } = req.body;
    const name = req.body.name || req.body.contactName || req.body.contact_name;
    const email = req.body.email || req.body.contactEmail || req.body.contact_email;
    const rating = Number(req.body.rating);

    const userId = req.user ? req.user.id : null;
    const normalizedMessage = String(message || '').trim();
    const normalizedName = String(name || '').trim() || null;
    const normalizedEmail = String(email || '').trim().toLowerCase() || null;
    const normalizedRating = Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;

    if (!normalizedMessage) {
      return res.status(400).json({ error: 'Message is required', message: 'Введите текст отзыва.' });
    }

    const [result] = await pool.query(
      'INSERT INTO feedback (user_id, contact_name, contact_email, message, rating) VALUES (?, ?, ?, ?, ?)',
      [userId, normalizedName, normalizedEmail, normalizedMessage, normalizedRating]
    );

    res.status(201).json({ message: 'Feedback submitted', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};
