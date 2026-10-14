import * as SQLite from 'expo-sqlite';
import { HarvestLotOffline, HarvestStats, LotFilter, SyncHistoryEntry, SyncQueueItem } from '../types';

const DB_NAME = 'teavision.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  try {
    const db = await getDb();
    
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS harvest_lots_offline (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        grade TEXT NOT NULL,
        confidence REAL NOT NULL,
        image_path TEXT,
        synced INTEGER NOT NULL DEFAULT 0,
        sync_attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'POST',
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        synced INTEGER NOT NULL,
        failed INTEGER NOT NULL,
        details TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_lots_synced ON harvest_lots_offline(synced);
      CREATE INDEX IF NOT EXISTS idx_lots_created ON harvest_lots_offline(created_at);
      CREATE INDEX IF NOT EXISTS idx_queue_attempts ON sync_queue(attempts);
    `);
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    throw error;
  }
}

interface RawLotRow {
  id: string;
  session_id: string;
  worker_id: string;
  weight_kg: number;
  grade: 'high' | 'medium' | 'low';
  confidence: number;
  image_path: string | null;
  synced: number;
  sync_attempts: number;
  created_at: string;
}

function mapRowToLot(row: RawLotRow): HarvestLotOffline {
  return {
    id: row.id,
    session_id: row.session_id,
    worker_id: row.worker_id,
    weight_kg: Number(row.weight_kg),
    grade: row.grade,
    confidence: Number(row.confidence),
    image_path: row.image_path ?? undefined,
    synced: row.synced === 1,
    sync_attempts: Number(row.sync_attempts),
    created_at: row.created_at,
  };
}

export async function insertLotOffline(lot: HarvestLotOffline): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO harvest_lots_offline 
       (id, session_id, worker_id, weight_kg, grade, confidence, image_path, synced, sync_attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      lot.id,
      lot.session_id,
      lot.worker_id,
      lot.weight_kg,
      lot.grade,
      lot.confidence,
      lot.image_path ?? null,
      lot.synced ? 1 : 0,
      lot.sync_attempts ?? 0,
      lot.created_at
    );
  } catch (error) {
    console.error('[DB] insertLotOffline error:', error);
    throw error;
  }
}

export async function getPendingLots(): Promise<HarvestLotOffline[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<RawLotRow>(
      `SELECT * FROM harvest_lots_offline 
       WHERE synced = 0 
       ORDER BY datetime(created_at) ASC`
    );
    return rows.map(mapRowToLot);
  } catch (error) {
    console.error('[DB] getPendingLots error:', error);
    return [];
  }
}

export async function markLotSynced(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `UPDATE harvest_lots_offline 
       SET synced = 1 
       WHERE id = ?`,
      id
    );
  } catch (error) {
    console.error('[DB] markLotSynced error:', error);
    throw error;
  }
}

export async function incrementSyncAttempt(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `UPDATE harvest_lots_offline 
       SET sync_attempts = sync_attempts + 1 
       WHERE id = ?`,
      id
    );
  } catch (error) {
    console.error('[DB] incrementSyncAttempt error:', error);
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM harvest_lots_offline WHERE synced = 0`
    );
    return result?.count ?? 0;
  } catch (error) {
    console.error('[DB] getPendingCount error:', error);
    return 0;
  }
}

export async function getAllLots(limit = 100): Promise<HarvestLotOffline[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<RawLotRow>(
      `SELECT * FROM harvest_lots_offline 
       ORDER BY datetime(created_at) DESC 
       LIMIT ?`,
      limit
    );
    return rows.map(mapRowToLot);
  } catch (error) {
    console.error('[DB] getAllLots error:', error);
    return [];
  }
}

export async function getLotsFiltered(filter: LotFilter = 'all', limit = 100): Promise<HarvestLotOffline[]> {
  try {
    const db = await getDb();
    let sql = `SELECT * FROM harvest_lots_offline`;
    const params: (string | number)[] = [];

    if (filter === 'pending') {
      sql += ` WHERE synced = 0`;
    } else if (filter === 'synced') {
      sql += ` WHERE synced = 1`;
    }

    sql += ` ORDER BY datetime(created_at) DESC LIMIT ?`;
    params.push(limit);

    const rows = await db.getAllAsync<RawLotRow>(sql, ...params);
    return rows.map(mapRowToLot);
  } catch (error) {
    console.error('[DB] getLotsFiltered error:', error);
    return [];
  }
}

export async function getTodayStats(): Promise<HarvestStats> {
  try {
    const db = await getDb();
    // Today in local YYYY-MM-DD
    const now = new Date();
    const todayPrefix = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const rows = await db.getAllAsync<{
      weight_kg: number;
      grade: string;
    }>(
      `SELECT weight_kg, grade FROM harvest_lots_offline 
       WHERE created_at LIKE ?`,
      `${todayPrefix}%`
    );

    let totalWeight = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const r of rows) {
      totalWeight += Number(r.weight_kg) || 0;
      if (r.grade === 'high') highCount++;
      else if (r.grade === 'medium') mediumCount++;
      else if (r.grade === 'low') lowCount++;
    }

    return {
      totalLots: rows.length,
      totalWeight: Math.round(totalWeight * 10) / 10,
      highCount,
      mediumCount,
      lowCount,
    };
  } catch (error) {
    console.error('[DB] getTodayStats error:', error);
    return {
      totalLots: 0,
      totalWeight: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };
  }
}

export async function deleteLot(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM harvest_lots_offline WHERE id = ?`, id);
  } catch (error) {
    console.error('[DB] deleteLot error:', error);
    throw error;
  }
}

export async function recordSyncHistory(entry: {
  synced: number;
  failed: number;
  details?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO sync_history (timestamp, synced, failed, details)
       VALUES (?, ?, ?, ?)`,
      now,
      entry.synced,
      entry.failed,
      entry.details ?? null
    );
  } catch (error) {
    console.error('[DB] recordSyncHistory error:', error);
  }
}

export async function getSyncHistory(limit = 10): Promise<SyncHistoryEntry[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: number;
      timestamp: string;
      synced: number;
      failed: number;
      details: string | null;
    }>(
      `SELECT * FROM sync_history 
       ORDER BY datetime(timestamp) DESC 
       LIMIT ?`,
      limit
    );
    return rows.map((r) => ({
      id: String(r.id),
      timestamp: r.timestamp,
      synced: r.synced,
      failed: r.failed,
      details: r.details ?? undefined,
    }));
  } catch (error) {
    console.error('[DB] getSyncHistory error:', error);
    return [];
  }
}

export async function enqueueSync(item: {
  endpoint: string;
  method?: string;
  payload: string;
}): Promise<void> {
  try {
    const db = await getDb();
    const id = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.runAsync(
      `INSERT INTO sync_queue (id, endpoint, method, payload, attempts)
       VALUES (?, ?, ?, ?, 0)`,
      id,
      item.endpoint,
      item.method ?? 'POST',
      item.payload
    );
  } catch (error) {
    console.error('[DB] enqueueSync error:', error);
  }
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string;
      endpoint: string;
      method: string;
      payload: string;
      attempts: number;
      last_attempt: string | null;
    }>(
      `SELECT * FROM sync_queue WHERE attempts < 5 ORDER BY id ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      method: r.method,
      payload: r.payload,
      attempts: r.attempts,
      last_attempt: r.last_attempt ?? undefined,
    }));
  } catch (error) {
    console.error('[DB] getSyncQueue error:', error);
    return [];
  }
}

export async function removeQueueItem(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, id);
  } catch (error) {
    console.error('[DB] removeQueueItem error:', error);
  }
}
