"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  Cog,
  Factory,
  Leaf,
  LucideIcon,
  Package,
  ShieldCheck,
  Truck,
  ArrowDownRight,
  Info,
} from "lucide-react";
import { Batch, BatchStage, BatchStageRecord } from "@/types/api";
import { formatDateTime, formatKg, cn } from "@/lib/utils";

interface StageConfig {
  key: BatchStage;
  label: string;
  icon: LucideIcon;
}

const STAGES: StageConfig[] = [
  { key: "field", label: "Field", icon: Leaf },
  { key: "processing", label: "Processing", icon: Cog },
  { key: "factory", label: "Factory", icon: Factory },
  { key: "quality_control", label: "QC", icon: ShieldCheck },
  { key: "packaging", label: "Packaging", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const STAGE_ORDER: BatchStage[] = [
  "field",
  "processing",
  "factory",
  "quality_control",
  "packaging",
  "shipped",
  "delivered",
];

interface BatchTimelineProps {
  batch: Batch;
  onSelectStage?: (stage: BatchStageRecord | null) => void;
}

export function BatchTimeline({ batch, onSelectStage }: BatchTimelineProps) {
  const currentStageIndex = STAGE_ORDER.indexOf(batch.current_stage);
  const [activeStageKey, setActiveStageKey] = useState<BatchStage>(batch.current_stage);

  // Map recorded stage details
  const stageRecordsMap = new Map<BatchStage, BatchStageRecord>();
  batch.stages.forEach((s) => {
    stageRecordsMap.set(s.stage, s);
  });

  const selectedRecord = stageRecordsMap.get(activeStageKey);

  const handleStageClick = (stageKey: BatchStage) => {
    setActiveStageKey(stageKey);
    const rec = stageRecordsMap.get(stageKey) || null;
    if (onSelectStage) {
      onSelectStage(rec);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Horizontal Stepper Scroll Container */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="flex min-w-[760px] items-start justify-between px-4">
          {STAGES.map((stageItem, index) => {
            const stageIndex = STAGE_ORDER.indexOf(stageItem.key);
            const isCompleted = stageIndex < currentStageIndex;
            const isCurrent = stageIndex === currentStageIndex;
            const isPending = stageIndex > currentStageIndex;
            const isSelected = activeStageKey === stageItem.key;

            const record = stageRecordsMap.get(stageItem.key);
            const Icon = stageItem.icon;

            // Next stage loss percentage badge
            const nextStageRecord =
              index < STAGES.length - 1
                ? stageRecordsMap.get(STAGES[index + 1].key)
                : null;
            const weightLoss = nextStageRecord?.weight_loss_pct;

            return (
              <React.Fragment key={stageItem.key}>
                {/* Step Node */}
                <div
                  onClick={() => handleStageClick(stageItem.key)}
                  className="group flex cursor-pointer flex-col items-center text-center focus:outline-none"
                >
                  {/* Step Icon Circle */}
                  <div
                    className={cn(
                      "relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200",
                      isCompleted &&
                        "border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
                      isCurrent &&
                        "border-emerald-600 bg-white text-emerald-700 shadow-md ring-4 ring-emerald-100",
                      isPending &&
                        "border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400",
                      isSelected && "scale-110 ring-4 ring-amber-300"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {isCurrent && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600"></span>
                      </span>
                    )}
                  </div>

                  {/* Step Label & Meta */}
                  <div className="mt-3 w-28">
                    <p
                      className={cn(
                        "text-xs font-bold tracking-tight",
                        isCompleted || isCurrent
                          ? "text-slate-900"
                          : "text-slate-400"
                      )}
                    >
                      {stageItem.label}
                    </p>

                    {record ? (
                      <>
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                          {formatKg(record.weight_kg)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDateTime(record.created_at).split("·")[0]}
                        </p>
                      </>
                    ) : (
                      <p className="mt-0.5 text-[10px] italic text-slate-400">
                        Pending
                      </p>
                    )}
                  </div>
                </div>

                {/* Connector Line & Weight Loss Indicator */}
                {index < STAGES.length - 1 && (
                  <div className="relative mt-6 flex flex-1 flex-col items-center justify-center px-1">
                    <div
                      className={cn(
                        "h-0.5 w-full",
                        stageIndex < currentStageIndex
                          ? "bg-emerald-600"
                          : "bg-slate-200"
                      )}
                    />

                    {/* Weight Loss Badge if recorded */}
                    {weightLoss !== undefined && weightLoss > 0 && (
                      <div
                        className={cn(
                          "absolute -top-3.5 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-bold shadow-xs whitespace-nowrap",
                          weightLoss > 5
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        )}
                        title={`Weight loss between ${stageItem.label} and ${STAGES[index + 1].label}`}
                      >
                        <ArrowDownRight className="h-2.5 w-2.5" />
                        <span>-{weightLoss.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detail Card */}
      {selectedRecord && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold uppercase">
                {selectedRecord.stage.slice(0, 2)}
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 capitalize">
                  {selectedRecord.stage.replace("_", " ")} Stage Details
                </h4>
                <p className="text-xs text-slate-500">
                  Recorded on {formatDateTime(selectedRecord.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-500">Recorded Weight: </span>
                <span className="font-bold text-emerald-800">
                  {formatKg(selectedRecord.weight_kg)}
                </span>
              </div>
              {selectedRecord.operator_name && (
                <div>
                  <span className="text-slate-500">Operator: </span>
                  <span className="font-semibold text-slate-800">
                    {selectedRecord.operator_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
            <Info className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <p>
              {selectedRecord.notes ||
                "Standard operational parameters observed. Quality verified against estate standards."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
