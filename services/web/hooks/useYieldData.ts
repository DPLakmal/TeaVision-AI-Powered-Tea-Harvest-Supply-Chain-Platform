import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { GardenYield, YieldDataPoint } from "@/types/api";
import { MOCK_DAILY_YIELD, MOCK_GARDEN_YIELDS } from "@/lib/mock-data";

export function useYieldAnalytics(period: string = "week", gardenId: string = "all") {
  return useQuery<YieldDataPoint[]>({
    queryKey: ["yield-analytics", period, gardenId],
    queryFn: async () => {
      try {
        const res = await api.get("/analytics/yield", {
          params: { period, garden_id: gardenId !== "all" ? gardenId : undefined },
        });
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_DAILY_YIELD;
      } catch {
        // Fallback to mock data
        if (period === "today") {
          return [MOCK_DAILY_YIELD[MOCK_DAILY_YIELD.length - 1]];
        }
        if (period === "week") {
          return MOCK_DAILY_YIELD.slice(-7);
        }
        return MOCK_DAILY_YIELD;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useGardenYield() {
  return useQuery<GardenYield[]>({
    queryKey: ["garden-yields"],
    queryFn: async () => {
      try {
        const res = await api.get("/analytics/gardens");
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_GARDEN_YIELDS;
      } catch {
        return MOCK_GARDEN_YIELDS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
