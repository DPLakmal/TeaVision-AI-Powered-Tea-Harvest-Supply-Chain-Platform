export type UserRole =
  | "admin"
  | "supervisor"
  | "field_worker"
  | "factory_manager"
  | "buyer";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export interface Worker {
  id: string;
  name: string;
  garden_id: string;
  garden_name?: string;
  rate_per_kg: number;
  total_kg_today?: number;
  total_kg_week?: number;
  total_kg_month?: number;
  rank?: number;
  active?: boolean;
  avatar_url?: string;
  phone?: string;
  joined_date?: string;
  high_grade_pct?: number;
}

export type QualityGrade = "high" | "medium" | "low";

export interface HarvestLot {
  id: string;
  worker_id: string;
  worker_name?: string;
  garden_id?: string;
  garden_name?: string;
  weight_kg: number;
  grade: QualityGrade;
  confidence: number;
  image_url?: string;
  created_at: string;
}

export interface YieldDataPoint {
  date: string;
  weight_kg: number;
  garden_id?: string;
  sessions_count?: number;
}

export interface GardenYield {
  garden_id: string;
  garden_name: string;
  total_weight_kg: number;
  worker_count: number;
}

export interface QualitySummary {
  grade: QualityGrade;
  count: number;
  weight_kg: number;
  percentage: number;
}

export interface QualityTrendPoint {
  date: string;
  high_kg: number;
  medium_kg: number;
  low_kg: number;
  total_kg: number;
}

export type BatchStage =
  | "field"
  | "processing"
  | "factory"
  | "quality_control"
  | "packaging"
  | "shipped"
  | "delivered";

export interface BatchStageRecord {
  id: string;
  stage: BatchStage;
  weight_kg: number;
  notes?: string;
  created_at: string;
  weight_loss_pct?: number;
  operator_name?: string;
}

export interface Buyer {
  id: string;
  name: string;
  destination: string;
  contact_email?: string;
  contract_ref?: string;
}

export interface Batch {
  id: string;
  name: string;
  variety?: string;
  current_stage: BatchStage;
  created_at: string;
  updated_at?: string;
  stages: BatchStageRecord[];
  buyer?: Buyer;
  total_initial_weight_kg?: number;
  current_weight_kg?: number;
  linked_lots?: HarvestLot[];
}

export interface PayrollEntry {
  id: string;
  worker_id: string;
  worker_name: string;
  total_kg: number;
  rate_per_kg: number;
  total_amount: number;
  high_grade_kg?: number;
  medium_grade_kg?: number;
  low_grade_kg?: number;
  bonus?: number;
}

export interface PayrollRun {
  id: string;
  period_start: string;
  period_end: string;
  entries: PayrollEntry[];
  total_amount: number;
  total_kg?: number;
  total_workers?: number;
  status: "draft" | "processed" | "paid";
  created_at: string;
}

export interface Garden {
  id: string;
  name: string;
  location: string;
  elevation_m: number;
  active_workers: number;
  total_yield_kg: number;
}

export interface DashboardKPIs {
  total_yield_today_kg: number;
  yield_change_pct: number;
  active_workers_count: number;
  workers_change_pct: number;
  avg_quality_score: number;
  quality_change_pct: number;
  grade_distribution: QualitySummary[];
  recent_lots: HarvestLot[];
}
