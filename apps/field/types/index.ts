export type QualityGrade = 'high' | 'medium' | 'low';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  worker_id?: string;
  name?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface HarvestLotOffline {
  id: string;              // local UUID
  session_id: string;
  worker_id: string;
  weight_kg: number;
  grade: QualityGrade;
  confidence: number;
  image_path?: string;    // local file path
  synced: boolean;
  created_at: string;     // ISO string
  sync_attempts: number;
}

export interface GradeResult {
  grade: QualityGrade;
  confidence: number;
  scores: {
    high_quality: number;
    medium_quality: number;
    low_quality: number;
  };
  inference_ms: number;
}

export interface SyncQueueItem {
  id: string;
  endpoint: string;
  method: string;
  payload: string;        // JSON stringified
  attempts: number;
  last_attempt?: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
}

export interface SyncHistoryEntry {
  id?: string;
  timestamp: string;
  synced: number;
  failed: number;
  details?: string;
}

export interface HarvestStats {
  totalLots: number;
  totalWeight: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export type LotFilter = 'all' | 'pending' | 'synced';
