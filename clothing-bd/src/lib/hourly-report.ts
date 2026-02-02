import * as cheerio from 'cheerio';
import { getValidERPCookie } from './erp-cookie';

// ============ Types ============
export interface TimeSlotData {
  slot1: number; // 8:00 AM - 12:45 PM
  slot2: number; // 12:45 PM - 5:00 PM
  slot3: number; // 5:00 PM - 9:00 PM
  total: number;
}

export interface LineData {
  lineNo: string;
  buyer: string;
  timeSlots: TimeSlotData;
}

export interface FloorData {
  floorName: string;
  lines: LineData[];
  subtotal: TimeSlotData;
}

export interface BuyerSummary {
  buyerName: string;
  totalInput: number;
}

export interface HourlyReportResult {
  success: boolean;
  date: string;
  floors: FloorData[];
  buyerSummary: BuyerSummary[];
  grandTotal: TimeSlotData;
  targetLine?: string;
  message?: string;
  currentSlot?: string;
}

// Raw data types for snapshot
export interface RawLineData {
  lineNo: string;
  buyer: string;
  totalInput: number;
}

export interface RawFloorData {
  floorName: string;
  lines: RawLineData[];
  subtotal: number;
}

export interface RawReportResult {
  success: boolean;
  date: string;
  floors: RawFloorData[];
  grandTotal: number;
  message?: string;
}

// Snapshot types
export interface LineSnapshot {
  lineNo: string;
  buyer: string;
  totalInput: number;
}

export interface FloorSnapshot {
  floorName: string;
  lines: LineSnapshot[];
  subtotal: number;
}

export interface HourlySnapshot {
  date: string;
  slot: 'slot1' | 'slot2' | 'slot3';
  capturedAt: Date;
  floors: FloorSnapshot[];
  grandTotal: number;
}

// ============ Configuration ============
const ERP_HOURLY_REPORT_URL = 'http://180.92.235.190:8022/erp/production/reports/requires/company_wise_hourly_production_monitoring_chaity_v2_controller.php';

/**
 * Format date string for ERP API
 */
function formatDateForERP(dateInput: string): string {
  const cleanDate = dateInput.replace(/['"]/g, '').trim();
  return `'${cleanDate}'`;
}

/**
 * Create empty time slot data
 */
function createEmptyTimeSlots(): TimeSlotData {
  return { slot1: 0, slot2: 0, slot3: 0, total: 0 };
}

/**
 * Parse the HTML response and extract RAW total input data per line
 * This returns current cumulative totals without time slot breakdown
 */
function parseRawInputHTML(htmlContent: string): RawReportResult {
  const $ = cheerio.load(htmlContent);
  
  const floors: RawFloorData[] = [];
  let grandTotal = 0;
  
  const tableBody = $('#table_body');
  if (!tableBody.length) {
    return {
      success: false,
      date: '',
      floors: [],
      grandTotal: 0,
      message: 'Data table not found'
    };
  }

  const rows = tableBody.find('tr');
  
  let currentFloorName = '';
  let currentFloorLines: RawLineData[] = [];
  let currentFloorSubtotal = 0;
  let foundAnyData = false;

  rows.each((_index: number, row: cheerio.Element) => {
    const $row = $(row);
    const text = $row.text().trim();
    const cols = $row.find('td');

    // 1. Detect floor name
    if (text.includes('Floor Name:')) {
      // Save previous floor if exists
      if (currentFloorName && currentFloorLines.length > 0) {
        floors.push({
          floorName: currentFloorName,
          lines: [...currentFloorLines],
          subtotal: currentFloorSubtotal
        });
      }
      
      currentFloorName = text.replace('Floor Name:', '').trim();
      currentFloorLines = [];
      currentFloorSubtotal = 0;
      return;
    }

    // 2. Skip header rows
    if (text.includes('Company Name') || text.includes('Line No')) {
      return;
    }

    // 3. Process line data
    if (cols.length > 10) {
      const lineNo = $(cols[0]).text().trim();
      
      // Skip empty lines
      if (!lineNo) {
        return;
      }

      // Extract buyer name (column index 1)
      const buyerName = $(cols[1]).text().trim() || 'Unknown';

      // Get total input (5th column from end)
      let totalInput = 0;
      try {
        const inputStr = $(cols[cols.length - 5]).text().trim();
        totalInput = parseInt(inputStr) || 0;
      } catch {
        totalInput = 0;
      }

      currentFloorLines.push({
        lineNo,
        buyer: buyerName,
        totalInput
      });
      
      currentFloorSubtotal += totalInput;
      grandTotal += totalInput;
      foundAnyData = true;
    }
  });

  // Save last floor
  if (currentFloorName && currentFloorLines.length > 0) {
    floors.push({
      floorName: currentFloorName,
      lines: [...currentFloorLines],
      subtotal: currentFloorSubtotal
    });
  }

  if (!foundAnyData) {
    return {
      success: false,
      date: '',
      floors: [],
      grandTotal: 0,
      message: 'No data found for this date.'
    };
  }

  return {
    success: true,
    date: '',
    floors,
    grandTotal
  };
}

/**
 * Fetch raw input data from ERP (total input without time slots)
 * This is used for snapshot capture and real-time report generation
 */
export async function fetchRawInputData(inputDate: string): Promise<RawReportResult> {
  // Get authenticated cookie
  const cookies = await getValidERPCookie();
  if (!cookies) {
    return {
      success: false,
      date: inputDate,
      floors: [],
      grandTotal: 0,
      message: 'ERP authentication failed. Please try again.'
    };
  }

  const headers = {
    'Host': '180.92.235.190:8022',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'http://180.92.235.190:8022/erp/production/reports/company_wise_hourly_production_monitoring_chaity_v2.php?permission=1_1_1_1',
    'Cookie': cookies
  };

  const formattedDate = formatDateForERP(inputDate);

  const formData = new URLSearchParams({
    'action': 'report_generate2',
    'type': '1',
    'cbo_company_id': '2',
    'cbo_location_id': '',
    'cbo_floor_id': '',
    'cbo_line': '',
    'hidden_line_id': '',
    'cbo_buyer_name': '0',
    'txt_date': formattedDate,
    'txt_parcentage': '60',
    'cbo_no_prod_type': '1',
    'cbo_shift_name': '0',
    'report_title': 'Hourly Production Monitoring Report'
  });

  try {
    const response = await fetch(ERP_HOURLY_REPORT_URL, {
      method: 'POST',
      headers,
      body: formData.toString()
    });

    if (!response.ok) {
      return {
        success: false,
        date: inputDate,
        floors: [],
        grandTotal: 0,
        message: `Server error: ${response.status}`
      };
    }

    const htmlContent = await response.text();

    // Check for "No Line Engage" message
    if (htmlContent.includes('No Line Engage')) {
      return {
        success: false,
        date: inputDate,
        floors: [],
        grandTotal: 0,
        message: 'No lines engaged on this date.'
      };
    }

    const result = parseRawInputHTML(htmlContent);
    result.date = inputDate;
    
    return result;

  } catch (error) {
    console.error('Raw data fetch error:', error);
    return {
      success: false,
      date: inputDate,
      floors: [],
      grandTotal: 0,
      message: `Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get current time slot based on Bangladesh time
 */
export function getCurrentTimeSlot(): 'slot1' | 'slot2' | 'slot3' | 'before_slot1' | 'after_slot3' {
  const now = new Date();
  // Convert to Bangladesh time (UTC+6)
  const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  const hours = bdTime.getHours();
  const minutes = bdTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // 8:00 AM = 480 minutes
  // 12:45 PM = 765 minutes
  // 5:00 PM = 1020 minutes
  // 9:00 PM = 1260 minutes

  if (currentMinutes < 480) {
    return 'before_slot1'; // Before 8 AM
  } else if (currentMinutes < 765) {
    return 'slot1'; // 8:00 AM - 12:45 PM
  } else if (currentMinutes < 1020) {
    return 'slot2'; // 12:45 PM - 5:00 PM
  } else if (currentMinutes < 1260) {
    return 'slot3'; // 5:00 PM - 9:00 PM
  } else {
    return 'after_slot3'; // After 9 PM
  }
}

/**
 * Calculate slot value based on current raw data and previous snapshot
 */
function calculateSlotValue(currentValue: number, previousSnapshot: number): number {
  const diff = currentValue - previousSnapshot;
  return diff > 0 ? diff : 0;
}

/**
 * Get line input from snapshot
 */
function getLineInputFromSnapshot(
  snapshot: HourlySnapshot | null, 
  floorName: string, 
  lineNo: string
): number {
  if (!snapshot) return 0;
  const floor = snapshot.floors.find(f => f.floorName === floorName);
  if (!floor) return 0;
  const line = floor.lines.find(l => l.lineNo === lineNo);
  return line ? line.totalInput : 0;
}

/**
 * Generate hourly report using saved snapshots and current data
 * This is the main function for displaying the report
 */
export async function fetchHourlyReport(
  inputDate: string,
  targetLine?: string,
  snapshots?: {
    slot1: HourlySnapshot | null;
    slot2: HourlySnapshot | null;
    slot3: HourlySnapshot | null;
  }
): Promise<HourlyReportResult> {
  const currentSlot = getCurrentTimeSlot();
  
  // Fetch current raw data from ERP
  const rawData = await fetchRawInputData(inputDate);
  
  if (!rawData.success) {
    return {
      success: false,
      date: inputDate,
      floors: [],
      buyerSummary: [],
      grandTotal: createEmptyTimeSlots(),
      message: rawData.message,
      currentSlot
    };
  }

  // Default empty snapshots if not provided
  const snapshotData = snapshots || { slot1: null, slot2: null, slot3: null };

  const floors: FloorData[] = [];
  let grandTotal = createEmptyTimeSlots();
  const buyerMap = new Map<string, number>();

  for (const rawFloor of rawData.floors) {
    const lines: LineData[] = [];
    let floorSubtotal = createEmptyTimeSlots();

    for (const rawLine of rawFloor.lines) {
      // Filter by target line if specified
      if (targetLine && targetLine.toLowerCase() !== rawLine.lineNo.toLowerCase()) {
        continue;
      }

      const currentTotal = rawLine.totalInput;
      const slot1Snapshot = getLineInputFromSnapshot(snapshotData.slot1, rawFloor.floorName, rawLine.lineNo);
      const slot2Snapshot = getLineInputFromSnapshot(snapshotData.slot2, rawFloor.floorName, rawLine.lineNo);
      const slot3Snapshot = getLineInputFromSnapshot(snapshotData.slot3, rawFloor.floorName, rawLine.lineNo);

      let slot1 = 0, slot2 = 0, slot3 = 0;

      // Calculate slot values based on current time and available snapshots
      if (currentSlot === 'before_slot1') {
        // Before 8 AM - no data yet
        slot1 = 0;
        slot2 = 0;
        slot3 = 0;
      } else if (currentSlot === 'slot1') {
        // During 8 AM - 12:45 PM
        // Show current cumulative as slot1 (in progress)
        slot1 = currentTotal;
        slot2 = 0;
        slot3 = 0;
      } else if (currentSlot === 'slot2') {
        // During 12:45 PM - 5:00 PM
        if (snapshotData.slot1) {
          // Slot1 finished - use ONLY saved slot1 data (not current ERP)
          slot1 = slot1Snapshot;
          // Calculate slot2 as current - slot1 snapshot
          slot2 = calculateSlotValue(currentTotal, slot1Snapshot);
        } else {
          // No slot1 snapshot available - show current as slot1
          slot1 = currentTotal;
          slot2 = 0;
        }
        slot3 = 0;
      } else if (currentSlot === 'slot3') {
        // During 5:00 PM - 9:00 PM
        if (snapshotData.slot2) {
          // Both slot1 and slot2 finished
          slot1 = slot1Snapshot;
          slot2 = calculateSlotValue(slot2Snapshot, slot1Snapshot);
          slot3 = calculateSlotValue(currentTotal, slot2Snapshot);
        } else if (snapshotData.slot1) {
          // Only slot1 finished
          slot1 = slot1Snapshot;
          slot2 = calculateSlotValue(currentTotal, slot1Snapshot);
          slot3 = 0;
        } else {
          slot1 = currentTotal;
          slot2 = 0;
          slot3 = 0;
        }
      } else {
        // After 9 PM - use all saved snapshots
        if (snapshotData.slot3) {
          slot1 = slot1Snapshot;
          slot2 = calculateSlotValue(slot2Snapshot, slot1Snapshot);
          slot3 = calculateSlotValue(slot3Snapshot, slot2Snapshot);
        } else if (snapshotData.slot2) {
          slot1 = slot1Snapshot;
          slot2 = calculateSlotValue(slot2Snapshot, slot1Snapshot);
          slot3 = calculateSlotValue(currentTotal, slot2Snapshot);
        } else if (snapshotData.slot1) {
          slot1 = slot1Snapshot;
          slot2 = calculateSlotValue(currentTotal, slot1Snapshot);
          slot3 = 0;
        } else {
          slot1 = currentTotal;
          slot2 = 0;
          slot3 = 0;
        }
      }

      const timeSlots: TimeSlotData = {
        slot1,
        slot2,
        slot3,
        total: slot1 + slot2 + slot3  // Use calculated slots sum, not raw ERP data
      };

      lines.push({
        lineNo: rawLine.lineNo,
        buyer: rawLine.buyer,
        timeSlots
      });

      floorSubtotal.slot1 += slot1;
      floorSubtotal.slot2 += slot2;
      floorSubtotal.slot3 += slot3;
      floorSubtotal.total += (slot1 + slot2 + slot3);  // Use calculated sum

      // Update buyer summary - use calculated total
      const lineTotal = slot1 + slot2 + slot3;
      const currentBuyerTotal = buyerMap.get(rawLine.buyer) || 0;
      buyerMap.set(rawLine.buyer, currentBuyerTotal + lineTotal);
    }

    if (lines.length > 0) {
      floors.push({
        floorName: rawFloor.floorName,
        lines,
        subtotal: floorSubtotal
      });

      grandTotal.slot1 += floorSubtotal.slot1;
      grandTotal.slot2 += floorSubtotal.slot2;
      grandTotal.slot3 += floorSubtotal.slot3;
      grandTotal.total += floorSubtotal.total;
    }
  }

  // Convert buyer map to array
  const buyerSummary: BuyerSummary[] = Array.from(buyerMap.entries())
    .map(([buyerName, totalInput]) => ({ buyerName, totalInput }))
    .sort((a, b) => b.totalInput - a.totalInput);

  if (floors.length === 0) {
    return {
      success: false,
      date: inputDate,
      floors: [],
      buyerSummary: [],
      grandTotal: createEmptyTimeSlots(),
      targetLine,
      message: targetLine 
        ? `Line '${targetLine}' not found or has no input data.`
        : 'No data found for this date.',
      currentSlot
    };
  }

  return {
    success: true,
    date: inputDate,
    floors,
    buyerSummary,
    grandTotal,
    targetLine,
    currentSlot
  };
}

/**
 * Get today's date in DD-MMM-YYYY format
 */
export function getTodayDateFormatted(): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = months[today.getMonth()];
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
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
