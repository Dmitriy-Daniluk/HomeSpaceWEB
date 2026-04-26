import AsyncStorage from '@react-native-async-storage/async-storage';
import { localCacheDB } from '../db/database';
import { STORAGE_KEYS } from './constants';

const CACHE_ONLY_KEYS = [
  STORAGE_KEYS.LAST_SYNC,
  STORAGE_KEYS.FAMILY_ID,
];

const withTimeout = (promise, timeoutMs = 10000) => (
  new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('Local storage cleanup timed out')), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  })
);

export const cleanupLocalAppData = async () => {
  const result = await withTimeout(localCacheDB.cleanupStaleData());
  await AsyncStorage.multiRemove(CACHE_ONLY_KEYS);

  return {
    ...result,
    storageKeysRemoved: CACHE_ONLY_KEYS.length,
  };
};
