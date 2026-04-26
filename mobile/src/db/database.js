import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('homespace.db');

const sql = (statement, params = []) => (
  new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        statement,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  })
);

const runTransaction = (scheduleStatements) => (
  new Promise((resolve, reject) => {
    db.transaction(
      (tx) => scheduleStatements(tx, reject),
      reject,
      resolve
    );
  })
);

const rowsFrom = (result) => result.rows?._array || [];
const countFrom = async (statement, params = []) => {
  const result = await sql(statement, params);
  return Number(rowsFrom(result)[0]?.count || 0);
};

const normalizeId = (value) => (value === undefined || value === null ? null : String(value));

const remoteIdOf = (item) => normalizeId(item?.remote_id || item?.remoteId || item?.id);

const mapTaskRow = (row) => ({
  ...row,
  local_id: row.local_id || row.id,
  id: row.remote_id || row.id,
  synced: Number(row.synced || 0),
  deleted: Number(row.deleted || 0),
});

const mapTransactionRow = (row) => ({
  ...row,
  local_id: row.local_id || row.id,
  id: row.remote_id || row.id,
  amount: Number(row.amount || 0),
  synced: Number(row.synced || 0),
  deleted: Number(row.deleted || 0),
});

const getColumns = async (table) => {
  const result = await sql(`PRAGMA table_info(${table})`);
  return rowsFrom(result).map((column) => column.name);
};

const addColumnIfMissing = async (table, column, definition) => {
  const columns = await getColumns(table);
  if (!columns.includes(column)) {
    await sql(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const ensureMigrations = async () => {
  await addColumnIfMissing('tasks', 'sync_action', 'TEXT');
  await addColumnIfMissing('tasks', 'deleted', 'INTEGER DEFAULT 0');
  await addColumnIfMissing('transactions', 'updated_at', 'TEXT');
  await addColumnIfMissing('transactions', 'sync_action', 'TEXT');
  await addColumnIfMissing('transactions', 'deleted', 'INTEGER DEFAULT 0');
};

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          remote_id TEXT UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'new',
          priority TEXT DEFAULT 'medium',
          deadline TEXT,
          executor_id INTEGER,
          executor_name TEXT,
          family_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced INTEGER DEFAULT 0,
          sync_action TEXT,
          deleted INTEGER DEFAULT 0
        );`
      );

      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          remote_id TEXT UNIQUE,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          category TEXT,
          description TEXT,
          transaction_date TEXT,
          family_id INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced INTEGER DEFAULT 0,
          sync_action TEXT,
          deleted INTEGER DEFAULT 0
        );`
      );

      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          remote_id TEXT UNIQUE,
          task_id INTEGER,
          file_type TEXT DEFAULT 'other',
          file_name TEXT,
          file_uri TEXT,
          visibility_level TEXT DEFAULT 'family',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          synced INTEGER DEFAULT 0
        );`
      );

      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS user_locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          user_name TEXT,
          latitude REAL,
          longitude REAL,
          accuracy REAL,
          recorded_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );`
      );

      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          remote_id TEXT UNIQUE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT,
          is_read INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );`
      );
    }, reject, async () => {
      try {
        await ensureMigrations();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

export const tasksDB = {
  getAll: async (familyId = null) => {
    const where = familyId ? 'family_id = ?' : 'family_id IS NULL';
    const params = familyId ? [familyId] : [];
    const result = await sql(
      `SELECT *, id as local_id
       FROM tasks
       WHERE deleted = 0 AND ${where}
       ORDER BY datetime(created_at) DESC, id DESC`,
      params
    );
    return rowsFrom(result).map(mapTaskRow);
  },

  getById: async (id) => {
    const result = await sql(
      `SELECT *, id as local_id
       FROM tasks
       WHERE deleted = 0 AND (id = ? OR remote_id = ?)
       LIMIT 1`,
      [id, normalizeId(id)]
    );
    return rowsFrom(result).map(mapTaskRow)[0] || null;
  },

  getPending: async () => {
    const result = await sql(
      `SELECT *, id as local_id
       FROM tasks
       WHERE synced = 0
       ORDER BY datetime(created_at) ASC, id ASC`
    );
    return rowsFrom(result).map(mapTaskRow);
  },

  insert: async (task) => {
    const result = await sql(
      `INSERT INTO tasks (
        remote_id, title, description, status, priority, deadline,
        executor_id, executor_name, family_id, synced, sync_action, deleted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.remote_id ? normalizeId(task.remote_id) : null,
        task.title,
        task.description || null,
        task.status || 'new',
        task.priority || 'medium',
        task.deadline || null,
        task.executor_id || null,
        task.executor_name || null,
        task.family_id || null,
        Number(task.synced || 0),
        task.sync_action || (task.synced ? null : 'create'),
        Number(task.deleted || 0),
      ]
    );
    return result.insertId;
  },

  insertLocal: async (task) => tasksDB.insert({ ...task, synced: 0, sync_action: 'create' }),

  upsertRemote: async (task) => {
    const remoteId = remoteIdOf(task);
    if (!remoteId) return null;

    const existing = await tasksDB.getById(remoteId);
    const values = [
      remoteId,
      task.title,
      task.description || null,
      task.status || 'new',
      task.priority || 'medium',
      task.deadline || null,
      task.executor_id || task.executorId || null,
      task.executor_name || task.executorName || null,
      task.family_id || task.familyId || null,
    ];

    if (existing) {
      await sql(
        `UPDATE tasks
         SET remote_id = ?, title = ?, description = ?, status = ?, priority = ?,
             deadline = ?, executor_id = ?, executor_name = ?, family_id = ?,
             updated_at = CURRENT_TIMESTAMP, synced = 1, sync_action = NULL, deleted = 0
         WHERE id = ?`,
        [...values, existing.local_id]
      );
      return existing.local_id;
    }

    const result = await sql(
      `INSERT INTO tasks (
        remote_id, title, description, status, priority, deadline,
        executor_id, executor_name, family_id, synced, sync_action, deleted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, 0)`,
      values
    );
    return result.insertId;
  },

  cacheRemoteList: async (tasks = []) => {
    if (!tasks.length) return 0;

    await runTransaction((tx, reject) => {
      for (const task of tasks) {
        const remoteId = remoteIdOf(task);
        if (!remoteId) continue;

        const insertValues = [
          remoteId,
          task.title,
          task.description || null,
          task.status || 'new',
          task.priority || 'medium',
          task.deadline || null,
          task.executor_id || task.executorId || null,
          task.executor_name || task.executorName || null,
          task.family_id || task.familyId || null,
        ];

        tx.executeSql(
          `INSERT OR IGNORE INTO tasks (
            remote_id, title, description, status, priority, deadline,
            executor_id, executor_name, family_id, synced, sync_action, deleted
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, 0)`,
          insertValues,
          undefined,
          (_, error) => {
            reject(error);
            return false;
          }
        );

        tx.executeSql(
          `UPDATE tasks
           SET title = ?, description = ?, status = ?, priority = ?, deadline = ?,
               executor_id = ?, executor_name = ?, family_id = ?,
               updated_at = CURRENT_TIMESTAMP, synced = 1, sync_action = NULL, deleted = 0
           WHERE remote_id = ?`,
          [
            task.title,
            task.description || null,
            task.status || 'new',
            task.priority || 'medium',
            task.deadline || null,
            task.executor_id || task.executorId || null,
            task.executor_name || task.executorName || null,
            task.family_id || task.familyId || null,
            remoteId,
          ],
          undefined,
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }
    });

    return tasks.length;
  },

  update: async (id, data) => {
    const existing = await tasksDB.getById(id);
    if (!existing) return false;

    const syncAction = existing.sync_action === 'create' ? 'create' : 'update';
    await sql(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?, deadline = ?,
           executor_id = ?, executor_name = ?, updated_at = CURRENT_TIMESTAMP,
           synced = 0, sync_action = ?
       WHERE id = ?`,
      [
        data.title ?? existing.title,
        data.description ?? existing.description,
        data.status ?? existing.status,
        data.priority ?? existing.priority,
        data.deadline ?? existing.deadline,
        data.executor_id ?? existing.executor_id,
        data.executor_name ?? existing.executor_name,
        syncAction,
        existing.local_id,
      ]
    );
    return true;
  },

  changeStatus: async (id, status) => {
    const existing = await tasksDB.getById(id);
    if (!existing) return false;
    return tasksDB.update(existing.local_id, { ...existing, status });
  },

  markSynced: async (id, remoteTask) => {
    const existing = await tasksDB.getById(id);
    if (!existing) return false;
    if (remoteTask) {
      await tasksDB.upsertRemote({ ...remoteTask, remote_id: remoteIdOf(remoteTask) });
      if (!existing.remote_id && remoteIdOf(remoteTask)) {
        await sql('DELETE FROM tasks WHERE id = ? AND remote_id IS NULL', [existing.local_id]);
      }
      return true;
    }

    await sql(
      'UPDATE tasks SET synced = 1, sync_action = NULL, deleted = 0 WHERE id = ?',
      [existing.local_id]
    );
    return true;
  },

  markDeleted: async (id) => {
    const existing = await tasksDB.getById(id);
    if (!existing) return false;
    if (!existing.remote_id && existing.sync_action === 'create') {
      await sql('DELETE FROM tasks WHERE id = ?', [existing.local_id]);
      return true;
    }
    await sql(
      `UPDATE tasks
       SET deleted = 1, synced = 0, sync_action = 'delete', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [existing.local_id]
    );
    return true;
  },

  delete: async (id) => {
    await sql('DELETE FROM tasks WHERE id = ? OR remote_id = ?', [id, normalizeId(id)]);
    return true;
  },

  clearAll: async () => {
    await sql('DELETE FROM tasks');
    return true;
  },
};

export const transactionsDB = {
  getAll: async (familyId = null) => {
    const where = familyId ? 'family_id = ?' : 'family_id IS NULL';
    const params = familyId ? [familyId] : [];
    const result = await sql(
      `SELECT *, id as local_id
       FROM transactions
       WHERE deleted = 0 AND ${where}
       ORDER BY datetime(transaction_date) DESC, id DESC`,
      params
    );
    return rowsFrom(result).map(mapTransactionRow);
  },

  getById: async (id) => {
    const result = await sql(
      `SELECT *, id as local_id
       FROM transactions
       WHERE deleted = 0 AND (id = ? OR remote_id = ?)
       LIMIT 1`,
      [id, normalizeId(id)]
    );
    return rowsFrom(result).map(mapTransactionRow)[0] || null;
  },

  getPending: async () => {
    const result = await sql(
      `SELECT *, id as local_id
       FROM transactions
       WHERE synced = 0
       ORDER BY datetime(created_at) ASC, id ASC`
    );
    return rowsFrom(result).map(mapTransactionRow);
  },

  insert: async (transaction) => {
    const result = await sql(
      `INSERT INTO transactions (
        remote_id, type, amount, category, description, transaction_date,
        family_id, synced, sync_action, deleted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.remote_id ? normalizeId(transaction.remote_id) : null,
        transaction.type,
        transaction.amount,
        transaction.category || null,
        transaction.description || null,
        transaction.transaction_date || new Date().toISOString(),
        transaction.family_id || null,
        Number(transaction.synced || 0),
        transaction.sync_action || (transaction.synced ? null : 'create'),
        Number(transaction.deleted || 0),
      ]
    );
    return result.insertId;
  },

  insertLocal: async (transaction) => transactionsDB.insert({ ...transaction, synced: 0, sync_action: 'create' }),

  upsertRemote: async (transaction) => {
    const remoteId = remoteIdOf(transaction);
    if (!remoteId) return null;

    const existing = await transactionsDB.getById(remoteId);
    const values = [
      remoteId,
      transaction.type,
      transaction.amount,
      transaction.category || null,
      transaction.description || null,
      transaction.transaction_date || transaction.transactionDate || new Date().toISOString(),
      transaction.family_id || transaction.familyId || null,
    ];

    if (existing) {
      await sql(
        `UPDATE transactions
         SET remote_id = ?, type = ?, amount = ?, category = ?, description = ?,
             transaction_date = ?, family_id = ?, updated_at = CURRENT_TIMESTAMP,
             synced = 1, sync_action = NULL, deleted = 0
         WHERE id = ?`,
        [...values, existing.local_id]
      );
      return existing.local_id;
    }

    const result = await sql(
      `INSERT INTO transactions (
        remote_id, type, amount, category, description, transaction_date,
        family_id, synced, sync_action, deleted
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, 0)`,
      values
    );
    return result.insertId;
  },

  cacheRemoteList: async (transactions = []) => {
    if (!transactions.length) return 0;

    await runTransaction((tx, reject) => {
      for (const transaction of transactions) {
        const remoteId = remoteIdOf(transaction);
        if (!remoteId) continue;

        const insertValues = [
          remoteId,
          transaction.type,
          Number(transaction.amount || 0),
          transaction.category || null,
          transaction.description || null,
          transaction.transaction_date || transaction.transactionDate || new Date().toISOString(),
          transaction.family_id || transaction.familyId || null,
        ];

        tx.executeSql(
          `INSERT OR IGNORE INTO transactions (
            remote_id, type, amount, category, description, transaction_date,
            family_id, synced, sync_action, deleted
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NULL, 0)`,
          insertValues,
          undefined,
          (_, error) => {
            reject(error);
            return false;
          }
        );

        tx.executeSql(
          `UPDATE transactions
           SET type = ?, amount = ?, category = ?, description = ?,
               transaction_date = ?, family_id = ?,
               updated_at = CURRENT_TIMESTAMP, synced = 1, sync_action = NULL, deleted = 0
           WHERE remote_id = ?`,
          [
            transaction.type,
            Number(transaction.amount || 0),
            transaction.category || null,
            transaction.description || null,
            transaction.transaction_date || transaction.transactionDate || new Date().toISOString(),
            transaction.family_id || transaction.familyId || null,
            remoteId,
          ],
          undefined,
          (_, error) => {
            reject(error);
            return false;
          }
        );
      }
    });

    return transactions.length;
  },

  update: async (id, data) => {
    const existing = await transactionsDB.getById(id);
    if (!existing) return false;
    const syncAction = existing.sync_action === 'create' ? 'create' : 'update';
    await sql(
      `UPDATE transactions
       SET type = ?, amount = ?, category = ?, description = ?, transaction_date = ?,
           family_id = ?, updated_at = CURRENT_TIMESTAMP, synced = 0, sync_action = ?
       WHERE id = ?`,
      [
        data.type ?? existing.type,
        data.amount ?? existing.amount,
        data.category ?? existing.category,
        data.description ?? existing.description,
        data.transaction_date ?? existing.transaction_date,
        data.family_id ?? existing.family_id,
        syncAction,
        existing.local_id,
      ]
    );
    return true;
  },

  markSynced: async (id, remoteTransaction) => {
    const existing = await transactionsDB.getById(id);
    if (!existing) return false;
    if (remoteTransaction) {
      await transactionsDB.upsertRemote({ ...remoteTransaction, remote_id: remoteIdOf(remoteTransaction) });
      if (!existing.remote_id && remoteIdOf(remoteTransaction)) {
        await sql('DELETE FROM transactions WHERE id = ? AND remote_id IS NULL', [existing.local_id]);
      }
      return true;
    }

    await sql(
      'UPDATE transactions SET synced = 1, sync_action = NULL, deleted = 0 WHERE id = ?',
      [existing.local_id]
    );
    return true;
  },

  markDeleted: async (id) => {
    const existing = await transactionsDB.getById(id);
    if (!existing) return false;
    if (!existing.remote_id && existing.sync_action === 'create') {
      await sql('DELETE FROM transactions WHERE id = ?', [existing.local_id]);
      return true;
    }
    await sql(
      `UPDATE transactions
       SET deleted = 1, synced = 0, sync_action = 'delete', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [existing.local_id]
    );
    return true;
  },

  delete: async (id) => {
    await sql('DELETE FROM transactions WHERE id = ? OR remote_id = ?', [id, normalizeId(id)]);
    return true;
  },

  clearAll: async () => {
    await sql('DELETE FROM transactions');
    return true;
  },
};

export const attachmentsDB = {
  getAll: (taskId) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at DESC',
          [taskId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  insert: (attachment) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO attachments (remote_id, task_id, file_type, file_name, file_uri, visibility_level, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [attachment.remote_id, attachment.task_id, attachment.file_type, attachment.file_name, attachment.file_uri, attachment.visibility_level, attachment.synced || 0],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM attachments WHERE id = ? OR remote_id = ?',
          [id, id],
          () => resolve(true),
          (_, error) => reject(error)
        );
      });
    });
  },
};

export const locationsDB = {
  insert: (location) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO user_locations (user_id, user_name, latitude, longitude, accuracy, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [location.user_id, location.user_name, location.latitude, location.longitude, location.accuracy, location.recorded_at],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  getLatest: (userId) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM user_locations WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
          [userId],
          (_, { rows }) => resolve(rows._array[0] || null),
          (_, error) => reject(error)
        );
      });
    });
  },

  getAll: () => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM user_locations ORDER BY recorded_at DESC',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },
};

export const notificationsDB = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM notifications ORDER BY created_at DESC',
          [],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  insert: (notification) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO notifications (remote_id, type, title, message, is_read)
           VALUES (?, ?, ?, ?, ?)`,
          [notification.remote_id, notification.type, notification.title, notification.message, notification.is_read || 0],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  markAsRead: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'UPDATE notifications SET is_read = 1 WHERE id = ? OR remote_id = ?',
          [id, id],
          () => resolve(true),
          (_, error) => reject(error)
        );
      });
    });
  },

  getUnreadCount: () => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0',
          [],
          (_, { rows }) => resolve(rows._array[0]?.count || 0),
          (_, error) => reject(error)
        );
      });
    });
  },
};

export const localCacheDB = {
  getStats: async () => {
    const [
      syncedTasks,
      pendingTasks,
      syncedTransactions,
      pendingTransactions,
      attachments,
      staleLocations,
      notifications,
    ] = await Promise.all([
      countFrom('SELECT COUNT(*) as count FROM tasks WHERE synced = 1'),
      countFrom('SELECT COUNT(*) as count FROM tasks WHERE synced = 0'),
      countFrom('SELECT COUNT(*) as count FROM transactions WHERE synced = 1'),
      countFrom('SELECT COUNT(*) as count FROM transactions WHERE synced = 0'),
      countFrom('SELECT COUNT(*) as count FROM attachments'),
      countFrom(
        `SELECT COUNT(*) as count
         FROM user_locations
         WHERE julianday(COALESCE(recorded_at, created_at)) < julianday('now', '-14 days')`
      ),
      countFrom('SELECT COUNT(*) as count FROM notifications'),
    ]);

    return {
      syncedTasks,
      pendingTasks,
      syncedTransactions,
      pendingTransactions,
      attachments,
      staleLocations,
      notifications,
    };
  },

  cleanupStaleData: async () => {
    const removedTasks = Number((await sql('DELETE FROM tasks WHERE synced = 1')).rowsAffected || 0);
    const removedTransactions = Number((await sql('DELETE FROM transactions WHERE synced = 1')).rowsAffected || 0);
    const removedAttachments = Number((await sql('DELETE FROM attachments')).rowsAffected || 0);
    const removedLocations = Number((
      await sql(
        `DELETE FROM user_locations
         WHERE julianday(COALESCE(recorded_at, created_at)) < julianday('now', '-14 days')`
      )
    ).rowsAffected || 0);
    const removedNotifications = Number((await sql('DELETE FROM notifications')).rowsAffected || 0);

    const after = {
      pendingTasks: await countFrom('SELECT COUNT(*) as count FROM tasks WHERE synced = 0'),
      pendingTransactions: await countFrom('SELECT COUNT(*) as count FROM transactions WHERE synced = 0'),
    };

    return {
      after,
      removed: {
        tasks: removedTasks,
        transactions: removedTransactions,
        attachments: removedAttachments,
        locations: removedLocations,
        notifications: removedNotifications,
      },
      preserved: {
        pendingTasks: after.pendingTasks,
        pendingTransactions: after.pendingTransactions,
      },
    };
  },
};

export default db;
