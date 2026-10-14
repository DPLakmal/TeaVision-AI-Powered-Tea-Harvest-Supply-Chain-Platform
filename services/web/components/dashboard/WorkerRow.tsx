import React from "react";
import { Award, ChevronRight, TrendingUp } from "lucide-react";
import { Worker } from "@/types/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatKg, cn } from "@/lib/utils";

interface WorkerRowProps {
  worker: Worker;
  rank: number;
  onSelectWorker?: (worker: Worker) => void;
}

export function WorkerRow({ worker, rank, onSelectWorker }: WorkerRowProps) {
  const isTopThree = rank <= 3;
  const rankColors = {
    1: "bg-amber-100 text-amber-800 border-amber-300",
    2: "bg-slate-200 text-slate-800 border-slate-300",
    3: "bg-amber-50 text-amber-900 border-amber-200",
  }[rank] || "bg-slate-50 text-slate-600 border-slate-200";

  const highPct = worker.high_grade_pct || 85;
  const mediumPct = 100 - highPct > 10 ? 10 : 100 - highPct;
  const lowPct = Math.max(0, 100 - highPct - mediumPct);

  return (
    <tr
      onClick={() => onSelectWorker?.(worker)}
      className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-emerald-50/40"
    >
      {/* Rank */}
      <td className="py-3.5 pl-4 pr-2 text-center whitespace-nowrap">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
            rankColors
          )}
        >
          {isTopThree ? <Award className="h-3.5 w-3.5" /> : rank}
        </span>
      </td>

      {/* Worker info */}
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-slate-200">
            {worker.avatar_url && (
              <AvatarImage src={worker.avatar_url} alt={worker.name} />
            )}
            <AvatarFallback>
              {worker.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
              {worker.name}
            </p>
            <p className="text-xs text-slate-500">
              {worker.garden_name || "Central Estate"}
            </p>
          </div>
        </div>
      </td>

      {/* Today Weight */}
      <td className="py-3.5 px-3 text-right">
        <span className="text-sm font-bold text-slate-900">
          {formatKg(worker.total_kg_today || 0)}
        </span>
        <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-emerald-600">
          <TrendingUp className="h-3 w-3" />
          <span>Optimal speed</span>
        </div>
      </td>

      {/* Grade Breakdown Bar */}
      <td className="py-3.5 px-3 hidden md:table-cell w-44">
        <div className="space-y-1">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              style={{ width: `${highPct}%` }}
              className="bg-emerald-500"
              title={`High Grade: ${highPct}%`}
            />
            <div
              style={{ width: `${mediumPct}%` }}
              className="bg-amber-400"
              title={`Medium Grade: ${mediumPct}%`}
            />
            <div
              style={{ width: `${lowPct}%` }}
              className="bg-rose-400"
              title={`Low Grade: ${lowPct}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span className="text-emerald-700">{highPct}% High</span>
            <span>{mediumPct}% Med</span>
          </div>
        </div>
      </td>

      {/* Rate */}
      <td className="py-3.5 px-3 text-right hidden sm:table-cell text-xs font-semibold text-slate-700">
        ${worker.rate_per_kg.toFixed(2)}/kg
      </td>

      {/* View Trigger */}
      <td className="py-3.5 pr-4 pl-2 text-right">
        <button
          type="button"
          aria-label={`View details for ${worker.name}`}
          className="rounded p-1 text-slate-400 group-hover:text-emerald-700 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
