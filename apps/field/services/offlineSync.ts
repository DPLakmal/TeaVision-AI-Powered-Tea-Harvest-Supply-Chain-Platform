import { AxiosInstance } from 'axios';
import * as Network from 'expo-network';
import { SyncResult } from '../types';
import { api, apiClient } from './api';
import {
  getPendingCount,
  getPendingLots,
  incrementSyncAttempt,
  markLotSynced,
  recordSyncHistory,
} from './db';
import { Storage } from './storage';

let isSyncInProgress = false;

export async function isNetworkConnected(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch (err) {
    console.warn('[OfflineSync] Network check failed:', err);
    return false;
  }
}

export async function syncPendingLots(
  customApi?: AxiosInstance,
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  if (isSyncInProgress) {
    console.log('[OfflineSync] Sync already in progress, skipping duplicate call.');
    const remaining = await getPendingCount();
    return { synced: 0, failed: 0, remaining };
  }

  const online = await isNetworkConnected();
  if (!online) {
    console.log('[OfflineSync] Device is offline, skipping sync.');
    const remaining = await getPendingCount();
    return { synced: 0, failed: 0, remaining };
  }

  isSyncInProgress = true;
  let syncedCount = 0;
  let failedCount = 0;

  try {
    const pendingLots = await getPendingLots();
    const total = pendingLots.length;

    if (total === 0) {
      isSyncInProgress = false;
      return { synced: 0, failed: 0, remaining: 0 };
    }

    console.log(`[OfflineSync] Found ${total} pending lots to sync.`);

    for (let i = 0; i < total; i++) {
      const lot = pendingLots[i];
      onProgress?.(i + 1, total);

      // Skip if exceeded 5 attempts
      if (lot.sync_attempts >= 5) {
        console.warn(`[OfflineSync] Lot ${lot.id} exceeded max sync attempts (${lot.sync_attempts}), skipping.`);
        failedCount++;
        continue;
      }

      try {
        if (customApi) {
          // Send via custom instance if supplied
          await customApi.post('/api/v1/lots', lot, {
            headers: { 'X-Idempotency-Key': lot.id },
          });
        } else {
          // Standard upload with image support
          await api.uploadLot(lot);
        }

        await markLotSynced(lot.id);
        syncedCount++;
        console.log(`[OfflineSync] Successfully synced lot: ${lot.id}`);
      } catch (uploadError) {
        console.error(`[OfflineSync] Failed to sync lot ${lot.id}:`, uploadError);
        await incrementSyncAttempt(lot.id);
        failedCount++;
      }
    }

    const remaining = await getPendingCount();

    // Record sync history in SQLite
    await recordSyncHistory({
      synced: syncedCount,
      failed: failedCount,
      details: `Processed ${total} lots: ${syncedCount} synced, ${failedCount} failed`,
    });

    return {
      synced: syncedCount,
      failed: failedCount,
      remaining,
    };
  } finally {
    isSyncInProgress = false;
  }
}

export async function startAutoSync(
  customApi?: AxiosInstance,
  intervalMs = 30000
): Promise<() => void> {
  let timer: ReturnType<typeof setInterval> | null = null;
  let isRunning = true;

  const runSyncCycle = async () => {
    if (!isRunning) return;
    try {
      const autoSyncEnabled = await Storage.getAutoSync();
      if (!autoSyncEnabled) return;

      const online = await isNetworkConnected();
      if (online) {
        const pending = await getPendingCount();
        if (pending > 0) {
          console.log(`[AutoSync] Triggering background sync for ${pending} lots...`);
          await syncPendingLots(customApi);
        }
      }
    } catch (err) {
      console.warn('[AutoSync] Cycle error:', err);
    }
  };

  // Run initial cycle shortly after launch
  const initialTimeout = setTimeout(runSyncCycle, 3000);

  // Setup recurring interval
  timer = setInterval(runSyncCycle, intervalMs);

  // Return cleanup function
  return () => {
    isRunning = false;
    clearTimeout(initialTimeout);
    if (timer) clearInterval(timer);
  };
}
