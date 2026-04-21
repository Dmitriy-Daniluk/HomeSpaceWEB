const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const { PAGE_PERMISSIONS, getMembershipAccess } = require('../utils/rolePermissions');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
const FREE_FILE_LIMIT = 20;
const allowedFileTypes = new Set(['receipt', 'document', 'image', 'other']);

const hasActiveSubscription = (user) => Boolean(
  user?.has_subscription && (!user.subscription_until || new Date(user.subscription_until) > new Date())
);

const ensureFamilyMember = async (userId, familyId) => {
  if (!familyId) return null;
  return getMembershipAccess(userId, familyId);
};

const ensureFileAccess = async (userId, familyId) => {
  const membership = await ensureFamilyMember(userId, familyId);
  if (!membership) return { error: { status: 403, message: 'Not a member of this family' } };
  if (!membership.permissions.includes(PAGE_PERMISSIONS.files)) {
    return { error: { status: 403, message: 'Файлы доступны родителю или участнику с разрешением роли.' } };
  }
  return { membership };
};

const ensureTaskAccess = async (userId, taskId) => {
  const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (tasks.length === 0) {
    return { error: { status: 404, message: 'Task not found' } };
  }

  const task = tasks[0];
  if (task.family_id) {
    const access = await ensureFileAccess(userId, task.family_id);
    if (access.error) return { error: access.error };
    return { task, familyId: task.family_id };
  }

  const canAccess = [task.creator_id, task.executor_id, task.user_id].some((id) => Number(id) === Number(userId));
  if (!canAccess) {
    return { error: { status: 403, message: 'Not authorized for this personal task' } };
  }

  return { task, familyId: null };
};

const ensureTransactionAccess = async (userId, transactionId) => {
  const [transactions] = await pool.query('SELECT * FROM transactions WHERE id = ?', [transactionId]);
  if (transactions.length === 0) {
    return { error: { status: 404, message: 'Transaction not found' } };
  }

  const transaction = transactions[0];
  if (transaction.family_id) {
    const access = await ensureFileAccess(userId, transaction.family_id);
    if (access.error) return { error: access.error };
    return { transaction, familyId: transaction.family_id };
  }

  if (Number(transaction.user_id) !== Number(userId)) {
    return { error: { status: 403, message: 'Not authorized for this personal transaction' } };
  }

  return { transaction, familyId: null };
};

const ensureAttachmentAccess = async (userId, attachment) => {
  if (attachment.family_id) {
    const access = await ensureFileAccess(userId, attachment.family_id);
    return access.error ? access.error : null;
  }

  if (Number(attachment.uploader_id) === Number(userId)) return null;

  if (attachment.related_task_id) {
    const access = await ensureTaskAccess(userId, attachment.related_task_id);
    if (!access.error) return null;
  }

  if (attachment.related_transaction_id) {
    const access = await ensureTransactionAccess(userId, attachment.related_transaction_id);
    if (!access.error) return null;
  }

  return { status: 403, message: 'Not authorized for this personal file' };
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let familyId = req.body.familyId || req.body.family_id || null;
    const relatedTaskId = req.body.relatedTaskId || req.body.related_task_id;
    const relatedTransactionId = req.body.relatedTransactionId || req.body.related_transaction_id;
    const fileType = req.body.fileType || req.body.file_type || 'other';

    if (!allowedFileTypes.has(fileType)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Invalid file type' });
    }

    if (relatedTaskId) {
      const access = await ensureTaskAccess(req.user.id, relatedTaskId);
      if (access.error) {
        fs.unlink(req.file.path, () => {});
        return res.status(access.error.status).json({ error: access.error.message });
      }
      if (familyId && access.familyId && Number(familyId) !== Number(access.familyId)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'familyId does not match task family' });
      }
      if (!familyId) familyId = access.familyId;
    }

    if (relatedTransactionId) {
      const access = await ensureTransactionAccess(req.user.id, relatedTransactionId);
      if (access.error) {
        fs.unlink(req.file.path, () => {});
        return res.status(access.error.status).json({ error: access.error.message });
      }
      if (familyId && access.familyId && Number(familyId) !== Number(access.familyId)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'familyId does not match transaction family' });
      }
      if (!familyId) familyId = access.familyId;
    }

    if (familyId) {
      const access = await ensureFileAccess(req.user.id, familyId);
      if (access.error) {
        fs.unlink(req.file.path, () => {});
        return res.status(access.error.status).json({ error: access.error.message });
      }
    }

    if (!familyId && !relatedTaskId && !relatedTransactionId) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'familyId, relatedTaskId or relatedTransactionId required' });
    }

    const [users] = await pool.query(
      'SELECT has_subscription, subscription_until FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!hasActiveSubscription(users[0])) {
      const [fileCount] = await pool.query(
        'SELECT COUNT(*) as count FROM attachments WHERE uploader_id = ?',
        [req.user.id]
      );
      if (Number(fileCount[0].count || 0) >= FREE_FILE_LIMIT) {
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({
          error: 'Subscription required for more file storage',
          message: `Free plan allows up to ${FREE_FILE_LIMIT} uploaded files`,
          meta: { limit: FREE_FILE_LIMIT, feature: 'storage' },
        });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO attachments (family_id, uploader_id, file_path, file_name, file_type, file_size, related_task_id, related_transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        familyId,
        req.user.id,
        `/uploads/${req.file.filename}`,
        req.file.originalname,
        fileType,
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
        file_name: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        file_path: `/uploads/${req.file.filename}`,
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
    const fileType = req.query.fileType || req.query.file_type;

    let query = `
      SELECT a.id, a.file_path, a.file_name, a.file_type, a.file_size, a.created_at,
             u.full_name as uploader_name
      FROM attachments a
      JOIN users u ON a.uploader_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (taskId) {
      const access = await ensureTaskAccess(req.user.id, taskId);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
      query += ' AND a.related_task_id = ?';
      params.push(taskId);
    } else if (transactionId) {
      const access = await ensureTransactionAccess(req.user.id, transactionId);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
      query += ' AND a.related_transaction_id = ?';
      params.push(transactionId);
    } else if (familyId) {
      const access = await ensureFileAccess(req.user.id, familyId);
      if (access.error) return res.status(access.error.status).json({ error: access.error.message });
      query += ' AND a.family_id = ?';
      params.push(familyId);
    } else {
      query += ` AND (
        a.family_id IN (
          SELECT fm.family_id
          FROM family_members fm
          LEFT JOIN family_role_permissions frp
            ON frp.family_role_id = fm.custom_role_id AND frp.permission = ?
          WHERE fm.user_id = ? AND (fm.role = 'parent' OR frp.permission IS NOT NULL)
        )
        OR (a.family_id IS NULL AND a.uploader_id = ?)
      )`;
      params.push(PAGE_PERMISSIONS.files, req.user.id, req.user.id);
    }
    if (fileType) {
      query += ' AND a.file_type = ?';
      params.push(fileType);
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
    const accessError = await ensureAttachmentAccess(req.user.id, attachment);
    if (accessError) {
      return res.status(accessError.status).json({ error: accessError.message });
    }

    const fullPath = path.join(uploadDir, path.basename(attachment.file_path));

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await pool.query('DELETE FROM attachments WHERE id = ?', [id]);

    res.json({ message: 'File deleted' });
  } catch (error) {
    next(error);
  }
};

exports.renameFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fileName = String(req.body.fileName || req.body.file_name || '').trim();

    if (!fileName) {
      return res.status(400).json({ error: 'File name required' });
    }

    const [attachments] = await pool.query('SELECT * FROM attachments WHERE id = ?', [id]);
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const attachment = attachments[0];
    const accessError = await ensureAttachmentAccess(req.user.id, attachment);
    if (accessError) {
      return res.status(accessError.status).json({ error: accessError.message });
    }

    await pool.query('UPDATE attachments SET file_name = ? WHERE id = ?', [fileName, id]);

    const [updated] = await pool.query(
      `SELECT a.id, a.file_path, a.file_name, a.file_type, a.file_size, a.created_at,
              u.full_name as uploader_name
       FROM attachments a
       JOIN users u ON a.uploader_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    res.json({ message: 'File renamed', data: updated[0] });
  } catch (error) {
    next(error);
  }
};
