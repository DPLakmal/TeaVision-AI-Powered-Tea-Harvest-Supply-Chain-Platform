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
import { GardenYield } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKg } from "@/lib/utils";

interface YieldBarChartProps {
  data?: GardenYield[];
  isLoading?: boolean;
  height?: number;
}

export function YieldBarChart({
  data = [],
  isLoading = false,
  height = 300,
}: YieldBarChartProps) {
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
        No garden yield data available
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="garden_name"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tick={{ fill: "#64748b", fontSize: 11 }}
            interval={0}
            angle={-10}
            textAnchor="end"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(val) => `${val}kg`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as GardenYield;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md">
                    <p className="text-xs font-semibold text-slate-700">
                      {item.garden_name}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-800">
                      {formatKg(item.total_weight_kg)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.worker_count} active pluckers
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="total_weight_kg"
            fill="#15803d"
            radius={[6, 6, 0, 0]}
            maxBarSize={55}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
