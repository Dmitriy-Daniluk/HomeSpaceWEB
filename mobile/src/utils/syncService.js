import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import { tasks as tasksApi, budget as budgetApi } from './api';
import { tasksDB, transactionsDB } from '../db/database';
import { formatDateForApi } from './helpers';

export const isNetworkError = (error) => !error?.response;

export const getResponseData = (response) => {
  const body = response?.data;
  if (body && Object.prototype.hasOwnProperty.call(body, 'data')) return body.data;
  return (
    body?.task
    || body?.transaction
    || body?.tasks
    || body?.transactions
    || body
  );
};

export const toArrayData = (response) => {
  const data = getResponseData(response);
  return Array.isArray(data) ? data : [];
};

const taskPayload = (task) => ({
  title: task.title,
  description: task.description || null,
  status: task.status || 'new',
  priority: task.priority || 'medium',
  deadline: task.deadline ? formatDateForApi(task.deadline) : null,
  executor_id: task.executor_id || null,
  family_id: task.family_id || null,
  familyId: task.family_id || null,
});

const transactionPayload = (transaction) => ({
  type: transaction.type,
  amount: Number(transaction.amount || 0),
  category: transaction.category || null,
  description: transaction.description || null,
  transaction_date: formatDateForApi(transaction.transaction_date || new Date()),
  family_id: transaction.family_id || null,
  familyId: transaction.family_id || null,
});

export const syncPendingTasks = async () => {
  const pending = await tasksDB.getPending();
  let synced = 0;

  for (const task of pending) {
    if (task.sync_action === 'delete') {
      if (task.remote_id) {
        await tasksApi.delete(task.remote_id);
      }
      await tasksDB.delete(task.local_id);
      synced += 1;
      continue;
    }

    if (task.remote_id && task.sync_action === 'update') {
      const response = await tasksApi.update(task.remote_id, taskPayload(task));
      await tasksDB.markSynced(task.local_id, getResponseData(response));
      synced += 1;
      continue;
    }

    const response = await tasksApi.create(taskPayload(task));
    await tasksDB.markSynced(task.local_id, getResponseData(response));
    synced += 1;
  }

  return synced;
};

export const syncPendingTransactions = async () => {
  const pending = await transactionsDB.getPending();
  let synced = 0;

  for (const transaction of pending) {
    if (transaction.sync_action === 'delete') {
      if (transaction.remote_id) {
        await budgetApi.deleteTransaction(transaction.remote_id);
      }
      await transactionsDB.delete(transaction.local_id);
      synced += 1;
      continue;
    }

    if (transaction.remote_id && transaction.sync_action === 'update') {
      const response = await budgetApi.updateTransaction(
        transaction.remote_id,
        transactionPayload(transaction)
      );
      await transactionsDB.markSynced(transaction.local_id, getResponseData(response));
      synced += 1;
      continue;
    }

    const response = await budgetApi.createTransaction(transactionPayload(transaction));
    await transactionsDB.markSynced(transaction.local_id, getResponseData(response));
    synced += 1;
  }

  return synced;
};

export const syncPendingChanges = async () => {
  const tasksSynced = await syncPendingTasks();
  const transactionsSynced = await syncPendingTransactions();

  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

  return {
    tasks: tasksSynced,
    transactions: transactionsSynced,
    total: tasksSynced + transactionsSynced,
  };
};

export const buildBudgetSummary = (transactions = []) => {
  const totals = transactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount || 0);
      if (transaction.type === 'income') {
        acc.income += amount;
      } else if (transaction.type === 'expense') {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  return {
    ...totals,
    balance: totals.income - totals.expense,
  };
};
