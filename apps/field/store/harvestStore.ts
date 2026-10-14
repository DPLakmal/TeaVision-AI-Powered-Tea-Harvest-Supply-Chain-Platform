import { create } from 'zustand';
import {
  deleteLot as dbDeleteLot,
  getLotsFiltered,
  getTodayStats,
  insertLotOffline,
} from '../services/db';
import { HarvestLotOffline, HarvestStats, LotFilter, QualityGrade } from '../types';

interface HarvestState {
  currentSessionId: string;
  currentWorkerId: string;
  lots: HarvestLotOffline[];
  todayStats: HarvestStats;
  activeFilter: LotFilter;
  isLoading: boolean;
  error: string | null;

  setSessionId: (id: string) => void;
  setWorkerId: (id: string) => void;
  setActiveFilter: (filter: LotFilter) => void;

  addOfflineLot: (lotData: {
    weight_kg: number;
    grade: QualityGrade;
    confidence: number;
    image_path?: string;
    session_id?: string;
    worker_id?: string;
  }) => Promise<HarvestLotOffline>;

  refreshLots: () => Promise<void>;
  refreshTodayStats: () => Promise<void>;
  removeLot: (id: string) => Promise<void>;
}

export const useHarvestStore = create<HarvestState>((set, get) => ({
  currentSessionId: 'SES-001',
  currentWorkerId: 'WRK-001',
  lots: [],
  todayStats: {
    totalLots: 0,
    totalWeight: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
  },
  activeFilter: 'all',
  isLoading: false,
  error: null,

  setSessionId: (id: string) => set({ currentSessionId: id }),
  setWorkerId: (id: string) => set({ currentWorkerId: id }),
  setActiveFilter: (filter: LotFilter) => {
    set({ activeFilter: filter });
    get().refreshLots();
  },

  addOfflineLot: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const state = get();
      const uniqueId = `lot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      const newLot: HarvestLotOffline = {
        id: uniqueId,
        session_id: data.session_id || state.currentSessionId || 'SES-001',
        worker_id: data.worker_id || state.currentWorkerId || 'WRK-001',
        weight_kg: Math.round(data.weight_kg * 100) / 100,
        grade: data.grade,
        confidence: data.confidence,
        image_path: data.image_path,
        synced: false,
        sync_attempts: 0,
        created_at: now,
      };

      await insertLotOffline(newLot);

      // Refresh state
      await Promise.all([get().refreshLots(), get().refreshTodayStats()]);

      set({ isLoading: false });
      return newLot;
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Failed to save offline lot.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  refreshLots: async () => {
    set({ isLoading: true });
    try {
      const filter = get().activeFilter;
      const lots = await getLotsFiltered(filter);
      set({ lots, isLoading: false, error: null });
    } catch (err: unknown) {
      set({ error: (err as Error)?.message || 'Failed to load lots', isLoading: false });
    }
  },

  refreshTodayStats: async () => {
    try {
      const stats = await getTodayStats();
      set({ todayStats: stats });
    } catch (err) {
      console.warn('[HarvestStore] Failed to refresh today stats:', err);
    }
  },

  removeLot: async (id: string) => {
    try {
      await dbDeleteLot(id);
      await Promise.all([get().refreshLots(), get().refreshTodayStats()]);
    } catch (err: unknown) {
      set({ error: (err as Error)?.message || 'Failed to delete lot' });
      throw err;
    }
  },
}));

export default useHarvestStore;
