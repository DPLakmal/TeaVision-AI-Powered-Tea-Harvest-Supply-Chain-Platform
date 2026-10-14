"use client";

import React, { useState } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  DollarSign,
  Phone,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkerRow } from "@/components/dashboard/WorkerRow";
import { GradeBadge } from "@/components/dashboard/GradeBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWorkerLots, useWorkersList } from "@/hooks/useWorkers";
import { Worker } from "@/types/api";
import { formatDateTime, formatKg } from "@/lib/utils";

export default function WorkersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  const { data: workers, isLoading: workersLoading } = useWorkersList();
  const { data: workerLots, isLoading: lotsLoading } = useWorkerLots(
    selectedWorker?.id || null
  );

  const filteredWorkers = (workers || []).filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.garden_name && w.garden_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workers Leaderboard"
        description="Plucker daily throughput ranking, plucking quality standard adherence, and incentive history."
      >
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search plucker or estate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </PageHeader>

      {/* Top Plucker Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredWorkers.slice(0, 3).map((w, index) => {
          const rankTitles = ["#1 Master Plucker", "#2 Runner Up", "#3 High Flusher"];
          const badgeColors = [
            "bg-amber-500 text-slate-950",
            "bg-slate-300 text-slate-900",
            "bg-amber-700 text-white",
          ];

          return (
            <Card
              key={w.id}
              onClick={() => setSelectedWorker(w)}
              className="cursor-pointer border-slate-200/90 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div
                className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[10px] font-black uppercase ${badgeColors[index]}`}
              >
                {rankTitles[index]}
              </div>

              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-emerald-600">
                    {w.avatar_url && <AvatarImage src={w.avatar_url} alt={w.name} />}
                    <AvatarFallback className="bg-emerald-700 text-white font-bold">
                      {w.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-slate-900">{w.name}</h3>
                    <p className="text-xs text-slate-500">{w.garden_name}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Today's Harvest
                    </span>
                    <p className="text-lg font-black text-emerald-800">
                      {formatKg(w.total_kg_today || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      High Quality Ratio
                    </span>
                    <p className="text-lg font-black text-slate-800">
                      {w.high_grade_pct || 90}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">
            Plucker Rankings & Productivity
          </CardTitle>
          <CardDescription className="text-xs">
            Select any worker row to inspect plucking sessions, harvest lots, and grading history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-xs text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 pl-4 pr-2 text-center w-14">Rank</th>
                  <th className="py-3 px-3 text-left">Plucker Name & Estate</th>
                  <th className="py-3 px-3 text-right">Harvest Today</th>
                  <th className="py-3 px-3 text-left hidden md:table-cell">Quality Ratio (High/Med/Low)</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell">Plucking Rate</th>
                  <th className="py-3 pr-4 pl-2 text-right w-10"></th>
                </tr>
              </thead>
              <tbody>
                {workersLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td colSpan={6} className="p-4">
                        <div className="h-8 animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-24 text-center text-slate-500">
                      No pluckers found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker, index) => (
                    <WorkerRow
                      key={worker.id}
                      worker={worker}
                      rank={index + 1}
                      onSelectWorker={(w) => setSelectedWorker(w)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Worker Detail Dialog / Modal */}
      <Dialog
        open={Boolean(selectedWorker)}
        onOpenChange={(open) => !open && setSelectedWorker(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedWorker && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-emerald-600">
                    {selectedWorker.avatar_url && (
                      <AvatarImage
                        src={selectedWorker.avatar_url}
                        alt={selectedWorker.name}
                      />
                    )}
                    <AvatarFallback className="bg-emerald-700 text-white font-bold text-lg">
                      {selectedWorker.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                      {selectedWorker.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Plucker ID: {selectedWorker.id} · {selectedWorker.garden_name}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Harvest Today
                  </span>
                  <p className="mt-1 text-lg font-bold text-emerald-800">
                    {formatKg(selectedWorker.total_kg_today || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Week Volume
                  </span>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatKg(selectedWorker.total_kg_week || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Base Rate
                  </span>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    ${selectedWorker.rate_per_kg.toFixed(2)}/kg
                  </p>
                </div>
              </div>

              {/* Harvest Lots Table for Worker */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Recent Plucking Lots
                </h4>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lot ID</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                        <TableHead className="text-right">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            Loading harvest history...
                          </TableCell>
                        </TableRow>
                      ) : !workerLots || workerLots.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-slate-500 text-xs">
                            No harvest lots recorded for this worker today.
                          </TableCell>
                        </TableRow>
                      ) : (
                        workerLots.map((lot) => (
                          <TableRow key={lot.id}>
                            <TableCell className="font-mono text-xs font-semibold">
                              {lot.id}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              {formatKg(lot.weight_kg)}
                            </TableCell>
                            <TableCell>
                              <GradeBadge grade={lot.grade} />
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-emerald-800">
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
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedWorker(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
