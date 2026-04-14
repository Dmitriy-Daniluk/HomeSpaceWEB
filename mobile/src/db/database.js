import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabase('homespace.db');

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
          synced INTEGER DEFAULT 0
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
          synced INTEGER DEFAULT 0
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
    }, reject, resolve);
  });
};

export const tasksDB = {
  getAll: (familyId) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM tasks WHERE family_id = ? ORDER BY created_at DESC',
          [familyId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM tasks WHERE id = ? OR remote_id = ?',
          [id, id],
          (_, { rows }) => resolve(rows._array[0] || null),
          (_, error) => reject(error)
        );
      });
    });
  },

  insert: (task) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO tasks (remote_id, title, description, status, priority, deadline, executor_id, executor_name, family_id, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [task.remote_id, task.title, task.description, task.status, task.priority, task.deadline, task.executor_id, task.executor_name, task.family_id, task.synced || 0],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, deadline = ?, executor_id = ?, executor_name = ?, updated_at = CURRENT_TIMESTAMP, synced = 0
           WHERE id = ? OR remote_id = ?`,
          [data.title, data.description, data.status, data.priority, data.deadline, data.executor_id, data.executor_name, id, id],
          () => resolve(true),
          (_, error) => reject(error)
        );
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'DELETE FROM tasks WHERE id = ? OR remote_id = ?',
          [id, id],
          () => resolve(true),
          (_, error) => reject(error)
        );
      });
    });
  },

  clearAll: () => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('DELETE FROM tasks', [], () => resolve(true), (_, error) => reject(error));
      });
    });
  },
};

export const transactionsDB = {
  getAll: (familyId) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM transactions WHERE family_id = ? ORDER BY transaction_date DESC',
          [familyId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  },

  insert: (transaction) => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO transactions (remote_id, type, amount, category, description, transaction_date, family_id, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [transaction.remote_id, transaction.type, transaction.amount, transaction.category, transaction.description, transaction.transaction_date, transaction.family_id, transaction.synced || 0],
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
          'DELETE FROM transactions WHERE id = ? OR remote_id = ?',
          [id, id],
          () => resolve(true),
          (_, error) => reject(error)
        );
      });
    });
  },

  clearAll: () => {
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql('DELETE FROM transactions', [], () => resolve(true), (_, error) => reject(error));
      });
    });
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

export default db;
