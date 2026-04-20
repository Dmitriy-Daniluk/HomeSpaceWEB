const pool = require('../config/db');

exports.createTicket = async (req, res, next) => {
  try {
    const { subject, message } = req.body;

    const [result] = await pool.query(
      'INSERT INTO support_tickets (user_id, subject, message) VALUES (?, ?, ?)',
      [req.user.id, subject, message]
    );

    const [tickets] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: 'Ticket created', data: tickets[0] });
  } catch (error) {
    next(error);
  }
};

exports.getMyTickets = async (req, res, next) => {
  try {
    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ message: 'Tickets retrieved', data: tickets });
  } catch (error) {
    next(error);
  }
};

exports.adminGetAllTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT st.*, u.email, u.full_name
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC
    `;
    const params = [];

    if (status) {
      query = `
        SELECT st.*, u.email, u.full_name
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.status = ?
        ORDER BY st.created_at DESC
      `;
      params.push(status);
    }

    const [tickets] = await pool.query(query, params);

    res.json({ message: 'Tickets retrieved', data: tickets });
  } catch (error) {
    next(error);
  }
};

exports.adminUpdateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminResponse } = req.body;

    const [existing] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await pool.query(
      'UPDATE support_tickets SET status = COALESCE(?, status), admin_response = COALESCE(?, admin_response) WHERE id = ?',
      [status, adminResponse, id]
    );

    const [tickets] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [id]);

    if (existing[0].user_id) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [existing[0].user_id, 'Support Ticket Updated', `Your ticket "${existing[0].subject}" has been updated`, 'system']
      );
    }

    res.json({ message: 'Ticket updated', data: tickets[0] });
  } catch (error) {
    next(error);
  }
};
