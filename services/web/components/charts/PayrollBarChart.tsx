"use client";

import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PayrollRun } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PayrollBarChartProps {
  data?: PayrollRun[];
  isLoading?: boolean;
  height?: number;
}

export function PayrollBarChart({
  data = [],
  isLoading = false,
  height = 280,
}: PayrollBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || !mounted) {
    return <Skeleton className="w-full rounded-lg" style={{ height }} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500"
        style={{ height }}
      >
        No payroll history data
      </div>
    );
  }

  const chartData = data
    .slice()
    .reverse()
    .map((run) => ({
      id: run.id,
      label: `${formatDate(run.period_start, "MMM dd")} - ${formatDate(
        run.period_end,
        "MMM dd"
      )}`,
      total_amount: run.total_amount,
      total_workers: run.total_workers || run.entries.length,
      total_kg: run.total_kg || run.entries.reduce((a, b) => a + b.total_kg, 0),
    }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -5, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as {
                  label: string;
                  total_amount: number;
                  total_workers: number;
                  total_kg: number;
                };
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs">
                    <p className="font-semibold text-slate-700">{item.label}</p>
                    <p className="mt-1 text-sm font-bold text-emerald-800">
                      {formatCurrency(item.total_amount)}
                    </p>
                    <p className="text-slate-500">
                      {item.total_workers} workers · {item.total_kg.toLocaleString()} kg plucked
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="total_amount"
            fill="#d97706" // amber-600
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
