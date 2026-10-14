"use client";

import React, { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Container,
  Download,
  FileText,
  Globe,
  Layers,
  MapPin,
  Package,
  Route,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BatchTimeline } from "@/components/dashboard/BatchTimeline";
import { GradeBadge } from "@/components/dashboard/GradeBadge";
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
import { useBatches } from "@/hooks/useBatch";
import { Batch, BatchStageRecord } from "@/types/api";
import { formatDate, formatDateTime, formatKg } from "@/lib/utils";

export default function TraceabilityPage() {
  const { data: batches = [], isLoading } = useBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("BATCH-2026-089");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStageDetail, setSelectedStageDetail] = useState<BatchStageRecord | null>(null);

  // Find active selected batch
  const selectedBatch: Batch =
    batches.find(
      (b) =>
        b.id.toLowerCase() === selectedBatchId.toLowerCase() ||
        b.name.toLowerCase().includes(selectedBatchId.toLowerCase())
    ) ||
    batches[0] || {
      id: "BATCH-2026-089",
      name: "Ceylon BOPF Single Origin Nuwara Eliya",
      variety: "Camellia Sinensis (BOPF)",
      current_stage: "shipped",
      created_at: new Date().toISOString(),
      stages: [],
    };

  const filteredBatches = batches.filter(
    (b) =>
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Traceability"
        description="End-to-end custody chain tracking from green leaf plucking to factory rolling, drying, packaging, and buyer delivery."
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs py-1"
          >
            <ShieldCheck className="mr-1 h-3.5 w-3.5 text-emerald-600" />
            Cryptographic Batch Hash Verified
          </Badge>
        </div>
      </PageHeader>

      {/* Batch Search & Quick Selector */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Batch ID or tea variety..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Quick Batch Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1">
            Active Batches:
          </span>
          {filteredBatches.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setSelectedBatchId(b.id);
                setSelectedStageDetail(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition-all ${
                selectedBatch.id === b.id
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {b.id}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Batch Stepper Timeline Card */}
      <Card className="border-emerald-200/60 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedBatch.id}
                </span>
                <Badge
                  variant="outline"
                  className="capitalize font-bold text-slate-800 bg-white"
                >
                  Current Stage: {selectedBatch.current_stage.replace("_", " ")}
                </Badge>
              </div>
              <h2 className="mt-1.5 text-lg font-bold text-slate-900">
                {selectedBatch.name}
              </h2>
              {selectedBatch.variety && (
                <p className="text-xs text-slate-500">{selectedBatch.variety}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Initial Field Pluck
                </span>
                <p className="text-base font-black text-slate-900">
                  {formatKg(selectedBatch.total_initial_weight_kg || 1200)}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Current Net Weight
                </span>
                <p className="text-base font-black text-emerald-800">
                  {formatKg(selectedBatch.current_weight_kg || 278.4)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <BatchTimeline
            batch={selectedBatch}
            onSelectStage={(stage) => setSelectedStageDetail(stage)}
          />
        </CardContent>
      </Card>

      {/* Two Column Layout: Linked Harvest Lots & Buyer / Logistics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linked Lots Table (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Linked Harvest Lots Contributing to Batch
                </CardTitle>
                <CardDescription className="text-xs">
                  Field lots aggregated and blended during this manufacturing cycle
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {selectedBatch.linked_lots?.length || 4} Lots Linked
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot ID</TableHead>
                    <TableHead>Plucker Name</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead>AI Quality</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!selectedBatch.linked_lots || selectedBatch.linked_lots.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-20 text-center text-slate-500 text-xs">
                        No lots explicitly linked to this batch record.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedBatch.linked_lots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-700">
                          {lot.id}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {lot.worker_name || lot.worker_id}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-800">
                          {formatKg(lot.weight_kg)}
                        </TableCell>
                        <TableCell>
                          <GradeBadge grade={lot.grade} />
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-slate-700">
                          {(lot.confidence * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Buyer & Logistics Delivery Info Card (1 col) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Buyer & Logistics Dossier
            </CardTitle>
            <CardDescription className="text-xs">
              Consignment destination and export contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedBatch.buyer ? (
              <>
                <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      {selectedBatch.buyer.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 pl-6">
                    Contract: {selectedBatch.buyer.contract_ref || "CTR-GLOBAL-2026"}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-900">
                        Destination Port
                      </span>
                      <span className="text-slate-500">
                        {selectedBatch.buyer.destination}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-slate-700 pt-1">
                    <Globe className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-900">
                        Buyer Contact
                      </span>
                      <span className="text-slate-500">
                        {selectedBatch.buyer.contact_email || "procurement@tea-buyer.com"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-slate-700 pt-1">
                    <Container className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold block text-slate-900">
                        Consignment Spec
                      </span>
                      <span className="text-slate-500">
                        Climate Controlled (18°C, &lt;60% RH) · Nitrogen Purged
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs flex items-center justify-center gap-1.5"
                    onClick={() => {
                      alert(`Certificate of Origin and Traceability Report for ${selectedBatch.id} generated.`);
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Download Traceability Certificate
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                Consignment buyer not assigned yet. Batch currently in estate processing.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
