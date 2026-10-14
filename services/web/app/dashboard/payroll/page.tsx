"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileCheck,
  PlusCircle,
  ShieldAlert,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PayslipTable } from "@/components/dashboard/PayslipTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreatePayrollRun, usePayrollRuns } from "@/hooks/usePayroll";
import { formatCurrency, formatDate, formatKg } from "@/lib/utils";

export default function PayrollPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [periodStart, setPeriodStart] = useState("2026-10-01");
  const [periodEnd, setPeriodEnd] = useState("2026-10-14");
  const [expandedRunId, setExpandedRunId] = useState<string | null>("PAY-2026-10-B1");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: payrollRuns, isLoading } = usePayrollRuns();
  const createPayrollRun = useCreatePayrollRun();

  // If not admin, render Access Denied guard
  if (!isAdmin && session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          Payroll management and plucker compensation disbursements require Administrator permissions. Your current role is{" "}
          <strong className="text-slate-900 uppercase">{session.user.role}</strong>.
        </p>
        <Button asChild className="mt-6 bg-emerald-700 hover:bg-emerald-800 text-white">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const handleRunPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    try {
      await createPayrollRun.mutateAsync({
        period_start: periodStart,
        period_end: periodEnd,
      });
      setSuccessMessage(
        `Payroll run calculated successfully for ${periodStart} to ${periodEnd}`
      );
    } catch {
      // Error handled by hook fallback
    }
  };

  const totalDisbursed = (payrollRuns || []).reduce(
    (acc, curr) => acc + curr.total_amount,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Management"
        description="Automated plucker compensation calculation based on verified harvest weight, rates, and quality bonuses."
      />

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Disbursed (MTD)
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatCurrency(totalDisbursed)}
          </p>
          <span className="mt-1 block text-xs text-emerald-700 font-semibold">
            Across {(payrollRuns || []).length} finalized payroll cycles
          </span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Average Payout / Plucker
          </span>
          <p className="mt-2 text-2xl font-black text-slate-900">
            $184.40
          </p>
          <span className="mt-1 block text-xs text-slate-500">
            Bi-weekly harvest payment average
          </span>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quality Bonus Pool
          </span>
          <p className="mt-2 text-2xl font-black text-emerald-800">
            $38.00
          </p>
          <span className="mt-1 block text-xs text-slate-500">
            Incentives awarded for &gt;90% High Grade
          </span>
        </Card>
      </div>

      {/* Run Payroll Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">
            Calculate New Payroll Cycle
          </CardTitle>
          <CardDescription className="text-xs">
            Generate compensation ledger based on green leaf intake logs and individual plucker piece rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleRunPayroll}
            className="flex flex-col sm:flex-row items-end gap-4"
          >
            <div className="space-y-1.5 w-full sm:w-auto">
              <label
                htmlFor="period_start"
                className="text-xs font-semibold text-slate-700"
              >
                Period Start
              </label>
              <Input
                id="period_start"
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="h-10 text-xs w-full sm:w-44"
              />
            </div>

            <div className="space-y-1.5 w-full sm:w-auto">
              <label
                htmlFor="period_end"
                className="text-xs font-semibold text-slate-700"
              >
                Period End
              </label>
              <Input
                id="period_end"
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="h-10 text-xs w-full sm:w-44"
              />
            </div>

            <Button
              type="submit"
              disabled={createPayrollRun.isPending}
              className="h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-2"
            >
              {createPayrollRun.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Calculating Ledger...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  Run Payroll Now
                </>
              )}
            </Button>
          </form>

          {successMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payroll Runs History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900">
            Payroll Settlement Runs
          </CardTitle>
          <CardDescription className="text-xs">
            Expand any payroll run row to view and export the per-worker itemized payslip ledger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Payroll Period</TableHead>
                  <TableHead className="text-right">Pluckers Count</TableHead>
                  <TableHead className="text-right">Total Harvest</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Processed On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <div className="h-10 animate-pulse rounded bg-slate-100" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : !payrollRuns || payrollRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      No payroll runs recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  payrollRuns.map((run) => {
                    const isExpanded = expandedRunId === run.id;
                    return (
                      <React.Fragment key={run.id}>
                        <TableRow
                          onClick={() =>
                            setExpandedRunId(isExpanded ? null : run.id)
                          }
                          className="cursor-pointer hover:bg-slate-50"
                        >
                          <TableCell className="w-10 text-center">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-emerald-700" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-800">
                            {run.id}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {formatDate(run.period_start)} – {formatDate(run.period_end)}
                          </TableCell>
                          <TableCell className="text-right text-slate-700">
                            {run.total_workers || run.entries.length} pluckers
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-800">
                            {formatKg(
                              run.total_kg ||
                                run.entries.reduce((a, b) => a + b.total_kg, 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900">
                            {formatCurrency(run.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                run.status === "paid"
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : "border-amber-300 bg-amber-50 text-amber-700"
                              }
                            >
                              {run.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500">
                            {formatDate(run.created_at)}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Ledger Row */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableCell colSpan={8} className="p-4 sm:p-6">
                              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900">
                                      Itemized Payslip Ledger: {run.id}
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                      Period: {formatDate(run.period_start)} to {formatDate(run.period_end)}
                                    </p>
                                  </div>
                                </div>
                                <PayslipTable
                                  entries={run.entries}
                                  periodId={run.id}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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
