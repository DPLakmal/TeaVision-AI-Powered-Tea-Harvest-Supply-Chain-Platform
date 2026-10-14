import { create } from 'zustand';
import { getPendingCount, getSyncHistory } from '../services/db';
import { isNetworkConnected, syncPendingLots } from '../services/offlineSync';
import { Storage } from '../services/storage';
import { SyncHistoryEntry, SyncResult } from '../types';
import { useHarvestStore } from './harvestStore';

interface SyncState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  errorMessage: string | null;
  syncHistory: SyncHistoryEntry[];
  autoSyncEnabled: boolean;

  setAutoSyncEnabled: (enabled: boolean) => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  loadSyncHistory: () => Promise<void>;
  triggerSync: () => Promise<SyncResult>;
  initSyncStore: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  syncStatus: 'idle',
  errorMessage: null,
  syncHistory: [],
  autoSyncEnabled: true,

  initSyncStore: async () => {
    try {
      const autoSync = await Storage.getAutoSync();
      const count = await getPendingCount();
      const history = await getSyncHistory(10);
      set({
        autoSyncEnabled: autoSync,
        pendingCount: count,
        syncHistory: history,
      });
    } catch (err) {
      console.warn('[SyncStore] Init error:', err);
    }
  },

  setAutoSyncEnabled: async (enabled: boolean) => {
    await Storage.setAutoSync(enabled);
    set({ autoSyncEnabled: enabled });
  },

  refreshPendingCount: async () => {
    try {
      const count = await getPendingCount();
      set({ pendingCount: count });
    } catch (err) {
      console.warn('[SyncStore] Failed to get pending count:', err);
    }
  },

  loadSyncHistory: async () => {
    try {
      const history = await getSyncHistory(10);
      set({ syncHistory: history });
    } catch (err) {
      console.warn('[SyncStore] Failed to load history:', err);
    }
  },

  triggerSync: async () => {
    if (get().isSyncing) {
      return { synced: 0, failed: 0, remaining: get().pendingCount };
    }

    const online = await isNetworkConnected();
    if (!online) {
      set({
        syncStatus: 'error',
        errorMessage: 'Device is offline. Connect to internet to sync.',
      });
      return { synced: 0, failed: 0, remaining: get().pendingCount };
    }

    set({ isSyncing: true, syncStatus: 'syncing', errorMessage: null });

    try {
      const result = await syncPendingLots();

      // Refresh harvest store lots & stats
      await useHarvestStore.getState().refreshLots();
      await useHarvestStore.getState().refreshTodayStats();

      const newHistory = await getSyncHistory(10);

      set({
        isSyncing: false,
        pendingCount: result.remaining,
        lastSyncAt: new Date().toISOString(),
        syncStatus: result.failed > 0 ? 'error' : 'success',
        errorMessage: result.failed > 0 ? `${result.failed} lot(s) failed to sync` : null,
        syncHistory: newHistory,
      });

      return result;
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Sync failed due to an unexpected error.';
      set({
        isSyncing: false,
        syncStatus: 'error',
        errorMessage: message,
      });
      return { synced: 0, failed: 0, remaining: get().pendingCount };
    }
  },
}));

export default useSyncStore;
