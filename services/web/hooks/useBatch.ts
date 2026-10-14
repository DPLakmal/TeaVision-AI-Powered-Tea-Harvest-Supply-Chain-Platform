import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Batch } from "@/types/api";
import { MOCK_BATCHES } from "@/lib/mock-data";

export function useBatches() {
  return useQuery<Batch[]>({
    queryKey: ["batches-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/batches");
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_BATCHES;
      } catch {
        return MOCK_BATCHES;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useBatchDetail(idOrName: string | null) {
  return useQuery<Batch | null>({
    queryKey: ["batch-detail", idOrName],
    enabled: Boolean(idOrName),
    queryFn: async () => {
      if (!idOrName) return null;
      try {
        const res = await api.get(`/batches/${idOrName}`);
        if (res.data) {
          return res.data;
        }
        return (
          MOCK_BATCHES.find(
            (b) =>
              b.id.toLowerCase() === idOrName.toLowerCase() ||
              b.name.toLowerCase().includes(idOrName.toLowerCase())
          ) || MOCK_BATCHES[0]
        );
      } catch {
        return (
          MOCK_BATCHES.find(
            (b) =>
              b.id.toLowerCase() === idOrName.toLowerCase() ||
              b.name.toLowerCase().includes(idOrName.toLowerCase())
          ) || MOCK_BATCHES[0]
        );
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}
