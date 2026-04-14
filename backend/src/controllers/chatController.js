const pool = require('../config/db');

exports.getMessages = async (req, res, next) => {
  try {
    const { familyId } = req.params;

    const [messages] = await pool.query(
      `SELECT cm.id, cm.message, cm.attachment_url, cm.created_at,
              u.id as sender_id, u.full_name, u.avatar_url
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.family_id = ?
       ORDER BY cm.created_at DESC
       LIMIT 100`,
      [familyId]
    );

    res.json({ message: 'Messages retrieved', data: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { familyId, message, attachmentUrl } = req.body;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId required' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const [result] = await pool.query(
      'INSERT INTO chat_messages (sender_id, family_id, message, attachment_url) VALUES (?, ?, ?, ?)',
      [req.user.id, familyId, message, attachmentUrl || null]
    );

    const [members] = await pool.query(
      'SELECT user_id FROM family_members WHERE family_id = ? AND user_id != ?',
      [familyId, req.user.id]
    );

    for (const member of members) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [member.user_id, 'New Chat Message', `${req.user.full_name || 'Someone'} sent a message`, 'chat']
      );
    }

    const [messages] = await pool.query(
      `SELECT cm.id, cm.message, cm.attachment_url, cm.created_at,
              u.id as sender_id, u.full_name, u.avatar_url
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: 'Message sent', data: messages[0] });
  } catch (error) {
    next(error);
  }
};
