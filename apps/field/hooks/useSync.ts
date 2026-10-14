import { useCallback, useEffect } from 'react';
import { useSyncStore } from '../store/syncStore';
import { useNetwork } from './useNetwork';

export function useSync() {
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);
  const syncStatus = useSyncStore((state) => state.syncStatus);
  const errorMessage = useSyncStore((state) => state.errorMessage);
  const syncHistory = useSyncStore((state) => state.syncHistory);
  const autoSyncEnabled = useSyncStore((state) => state.autoSyncEnabled);
  const setAutoSyncEnabled = useSyncStore((state) => state.setAutoSyncEnabled);
  const triggerSync = useSyncStore((state) => state.triggerSync);
  const refreshPendingCount = useSyncStore((state) => state.refreshPendingCount);
  const loadSyncHistory = useSyncStore((state) => state.loadSyncHistory);
  const initSyncStore = useSyncStore((state) => state.initSyncStore);

  const { isConnected, isInternetReachable } = useNetwork();

  useEffect(() => {
    initSyncStore();
  }, [initSyncStore]);

  const canSync = isConnected && !isSyncing && pendingCount > 0;

  const handleSync = useCallback(async () => {
    if (!canSync && !isSyncing) {
      if (!isConnected) {
        throw new Error('Device is offline');
      }
      if (pendingCount === 0) {
        return { synced: 0, failed: 0, remaining: 0 };
      }
    }
    return triggerSync();
  }, [canSync, isSyncing, isConnected, pendingCount, triggerSync]);

  return {
    pendingCount,
    isSyncing,
    lastSyncAt,
    syncStatus,
    errorMessage,
    syncHistory,
    autoSyncEnabled,
    setAutoSyncEnabled,
    triggerSync: handleSync,
    refreshPendingCount,
    loadSyncHistory,
    isConnected,
    isInternetReachable,
    canSync,
  };
}

export default useSync;
