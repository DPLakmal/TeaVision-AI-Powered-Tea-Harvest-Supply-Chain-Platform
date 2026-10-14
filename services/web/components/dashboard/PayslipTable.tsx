"use client";

import React, { useState } from "react";
import { Download, Search } from "lucide-react";
import { PayrollEntry } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatKg } from "@/lib/utils";

interface PayslipTableProps {
  entries: PayrollEntry[];
  periodId?: string;
}

export function PayslipTable({ entries = [], periodId }: PayslipTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEntries = entries.filter((e) =>
    e.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.worker_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (entries.length === 0) return;

    const headers = [
      "Worker ID",
      "Worker Name",
      "Total Weight (kg)",
      "Rate ($/kg)",
      "High Grade (kg)",
      "Medium Grade (kg)",
      "Bonus ($)",
      "Total Amount ($)",
    ];

    const rows = entries.map((e) => [
      e.worker_id,
      `"${e.worker_name}"`,
      e.total_kg,
      e.rate_per_kg,
      e.high_grade_kg ?? 0,
      e.medium_grade_kg ?? 0,
      e.bonus ?? 0,
      e.total_amount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `teavision_payroll_${periodId || "export"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalKg = filteredEntries.reduce((acc, curr) => acc + curr.total_kg, 0);
  const totalPayout = filteredEntries.reduce((acc, curr) => acc + curr.total_amount, 0);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search worker by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <Button
          onClick={handleExportCSV}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-xs text-slate-700"
        >
          <Download className="h-3.5 w-3.5" />
          Export Payslips CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Worker ID</TableHead>
              <TableHead>Plucker Name</TableHead>
              <TableHead className="text-right">Harvest (kg)</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right hidden md:table-cell">High Grade</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Bonus</TableHead>
              <TableHead className="text-right font-bold">Total Payout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  No plucker payroll records match your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {entry.worker_id}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {entry.worker_name}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-800">
                    {formatKg(entry.total_kg)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-600">
                    ${entry.rate_per_kg.toFixed(2)}/kg
                  </TableCell>
                  <TableCell className="text-right text-xs text-emerald-700 font-medium hidden md:table-cell">
                    {formatKg(entry.high_grade_kg ?? 0)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-amber-700 font-medium hidden sm:table-cell">
                    {entry.bonus ? formatCurrency(entry.bonus) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {formatCurrency(entry.total_amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer Totals */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50/75 px-4 py-3 text-xs font-semibold text-slate-700">
          <span>Showing {filteredEntries.length} Pluckers</span>
          <div className="flex items-center gap-6">
            <span>Total Harvest: <strong className="text-emerald-800">{formatKg(totalKg)}</strong></span>
            <span>Total Payout: <strong className="text-slate-900 text-sm">{formatCurrency(totalPayout)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
