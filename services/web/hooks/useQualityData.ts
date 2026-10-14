import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { HarvestLot, QualitySummary, QualityTrendPoint } from "@/types/api";
import {
  MOCK_HARVEST_LOTS,
  MOCK_QUALITY_SUMMARY,
  MOCK_QUALITY_TRENDS,
} from "@/lib/mock-data";

export function useQualitySummary() {
  return useQuery<QualitySummary[]>({
    queryKey: ["quality-summary"],
    queryFn: async () => {
      try {
        const res = await api.get("/analytics/quality/summary");
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_QUALITY_SUMMARY;
      } catch {
        return MOCK_QUALITY_SUMMARY;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useQualityTrends(period: string = "week") {
  return useQuery<QualityTrendPoint[]>({
    queryKey: ["quality-trends", period],
    queryFn: async () => {
      try {
        const res = await api.get("/analytics/quality/trends", {
          params: { period },
        });
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_QUALITY_TRENDS;
      } catch {
        return MOCK_QUALITY_TRENDS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useHarvestLots(params?: {
  grade?: string;
  workerId?: string;
  limit?: number;
}) {
  return useQuery<HarvestLot[]>({
    queryKey: ["harvest-lots", params],
    queryFn: async () => {
      try {
        const res = await api.get("/harvest/lots", { params });
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return filterMockLots(params);
      } catch {
        return filterMockLots(params);
      }
    },
    staleTime: 1000 * 60 * 2,
  });
}

function filterMockLots(params?: {
  grade?: string;
  workerId?: string;
  limit?: number;
}): HarvestLot[] {
  let list = [...MOCK_HARVEST_LOTS];
  if (params?.grade && params.grade !== "all") {
    list = list.filter((l) => l.grade === params.grade);
  }
  if (params?.workerId && params.workerId !== "all") {
    list = list.filter((l) => l.worker_id === params.workerId);
  }
  if (params?.limit) {
    list = list.slice(0, params.limit);
  }
  return list;
}
