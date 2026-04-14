const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { familyId, relatedTaskId, relatedTransactionId } = req.body;

    if (!familyId) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'familyId required' });
    }

    const [result] = await pool.query(
      'INSERT INTO attachments (family_id, uploader_id, file_path, file_name, file_type, file_size, related_task_id, related_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        familyId,
        req.user.id,
        `/uploads/${req.file.filename}`,
        req.file.originalname,
        req.body.fileType || 'other',
        req.file.size,
        relatedTaskId || null,
        relatedTransactionId || null,
      ]
    );

    res.status(201).json({
      message: 'File uploaded',
      data: {
        id: result.insertId,
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
      },
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
};

exports.getFiles = async (req, res, next) => {
  try {
    const { familyId, taskId, transactionId } = req.query;

    let query = `
      SELECT a.id, a.file_path, a.file_name, a.file_type, a.file_size, a.created_at,
             u.full_name as uploader_name
      FROM attachments a
      JOIN users u ON a.uploader_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (familyId) {
      query += ' AND a.family_id = ?';
      params.push(familyId);
    }
    if (taskId) {
      query += ' AND a.related_task_id = ?';
      params.push(taskId);
    }
    if (transactionId) {
      query += ' AND a.related_transaction_id = ?';
      params.push(transactionId);
    }

    query += ' ORDER BY a.created_at DESC';

    const [files] = await pool.query(query, params);

    res.json({ message: 'Files retrieved', data: files });
  } catch (error) {
    next(error);
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [attachments] = await pool.query('SELECT * FROM attachments WHERE id = ?', [id]);
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const attachment = attachments[0];
    const fullPath = path.join('/app/uploads', path.basename(attachment.file_path));

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await pool.query('DELETE FROM attachments WHERE id = ?', [id]);

    res.json({ message: 'File deleted' });
  } catch (error) {
    next(error);
  }
};
