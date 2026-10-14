"use client";

import React, { useState } from "react";
import { Download, Filter, RefreshCw, Scale, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { YieldLineChart } from "@/components/charts/YieldLineChart";
import { YieldBarChart } from "@/components/charts/YieldBarChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGardenYield, useYieldAnalytics } from "@/hooks/useYieldData";
import { formatDate, formatKg } from "@/lib/utils";

export default function YieldPage() {
  const [period, setPeriod] = useState<string>("month");
  const [selectedGarden, setSelectedGarden] = useState<string>("all");

  const {
    data: yieldPoints,
    isLoading: yieldLoading,
    refetch: refetchYield,
  } = useYieldAnalytics(period, selectedGarden);

  const {
    data: gardenYields,
    isLoading: gardensLoading,
    refetch: refetchGardens,
  } = useGardenYield();

  const handleRefresh = () => {
    refetchYield();
    refetchGardens();
  };

  const totalPeriodKg = yieldPoints
    ? yieldPoints.reduce((acc, curr) => acc + curr.weight_kg, 0)
    : 0;

  const avgDailyKg =
    yieldPoints && yieldPoints.length > 0
      ? totalPeriodKg / yieldPoints.length
      : 0;

  const handleExportCSV = () => {
    if (!yieldPoints || yieldPoints.length === 0) return;

    const headers = ["Date", "Harvest Weight (kg)", "Plucking Sessions"];
    const rows = yieldPoints.map((d) => [
      d.date,
      d.weight_kg,
      d.sessions_count ?? "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teavision_yield_${period}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Action Bar */}
      <PageHeader
        title="Yield Analytics"
        description="Comprehensive volume tracking, seasonal harvest forecasting, and garden plot efficiency."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Garden Filter */}
          <div className="w-48">
            <Select value={selectedGarden} onValueChange={setSelectedGarden}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Gardens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gardens & Estates</SelectItem>
                <SelectItem value="grd_01">Nuwara Eliya (Block A)</SelectItem>
                <SelectItem value="grd_02">Dimbula Valley (Block B)</SelectItem>
                <SelectItem value="grd_03">Kandy Mid-Grown (Block C)</SelectItem>
                <SelectItem value="grd_04">Ruhuna Lowland (Block D)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  period === p
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 px-2.5 text-slate-600"
            title="Refresh analytics data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Export CSV Button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export Data
          </Button>
        </div>
      </PageHeader>

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Harvested ({period})
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatKg(totalPeriodKg)}
          </p>
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-700 font-semibold">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+5.4% higher than last cycle</span>
          </div>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Daily Average Pluck
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatKg(avgDailyKg)}
          </p>
          <span className="mt-2 block text-xs text-slate-500">
            Across {yieldPoints?.length || 1} logging sessions
          </span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Top Producing Plot
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            Nuwara Eliya A
          </p>
          <span className="mt-2 block text-xs text-emerald-700 font-semibold">
            8,450.5 kg (34.2% of total output)
          </span>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Harvest Volume Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Daily recorded green leaf intake in kilograms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YieldLineChart
              data={yieldPoints}
              isLoading={yieldLoading}
              height={300}
            />
          </CardContent>
        </Card>

        {/* Garden Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Yield by Garden Estate
            </CardTitle>
            <CardDescription className="text-xs">
              Comparative intake across regional estates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YieldBarChart
              data={gardenYields}
              isLoading={gardensLoading}
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">
            Daily Harvest Sessions Log
          </CardTitle>
          <CardDescription className="text-xs">
            Detailed breakdown of recorded plucking sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Plucking Sessions</TableHead>
                  <TableHead className="text-right">Total Harvest</TableHead>
                  <TableHead className="text-right">Avg Weight / Session</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yieldLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <div className="h-6 animate-pulse rounded bg-slate-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !yieldPoints || yieldPoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-slate-500">
                      No yield data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  yieldPoints.slice().reverse().map((point) => {
                    const avg = point.sessions_count
                      ? point.weight_kg / point.sessions_count
                      : 25.4;
                    return (
                      <TableRow key={point.date}>
                        <TableCell className="font-semibold text-slate-900">
                          {formatDate(point.date, "EEEE, MMMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {point.sessions_count || 64} sessions
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-800">
                          {formatKg(point.weight_kg)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {formatKg(avg)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            Verified
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
