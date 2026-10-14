"use client";

import React, { useState } from "react";
import { Download, Filter, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { QualityDonutChart } from "@/components/charts/QualityDonutChart";
import { QualityTrendChart } from "@/components/charts/QualityTrendChart";
import { GradeBadge } from "@/components/dashboard/GradeBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  useHarvestLots,
  useQualitySummary,
  useQualityTrends,
} from "@/hooks/useQualityData";
import { formatDateTime, formatKg } from "@/lib/utils";

export default function QualityPage() {
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: qualitySummary, isLoading: summaryLoading } = useQualitySummary();
  const { data: qualityTrends, isLoading: trendsLoading } = useQualityTrends("week");
  const { data: lots, isLoading: lotsLoading } = useHarvestLots();

  // Filter lots by search term and grade
  const filteredLots = (lots || []).filter((lot) => {
    const matchesGrade =
      selectedGrade === "all" || lot.grade === selectedGrade;
    const matchesSearch =
      (lot.worker_name &&
        lot.worker_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      lot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lot.garden_name &&
        lot.garden_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesGrade && matchesSearch;
  });

  const handleExportCSV = () => {
    if (!filteredLots || filteredLots.length === 0) return;

    const headers = [
      "Lot ID",
      "Worker ID",
      "Worker Name",
      "Garden",
      "Weight (kg)",
      "AI Grade",
      "Model Confidence",
      "Timestamp",
    ];

    const rows = filteredLots.map((l) => [
      l.id,
      l.worker_id,
      `"${l.worker_name || ""}"`,
      `"${l.garden_name || ""}"`,
      l.weight_kg,
      l.grade,
      (l.confidence * 100).toFixed(1) + "%",
      l.created_at,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `teavision_quality_lots_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quality Distribution"
        description="Computer vision classification of plucking standard: two leaves and a bud precision grading."
      >
        <Button
          onClick={handleExportCSV}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-xs text-slate-700"
        >
          <Download className="h-3.5 w-3.5" />
          Export Lots (CSV)
        </Button>
      </PageHeader>

      {/* Visual Analytics Grid: Donut + Stacked Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quality Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Grade Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Overall tea flush classification ratio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QualityDonutChart
              data={qualitySummary}
              isLoading={summaryLoading}
              height={230}
            />

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {(qualitySummary || []).map((q) => (
                <div
                  key={q.grade}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        q.grade === "high"
                          ? "bg-emerald-500"
                          : q.grade === "medium"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      }`}
                    />
                    <span className="font-semibold text-slate-800 capitalize">
                      {q.grade} Quality
                    </span>
                  </div>
                  <span className="text-slate-600">
                    <strong className="text-slate-900">{formatKg(q.weight_kg)}</strong> ({q.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quality Trend Stacked Bar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Quality Trends Over Time
            </CardTitle>
            <CardDescription className="text-xs">
              Daily weight breakdown by tea leaf grade classification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QualityTrendChart
              data={qualityTrends}
              isLoading={trendsLoading}
              height={290}
            />
          </CardContent>
        </Card>
      </div>

      {/* Filterable Harvest Lots Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Graded Harvest Lots Log
            </CardTitle>
            <CardDescription className="text-xs">
              Detailed inspection records evaluated by MobileNetV3 AI classifier
            </CardDescription>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search lot, worker, estate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="w-36">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="high">High Only</SelectItem>
                  <SelectItem value="medium">Medium Only</SelectItem>
                  <SelectItem value="low">Low Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Lot ID</TableHead>
                  <TableHead>Plucker Name</TableHead>
                  <TableHead className="hidden md:table-cell">Garden Estate</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead>AI Quality Grade</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Inspection Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <div className="h-8 animate-pulse rounded bg-slate-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredLots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      No harvest lots match your search query.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${lot.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold text-slate-700">
                            {(lot.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
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

          {/* Table Summary Footer */}
          <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
            <span>Showing {filteredLots.length} harvest lots</span>
            <span>Total Inspected Weight: {formatKg(filteredLots.reduce((acc, l) => acc + l.weight_kg, 0))}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
