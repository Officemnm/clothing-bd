import { getCollection, COLLECTIONS } from './mongodb';
import { fetchRawInputData, HourlySnapshot, FloorSnapshot, RawFloorData } from './hourly-report';

// ============ Types ============
export interface SnapshotConfig {
  _id?: string;
  slot1Time: string; // "12:45" - 24hr format
  slot2Time: string; // "17:00"
  slot3Time: string; // "21:00"
  timezone: string; // "Asia/Dhaka"
  updatedAt?: Date;
}

// Re-export types
export type { HourlySnapshot, FloorSnapshot };

// ============ Default Config ============
const DEFAULT_CONFIG: SnapshotConfig = {
  slot1Time: '12:45',
  slot2Time: '17:00',
  slot3Time: '21:00',
  timezone: 'Asia/Dhaka'
};

/**
 * Get snapshot configuration from database
 */
export async function getSnapshotConfig(): Promise<SnapshotConfig> {
  try {
    const collection = await getCollection('snapshot_config');
    const config = await collection.findOne<SnapshotConfig>({});
    return config || DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Update snapshot configuration
 */
export async function updateSnapshotConfig(config: Partial<SnapshotConfig>): Promise<boolean> {
  try {
    const collection = await getCollection('snapshot_config');
    await collection.updateOne(
      {},
      { $set: { ...config, updatedAt: new Date() } },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('Failed to update snapshot config:', error);
    return false;
  }
}

/**
 * Convert raw floor data to snapshot format
 */
function convertToSnapshot(
  date: string,
  slot: 'slot1' | 'slot2' | 'slot3',
  rawFloors: RawFloorData[],
  grandTotal: number
): HourlySnapshot {
  const floors: FloorSnapshot[] = rawFloors.map(floor => ({
    floorName: floor.floorName,
    lines: floor.lines.map(line => ({
      lineNo: line.lineNo,
      buyer: line.buyer,
      totalInput: line.totalInput
    })),
    subtotal: floor.subtotal
  }));

  return {
    date,
    slot,
    capturedAt: new Date(),
    floors,
    grandTotal
  };
}

/**
 * Save a snapshot to database
 */
export async function saveSnapshot(snapshot: HourlySnapshot): Promise<boolean> {
  try {
    const collection = await getCollection(COLLECTIONS.HOURLY_SNAPSHOTS);
    
    // Upsert - replace if exists for same date and slot
    await collection.updateOne(
      { date: snapshot.date, slot: snapshot.slot },
      { $set: snapshot },
      { upsert: true }
    );
    
    console.log(`Snapshot saved: ${snapshot.date} - ${snapshot.slot}`);
    return true;
  } catch (error) {
    console.error('Failed to save snapshot:', error);
    return false;
  }
}

/**
 * Get snapshot from database
 */
export async function getSnapshot(date: string, slot: 'slot1' | 'slot2' | 'slot3'): Promise<HourlySnapshot | null> {
  try {
    const collection = await getCollection(COLLECTIONS.HOURLY_SNAPSHOTS);
    const snapshot = await collection.findOne<HourlySnapshot>({ date, slot });
    return snapshot;
  } catch (error) {
    console.error('Failed to get snapshot:', error);
    return null;
  }
}

/**
 * Get all snapshots for a date
 */
export async function getAllSnapshotsForDate(date: string): Promise<{
  slot1: HourlySnapshot | null;
  slot2: HourlySnapshot | null;
  slot3: HourlySnapshot | null;
}> {
  try {
    const collection = await getCollection(COLLECTIONS.HOURLY_SNAPSHOTS);
    const snapshots = await collection.find<HourlySnapshot>({ date }).toArray();
    
    return {
      slot1: snapshots.find(s => s.slot === 'slot1') || null,
      slot2: snapshots.find(s => s.slot === 'slot2') || null,
      slot3: snapshots.find(s => s.slot === 'slot3') || null
    };
  } catch (error) {
    console.error('Failed to get snapshots:', error);
    return { slot1: null, slot2: null, slot3: null };
  }
}

/**
 * Capture and save snapshot for current time slot
 * This is called by the cron job
 */
export async function captureAndSaveSnapshot(
  date: string,
  slot: 'slot1' | 'slot2' | 'slot3'
): Promise<{ success: boolean; message: string; grandTotal?: number }> {
  try {
    // Fetch raw data from ERP
    const rawData = await fetchRawInputData(date);
    
    if (!rawData.success) {
      return { success: false, message: rawData.message || 'Failed to fetch data from ERP' };
    }

    // Convert to snapshot format
    const snapshot = convertToSnapshot(date, slot, rawData.floors, rawData.grandTotal);

    // Save to database
    const saved = await saveSnapshot(snapshot);
    
    if (!saved) {
      return { success: false, message: 'Failed to save snapshot to database' };
    }

    return { 
      success: true, 
      message: `Snapshot captured for ${date} ${slot} with ${rawData.grandTotal} total input`,
      grandTotal: rawData.grandTotal
    };
  } catch (error) {
    console.error('Capture snapshot error:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Get today's date in DD-MMM-YYYY format using Bangladesh timezone
 */
export function getTodayDateBD(): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const day = String(bdTime.getDate()).padStart(2, '0');
  const month = months[bdTime.getMonth()];
  const year = bdTime.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Delete old snapshots (older than specified days)
 */
export async function deleteOldSnapshots(daysToKeep: number = 30): Promise<number> {
  try {
    const collection = await getCollection(COLLECTIONS.HOURLY_SNAPSHOTS);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await collection.deleteMany({
      capturedAt: { $lt: cutoffDate }
    });
    
    return result.deletedCount;
  } catch (error) {
    console.error('Failed to delete old snapshots:', error);
    return 0;
  }
}
