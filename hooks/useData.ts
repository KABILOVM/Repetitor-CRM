
import { useState, useEffect } from 'react';
import { storage } from '../services/storage';

/**
 * A hook that syncs with local storage and cloud updates.
 * Use this instead of useState(() => storage.get(...))
 */
export function useData<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Initialize state from local storage
  const [data, setData] = useState<T>(() => storage.get<T>(key, initialValue));

  useEffect(() => {
    // Subscribe to changes in the storage service
    // This catches updates from other components OR from Supabase realtime events
    const unsubscribe = storage.subscribe((updatedKey, updatedValue) => {
      if (updatedKey === key) {
        setData(updatedValue);
      }
    });

    return () => unsubscribe();
  }, [key]);

  const setValue = (newValue: T) => {
    // Optimistically update local state
    setData(newValue);
    // Persist to storage (and sync to cloud)
    storage.set(key, newValue);
  };

  return [data, setValue];
}
