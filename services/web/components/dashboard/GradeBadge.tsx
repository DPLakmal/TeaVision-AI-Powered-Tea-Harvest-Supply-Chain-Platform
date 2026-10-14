import React from "react";
import { QualityGrade } from "@/types/api";
import { cn } from "@/lib/utils";

interface GradeBadgeProps {
  grade: QualityGrade | string;
  className?: string;
  showDot?: boolean;
}

export function GradeBadge({
  grade,
  className,
  showDot = true,
}: GradeBadgeProps) {
  const normalizedGrade = grade.toLowerCase();

  const config = {
    high: {
      label: "High Quality",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      dotClass: "bg-emerald-500",
    },
    medium: {
      label: "Medium Quality",
      classes: "bg-amber-50 text-amber-700 border-amber-200/80",
      dotClass: "bg-amber-400",
    },
    low: {
      label: "Low Quality",
      classes: "bg-rose-50 text-rose-700 border-rose-200/80",
      dotClass: "bg-rose-400",
    },
  }[normalizedGrade] || {
    label: grade,
    classes: "bg-slate-50 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold select-none",
        config.classes,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)}
        />
      )}
      {config.label}
    </span>
  );
}
