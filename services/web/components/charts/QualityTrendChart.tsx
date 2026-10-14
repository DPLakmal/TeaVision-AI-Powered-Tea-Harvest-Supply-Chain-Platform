"use client";

import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { QualityTrendPoint } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";

interface QualityTrendChartProps {
  data?: QualityTrendPoint[];
  isLoading?: boolean;
  height?: number;
}

export function QualityTrendChart({
  data = [],
  isLoading = false,
  height = 320,
}: QualityTrendChartProps) {
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
        No quality trend data available
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
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
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-xs">
                    <p className="font-semibold text-slate-700">{label}</p>
                    <div className="mt-2 space-y-1">
                      {payload.map((entry) => (
                        <div
                          key={`item-${entry.dataKey}`}
                          className="flex items-center justify-between gap-4"
                        >
                          <span
                            className="flex items-center gap-1.5 font-medium"
                            style={{ color: entry.color }}
                          >
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.name}:
                          </span>
                          <span className="font-bold text-slate-800">
                            {Number(entry.value).toLocaleString()} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: 15, fontSize: 12 }}
          />
          <Bar
            dataKey="high_kg"
            name="High Grade"
            stackId="a"
            fill="#10b981"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="medium_kg"
            name="Medium Grade"
            stackId="a"
            fill="#fbbf24"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="low_kg"
            name="Low Grade"
            stackId="a"
            fill="#f87171"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
