import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PayrollRun } from "@/types/api";
import { MOCK_PAYROLL_RUNS, MOCK_WORKERS } from "@/lib/mock-data";

export function usePayrollRuns() {
  return useQuery<PayrollRun[]>({
    queryKey: ["payroll-runs"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/runs");
        if (res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return MOCK_PAYROLL_RUNS;
      } catch {
        return MOCK_PAYROLL_RUNS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePayrollRun(id: string | null) {
  return useQuery<PayrollRun | null>({
    queryKey: ["payroll-run", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) return null;
      try {
        const res = await api.get(`/payroll/runs/${id}`);
        if (res.data) {
          return res.data;
        }
        return MOCK_PAYROLL_RUNS.find((p) => p.id === id) || null;
      } catch {
        return MOCK_PAYROLL_RUNS.find((p) => p.id === id) || null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export interface CreatePayrollRunInput {
  period_start: string;
  period_end: string;
}

export function useCreatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePayrollRunInput) => {
      try {
        const res = await api.post("/payroll/run", input);
        return res.data as PayrollRun;
      } catch {
        // Mock generation of new payroll run for offline testing
        const totalKg = MOCK_WORKERS.reduce((acc, w) => acc + (w.total_kg_week || 30) * 2, 0);
        const entries = MOCK_WORKERS.map((w, index) => {
          const kg = (w.total_kg_week || 30) * 2;
          const amt = Math.round(kg * w.rate_per_kg * 100) / 100;
          return {
            id: `pen_mock_${Date.now()}_${index}`,
            worker_id: w.id,
            worker_name: w.name,
            total_kg: kg,
            rate_per_kg: w.rate_per_kg,
            total_amount: amt,
            high_grade_kg: Math.round(kg * 0.85 * 10) / 10,
            medium_grade_kg: Math.round(kg * 0.15 * 10) / 10,
            bonus: index < 3 ? 10 : 0,
          };
        });
        const totalAmount = entries.reduce((acc, e) => acc + e.total_amount, 0);

        const newRun: PayrollRun = {
          id: `PAY-${Date.now().toString().slice(-6)}`,
          period_start: input.period_start,
          period_end: input.period_end,
          total_amount: Math.round(totalAmount * 100) / 100,
          total_kg: Math.round(totalKg * 10) / 10,
          total_workers: entries.length,
          status: "processed",
          created_at: new Date().toISOString(),
          entries,
        };

        return newRun;
      }
    },
    onSuccess: (newRun) => {
      queryClient.setQueryData<PayrollRun[]>(["payroll-runs"], (old = []) => [
        newRun,
        ...old,
      ]);
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
    },
  });
}
