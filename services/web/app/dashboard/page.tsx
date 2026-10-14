"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Leaf,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { GradeBadge } from "@/components/dashboard/GradeBadge";
import { QualityDonutChart } from "@/components/charts/QualityDonutChart";
import { YieldLineChart } from "@/components/charts/YieldLineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHarvestLots, useQualitySummary } from "@/hooks/useQualityData";
import { useYieldAnalytics } from "@/hooks/useYieldData";
import { useWorkersList } from "@/hooks/useWorkers";
import { calculateQualityScore, formatDateTime, formatKg } from "@/lib/utils";

export default function DashboardOverviewPage() {
  const { data: yieldData, isLoading: yieldLoading } = useYieldAnalytics("week");
  const { data: qualityData, isLoading: qualityLoading } = useQualitySummary();
  const { data: lots, isLoading: lotsLoading } = useHarvestLots({ limit: 8 });
  const { data: workers, isLoading: workersLoading } = useWorkersList();

  // Calculations for KPIs
  const latestYieldPoint = yieldData && yieldData.length > 0 ? yieldData[yieldData.length - 1] : null;
  const todayKg = latestYieldPoint?.weight_kg || 1920.4;

  const totalHighKg = qualityData?.find((q) => q.grade === "high")?.weight_kg || 0;
  const totalMedKg = qualityData?.find((q) => q.grade === "medium")?.weight_kg || 0;
  const totalLowKg = qualityData?.find((q) => q.grade === "low")?.weight_kg || 0;

  const avgQualityScore = calculateQualityScore(totalHighKg, totalMedKg, totalLowKg);
  const activeWorkersCount = workers ? workers.filter((w) => w.active !== false).length : 130;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-6 md:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-700/60 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-500/30 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>AI Model Precision: 98.4% Confidence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Harvest Intelligence Overview
          </h1>
          <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
            Real-time harvest metrics, AI-assisted tea leaf grading, and worker productivity across all active estate sectors.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md"
            >
              <Link href="/dashboard/traceability">
                Track Active Batches
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-emerald-500/40 bg-emerald-800/40 text-white hover:bg-emerald-700/60"
            >
              <Link href="/dashboard/yield">View Yield Analytics</Link>
            </Button>
          </div>
        </div>

        {/* Decorative backdrop leaf icon */}
        <Leaf className="absolute -bottom-8 -right-8 h-64 w-64 text-emerald-700/20 pointer-events-none" />
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Yield Today"
          value={formatKg(todayKg)}
          changePct={4.2}
          changeLabel="vs yesterday"
          icon={Scale}
          isLoading={yieldLoading}
        />
        <KPICard
          title="Avg Quality Score"
          value={`${avgQualityScore}/100`}
          changePct={1.8}
          changeLabel="weighted score"
          icon={Sparkles}
          isLoading={qualityLoading}
        />
        <KPICard
          title="Active Pluckers"
          value={activeWorkersCount}
          changePct={2.5}
          changeLabel="active in field"
          icon={Users}
          isLoading={workersLoading}
        />
        <KPICard
          title="High Grade Ratio"
          value={`${qualityData?.find((q) => q.grade === "high")?.percentage.toFixed(0) || 68}%`}
          changePct={3.1}
          changeLabel="optimal plucking"
          icon={Award}
          isLoading={qualityLoading}
        />
      </div>

      {/* Charts Grid: Yield Trend & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yield 7-Day Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Weekly Harvest Yield
              </CardTitle>
              <CardDescription className="text-xs">
                Total kilograms collected over the last 7 days
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-emerald-700">
              <Link href="/dashboard/yield" className="flex items-center gap-1">
                Full Analytics <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <YieldLineChart data={yieldData} isLoading={yieldLoading} height={260} />
          </CardContent>
        </Card>

        {/* Grade Distribution Donut Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Quality Breakdown
              </CardTitle>
              <CardDescription className="text-xs">
                AI Vision classification ratio
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-emerald-700">
              <Link href="/dashboard/quality" className="flex items-center gap-1">
                Details <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <QualityDonutChart data={qualityData} isLoading={qualityLoading} height={200} />
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
              <div>
                <span className="block text-[11px] font-semibold text-emerald-700">High</span>
                <span className="text-xs font-bold text-slate-800">
                  {qualityData?.find((q) => q.grade === "high")?.percentage.toFixed(0) || 68}%
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-amber-600">Medium</span>
                <span className="text-xs font-bold text-slate-800">
                  {qualityData?.find((q) => q.grade === "medium")?.percentage.toFixed(0) || 24}%
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-rose-600">Low</span>
                <span className="text-xs font-bold text-slate-800">
                  {qualityData?.find((q) => q.grade === "low")?.percentage.toFixed(0) || 8}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Harvest Lots Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Recent Harvest Lots (AI Ingested)
            </CardTitle>
            <CardDescription className="text-xs">
              Live stream of plucking lots evaluated by mobile computer vision
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/dashboard/quality">View All Lots</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Lot ID</TableHead>
                  <TableHead>Plucker</TableHead>
                  <TableHead className="hidden md:table-cell">Estate Sector</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead>AI Grade</TableHead>
                  <TableHead className="hidden sm:table-cell">Confidence</TableHead>
                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <div className="h-8 animate-pulse rounded bg-slate-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !lots || lots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      No harvest lots logged today.
                    </TableCell>
                  </TableRow>
                ) : (
                  lots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">
                        {lot.id}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {lot.worker_name || lot.worker_id}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-slate-500">
                        {lot.garden_name || "Nuwara Eliya Estate"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatKg(lot.weight_kg)}
                      </TableCell>
                      <TableCell>
                        <GradeBadge grade={lot.grade} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs font-semibold text-emerald-800">
                        {(lot.confidence * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500">
                        {formatDateTime(lot.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
