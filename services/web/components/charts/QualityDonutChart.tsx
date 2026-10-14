"use client";

import React, { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { QualitySummary } from "@/types/api";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKg } from "@/lib/utils";

interface QualityDonutChartProps {
  data?: QualitySummary[];
  isLoading?: boolean;
  height?: number;
  showCenterText?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  high: "#10b981",    // emerald-500
  medium: "#fbbf24",  // amber-400
  low: "#f87171",     // red-400
};

export function QualityDonutChart({
  data = [],
  isLoading = false,
  height = 260,
  showCenterText = true,
}: QualityDonutChartProps) {
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
        No quality distribution data
      </div>
    );
  }

  const totalKg = data.reduce((acc, curr) => acc + curr.weight_kg, 0);
  const highGradeItem = data.find((d) => d.grade === "high");
  const highPercentage = highGradeItem ? highGradeItem.percentage.toFixed(0) : "0";

  return (
    <div className="relative flex flex-col items-center justify-center w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as QualitySummary;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                    <p className="font-bold capitalize text-slate-800">
                      Grade: {item.grade}
                    </p>
                    <p className="mt-1 font-semibold text-emerald-800">
                      {formatKg(item.weight_kg)} ({item.percentage.toFixed(1)}%)
                    </p>
                    <p className="text-slate-500">{item.count} harvest lots</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="weight_kg"
            nameKey="grade"
          >
            {data.map((entry) => (
              <Cell
                key={`cell-${entry.grade}`}
                fill={GRADE_COLORS[entry.grade] || "#94a3b8"}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {showCenterText && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-800">{highPercentage}%</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            High Grade
          </span>
        </div>
      )}
    </div>
  );
}
