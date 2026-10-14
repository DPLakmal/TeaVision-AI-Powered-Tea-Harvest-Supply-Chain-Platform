"use client";

import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { YieldDataPoint } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface YieldLineChartProps {
  data?: YieldDataPoint[];
  isLoading?: boolean;
  height?: number;
}

export function YieldLineChart({
  data = [],
  isLoading = false,
  height = 300,
}: YieldLineChartProps) {
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
        No yield data available for this timeframe
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date, "MMM dd"),
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="yieldColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#15803d" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#15803d" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="formattedDate"
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tick={{ fill: "#64748b", fontSize: 12 }}
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
                const item = payload[0].payload as YieldDataPoint & { formattedDate: string };
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md">
                    <p className="text-xs font-semibold text-slate-500">
                      {item.formattedDate}
                    </p>
                    <p className="mt-1 text-sm font-bold text-emerald-800">
                      {item.weight_kg.toLocaleString()} kg
                    </p>
                    {item.sessions_count !== undefined && (
                      <p className="text-xs text-slate-500">
                        {item.sessions_count} plucking sessions
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="weight_kg"
            stroke="#15803d"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#yieldColor)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
