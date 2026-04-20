const pool = require('../config/db');

const ensureFamilyMember = async (userId, familyId) => {
  const [membership] = await pool.query(
    'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?',
    [userId, familyId]
  );
  return membership.length > 0 ? membership[0] : null;
};

const mapMessage = (message, currentUserId) => ({
  ...message,
  content: message.message,
  senderId: message.sender_id,
  senderName: message.full_name,
  attachmentUrl: message.attachment_url,
  currentUserId,
  isOwn: message.sender_id === currentUserId,
  createdAt: message.created_at,
});

exports.getMessages = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const membership = await ensureFamilyMember(req.user.id, familyId);
    if (!membership) return res.status(403).json({ error: 'Not a member of this family' });

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

    res.json({ message: 'Messages retrieved', data: messages.reverse().map((item) => mapMessage(item, req.user.id)) });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { familyId, attachmentUrl } = req.body;
    const message = req.body.message || req.body.content;

    if (!familyId) {
      return res.status(400).json({ error: 'familyId required' });
    }

    const membership = await ensureFamilyMember(req.user.id, familyId);
    if (!membership) return res.status(403).json({ error: 'Not a member of this family' });

    if ((!message || message.trim().length === 0) && !attachmentUrl) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const finalMessage = message?.trim() || 'Вложение';

    const [result] = await pool.query(
      'INSERT INTO chat_messages (sender_id, family_id, message, attachment_url) VALUES (?, ?, ?, ?)',
      [req.user.id, familyId, finalMessage, attachmentUrl || null]
    );

    const [members] = await pool.query(
      'SELECT user_id FROM family_members WHERE family_id = ? AND user_id != ?',
      [familyId, req.user.id]
    );

    for (const member of members) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [member.user_id, 'Новое сообщение', 'В семейном чате появилось новое сообщение', 'chat']
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

    res.status(201).json({ message: 'Message sent', data: mapMessage(messages[0], req.user.id) });
  } catch (error) {
    next(error);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [messages] = await pool.query(
      `SELECT cm.id, cm.sender_id, cm.family_id, fm.role
       FROM chat_messages cm
       JOIN family_members fm ON fm.family_id = cm.family_id AND fm.user_id = ?
       WHERE cm.id = ?`,
      [req.user.id, id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messages[0];
    if (message.sender_id !== req.user.id && message.role !== 'parent') {
      return res.status(403).json({ error: 'Only sender or parent can delete message' });
    }

    await pool.query('DELETE FROM chat_messages WHERE id = ?', [id]);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    next(error);
  }
};

exports.updateMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = String(req.body.message || req.body.content || '').trim();

    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const [messages] = await pool.query(
      `SELECT cm.id, cm.sender_id, cm.family_id
       FROM chat_messages cm
       JOIN family_members fm ON fm.family_id = cm.family_id AND fm.user_id = ?
       WHERE cm.id = ?`,
      [req.user.id, id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (messages[0].sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only sender can edit message' });
    }

    await pool.query('UPDATE chat_messages SET message = ? WHERE id = ?', [message, id]);

    const [updated] = await pool.query(
      `SELECT cm.id, cm.message, cm.attachment_url, cm.created_at,
              u.id as sender_id, u.full_name, u.avatar_url
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.id = ?`,
      [id]
    );

    res.json({ message: 'Message updated', data: mapMessage(updated[0], req.user.id) });
  } catch (error) {
    next(error);
  }
};
