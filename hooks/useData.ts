
import { useState, useEffect } from 'react';
import { storage, StorageKeys } from '../services/storage';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';

/**
 * A hook that syncs with local storage and cloud updates.
 * Now supports remote synchronization via Supabase organization_data.
 */
export function useData<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [data, setData] = useState<T>(() => storage.get<T>(key, initialValue));
  const user = storage.get<UserProfile | null>(StorageKeys.USER_PROFILE, null);

  useEffect(() => {
    // 1. Однократный запрос свежих данных из облака при загрузке
    if (user?.companyId && key !== StorageKeys.USER_PROFILE) {
        supabase
            .from('organization_data')
            .select('data')
            .eq('organization_id', user.companyId)
            .eq('key', key)
            .single()
            .then(({ data: cloudData, error }) => {
                if (!error && cloudData?.data) {
                    // Используем данные из облака, если они есть
                    storage.notifyExternalChange(key, cloudData.data);
                }
            });
    }

    // 2. Подписка на локальные изменения (от других компонентов)
    const unsubscribeLocal = storage.subscribe((updatedKey, updatedValue) => {
      if (updatedKey === key) {
        setData(updatedValue);
      }
    });

    // 3. Realtime подписка на изменения в Supabase от других пользователей
    let channel: any = null;
    if (user?.companyId && key !== StorageKeys.USER_PROFILE) {
        channel = supabase
            .channel(`sync_${key}_${user.companyId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'organization_data',
                    filter: `organization_id=eq.${user.companyId}`
                },
                (payload) => {
                    const { key: updatedKey, data: updatedValue } = payload.new as any;
                    if (updatedKey === key) {
                        // Важно: обновляем только если это не мы сами только что отправили
                        // Но для упрощения просто мерджим
                        storage.notifyExternalChange(updatedKey, updatedValue);
                    }
                }
            )
            .subscribe();
    }

    return () => {
        unsubscribeLocal();
        if (channel) supabase.removeChannel(channel);
    };
  }, [key, user?.companyId]);

  const setValue = (newValue: T) => {
    setData(newValue);
    storage.set(key, newValue);
  };

  return [data, setValue];
}
