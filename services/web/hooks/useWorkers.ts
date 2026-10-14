import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { HarvestLot, Worker } from "@/types/api";
import { MOCK_HARVEST_LOTS, MOCK_WORKERS } from "@/lib/mock-data";

export function useWorkersList() {
  return useQuery<Worker[]>({
    queryKey: ["workers-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/workers");
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_WORKERS;
      } catch {
        return MOCK_WORKERS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkerDetail(workerId: string | null) {
  return useQuery<Worker | null>({
    queryKey: ["worker-detail", workerId],
    enabled: Boolean(workerId),
    queryFn: async () => {
      if (!workerId) return null;
      try {
        const res = await api.get(`/workers/${workerId}`);
        if (res.data) {
          return res.data;
        }
        return MOCK_WORKERS.find((w) => w.id === workerId) || null;
      } catch {
        return MOCK_WORKERS.find((w) => w.id === workerId) || null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkerLots(workerId: string | null) {
  return useQuery<HarvestLot[]>({
    queryKey: ["worker-lots", workerId],
    enabled: Boolean(workerId),
    queryFn: async () => {
      if (!workerId) return [];
      try {
        const res = await api.get(`/workers/${workerId}/lots`);
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_HARVEST_LOTS.filter((l) => l.worker_id === workerId);
      } catch {
        return MOCK_HARVEST_LOTS.filter((l) => l.worker_id === workerId);
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}
