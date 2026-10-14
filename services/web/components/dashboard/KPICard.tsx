"use client";

import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  changePct?: number;
  changeLabel?: string;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

export function KPICard({
  title,
  value,
  unit,
  changePct,
  changeLabel = "vs last period",
  icon: Icon,
  description,
  isLoading = false,
  className,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-24" />
      </Card>
    );
  }

  const isPositive = changePct !== undefined && changePct > 0;
  const isNegative = changePct !== undefined && changePct < 0;
  const isNeutral = changePct !== undefined && changePct === 0;

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-slate-500">{unit}</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {changePct !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                isPositive && "bg-emerald-50 text-emerald-700",
                isNegative && "bg-rose-50 text-rose-700",
                isNeutral && "bg-slate-100 text-slate-600"
              )}
            >
              {isPositive && <TrendingUp className="h-3 w-3" />}
              {isNegative && <TrendingDown className="h-3 w-3" />}
              {isNeutral && <Minus className="h-3 w-3" />}
              {Math.abs(changePct).toFixed(1)}%
            </span>
          )}

          <span className="text-xs text-slate-500">
            {description || changeLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
