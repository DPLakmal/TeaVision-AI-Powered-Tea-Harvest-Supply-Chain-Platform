import { useEffect } from 'react';
import { useHarvestStore } from '../store/harvestStore';
import { HarvestLotOffline, HarvestStats, LotFilter, QualityGrade } from '../types';

export function useOfflineLots() {
  const lots = useHarvestStore((state) => state.lots);
  const todayStats = useHarvestStore((state) => state.todayStats);
  const activeFilter = useHarvestStore((state) => state.activeFilter);
  const isLoading = useHarvestStore((state) => state.isLoading);
  const error = useHarvestStore((state) => state.error);
  const setActiveFilter = useHarvestStore((state) => state.setActiveFilter);
  const addOfflineLot = useHarvestStore((state) => state.addOfflineLot);
  const refreshLots = useHarvestStore((state) => state.refreshLots);
  const refreshTodayStats = useHarvestStore((state) => state.refreshTodayStats);
  const removeLot = useHarvestStore((state) => state.removeLot);

  useEffect(() => {
    refreshLots();
    refreshTodayStats();
  }, [refreshLots, refreshTodayStats]);

  return {
    lots,
    todayStats,
    activeFilter,
    isLoading,
    error,
    setActiveFilter,
    addOfflineLot,
    refreshLots,
    refreshTodayStats,
    removeLot,
  };
}

export default useOfflineLots;
