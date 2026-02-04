import { getCollection, COLLECTIONS } from '@/lib/mongodb';

interface StatsData {
  downloads: HistoryItem[];
  last_booking: string;
}

interface HistoryItem {
  ref: string;
  user: string;
  date: string;
  display_date: string;
  time: string;
  type: string;
  iso_time?: string;
  file_count?: number;
  action?: string;
  status?: 'success' | 'failed';
}

interface AccessoryData {
  buyer: string;
  style: string;
  colors: string[];
  challans: ChallanItem[];
  last_api_call: string;
}

interface ChallanItem {
  date: string;
  line: string;
  color: string;
  size: string;
  qty: string;
}

// Report types supported in the system
export type ReportType = 
  | 'Closing Report' 
  | 'PO Sheet' 
  | 'Accessories' 
  | 'Challan Report' 
  | 'Hourly Report' 
  | 'Sewing Closing Report';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createFilter = (id: string): any => ({ _id: id });

// Get current time in Bangladesh timezone (UTC+6)
function getBangladeshTime(): Date {
  // Create date in Bangladesh timezone
  const now = new Date();
  // Convert to Bangladesh time by adding 6 hours to UTC
  const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
  return bdTime;
}

// Format date as DD-MM-YYYY for Bangladesh time
function formatDateBD(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Parse date helper (DD-MM-YYYY to Date object)
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  try {
    // Handle DD-MM-YYYY format
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
      const parts = dateStr.split('-');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    // Handle YYYY-MM-DD format (ISO)
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
      const parts = dateStr.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(dateStr);
  } catch {
    return new Date(0);
  }
}

export async function getDashboardStats() {
  const statsCol = await getCollection(COLLECTIONS.STATS);
  const usersCol = await getCollection(COLLECTIONS.USERS);
  const accessoriesCol = await getCollection(COLLECTIONS.ACCESSORIES);

  // Get stats
  const statsRecord = await statsCol.findOne(createFilter('dashboard_stats')) as { data: StatsData } | null;
  const stats = statsRecord?.data || { downloads: [], last_booking: 'None' };

  // Get users count
  const usersRecord = await usersCol.findOne(createFilter('global_users'));
  const users = (usersRecord as { data?: Record<string, unknown> })?.data || {};
  const usersCount = Object.keys(users).length;

  // Get accessories count
  const accessoriesRecord = await accessoriesCol.findOne(createFilter('accessories_data')) as { data: Record<string, AccessoryData> } | null;
  const accessories = accessoriesRecord?.data || {};
  let accessoriesCount = 0;
  
  Object.values(accessories).forEach((item: AccessoryData) => {
    accessoriesCount += item.challans?.length || 0;
  });

  // Calculate counts from history
  const history = stats.downloads || [];
  let closingCount = 0;
  let poCount = 0;
  let accessoriesHistoryCount = 0;
  let challanCount = 0;
  let hourlyCount = 0;
  let sewingClosingCount = 0;

  history.forEach((item: HistoryItem) => {
    if (item.type === 'Closing Report') closingCount++;
    if (item.type === 'PO Sheet') poCount++;
    if (item.type === 'Accessories') accessoriesHistoryCount++;
    if (item.type === 'Challan Report') challanCount++;
    if (item.type === 'Hourly Report') hourlyCount++;
    if (item.type === 'Sewing Closing Report') sewingClosingCount++;
  });

  // Sort history by iso_time (newest first) for accurate sorting
  const sortedHistory = [...history].sort((a, b) => {
    // Prefer iso_time for accurate sorting
    if (a.iso_time && b.iso_time) {
      return new Date(b.iso_time).getTime() - new Date(a.iso_time).getTime();
    }
    // Fallback to date + time comparison
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    // Sort by time if same date (handle both 12h and 24h formats)
    const timeA = a.time || '00:00:00';
    const timeB = b.time || '00:00:00';
    return timeB.localeCompare(timeA);
  });

  // Get chart data (last 7 days)
  const chartData = generateChartData(history);
  
  // Get user usage data
  const userUsage = generateUserUsage(history);

  return {
    users: { count: usersCount },
    accessories: { count: accessoriesCount > 0 ? accessoriesCount : accessoriesHistoryCount },
    closing: { count: closingCount },
    po: { count: poCount },
    challan: { count: challanCount },
    hourly: { count: hourlyCount },
    sewingClosing: { count: sewingClosingCount },
    history: sortedHistory.slice(0, 100), // Return last 100 items sorted
    chart: chartData,
    userUsage,
  };
}

function generateChartData(history: HistoryItem[]) {
  const labels: string[] = [];
  const closingData: number[] = [];
  const poData: number[] = [];
  const accessoriesData: number[] = [];
  const challanData: number[] = [];
  const hourlyData: number[] = [];
  const sewingClosingData: number[] = [];

  // Generate last 7 days in Bangladesh timezone
  for (let i = 6; i >= 0; i--) {
    const bdNow = getBangladeshTime();
    bdNow.setDate(bdNow.getDate() - i);
    const dateStr = formatDateBD(bdNow); // DD-MM-YYYY format
    const label = bdNow.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    labels.push(label);
    
    let closing = 0;
    let po = 0;
    let acc = 0;
    let challan = 0;
    let hourly = 0;
    let sewingClosing = 0;

    history.forEach((item: HistoryItem) => {
      let itemDate = item.date;
      // Normalize to DD-MM-YYYY format for comparison
      if (itemDate && itemDate.includes('-') && itemDate.split('-')[0].length === 4) {
        // Convert YYYY-MM-DD to DD-MM-YYYY
        const parts = itemDate.split('-');
        itemDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      if (itemDate === dateStr) {
        if (item.type === 'Closing Report') closing++;
        else if (item.type === 'PO Sheet') po++;
        else if (item.type === 'Accessories') acc++;
        else if (item.type === 'Challan Report') challan++;
        else if (item.type === 'Hourly Report') hourly++;
        else if (item.type === 'Sewing Closing Report') sewingClosing++;
      }
    });

    closingData.push(closing);
    poData.push(po);
    accessoriesData.push(acc);
    challanData.push(challan);
    hourlyData.push(hourly);
    sewingClosingData.push(sewingClosing);
  }

  return {
    labels,
    closing: closingData,
    po: poData,
    accessories: accessoriesData,
    challan: challanData,
    hourly: hourlyData,
    sewingClosing: sewingClosingData,
  };
}

export async function getRecentActivity(limit = 50) {
  const statsCol = await getCollection(COLLECTIONS.STATS);
  const statsRecord = await statsCol.findOne(createFilter('dashboard_stats')) as { data: StatsData } | null;
  const stats = statsRecord?.data || { downloads: [] };
  
  return stats.downloads.slice(0, limit);
}

function generateUserUsage(history: HistoryItem[]) {
  const userMap: Record<string, { closing: number; po: number; accessories: number; total: number }> = {};
  
  history.forEach((item: HistoryItem) => {
    const user = item.user || 'Unknown';
    if (!userMap[user]) {
      userMap[user] = { closing: 0, po: 0, accessories: 0, total: 0 };
    }
    
    if (item.type === 'Closing Report') userMap[user].closing++;
    else if (item.type === 'PO Sheet') userMap[user].po++;
    else if (item.type === 'Accessories') userMap[user].accessories++;
    
    userMap[user].total++;
  });
  
  return Object.entries(userMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// Generic function to add a record to the history
export async function addHistoryRecord(
  username: string,
  type: ReportType,
  ref: string,
  status: 'success' | 'failed',
  details: Record<string, unknown> = {}
): Promise<void> {
  const statsCol = await getCollection(COLLECTIONS.STATS);
  
  // Use Bangladesh timezone for all date/time
  const bdTime = getBangladeshTime();
  const newRecord: HistoryItem = {
    ref,
    user: username,
    date: formatDateBD(bdTime), // DD-MM-YYYY format for consistency
    display_date: bdTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: bdTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
    type,
    iso_time: new Date().toISOString(), // Keep ISO time for accurate sorting
    status,
    ...details,
  };
  
  // Get current stats
  const statsRecord = await statsCol.findOne(createFilter('dashboard_stats')) as { data: StatsData } | null;
  const downloads = statsRecord?.data?.downloads || [];

  // Add to beginning (newest first)
  downloads.unshift(newRecord);

  // Keep only last 5000
  if (downloads.length > 5000) {
    downloads.length = 5000;
  }

  // Save
  await statsCol.updateOne(
    createFilter('dashboard_stats'),
    { $set: { 'data.downloads': downloads } },
    { upsert: true }
  );
}

// Update stats when closing report is generated
export async function updateClosingStats(
  username: string,
  refNo: string,
  status: 'success' | 'failed' = 'success'
): Promise<void> {
  await addHistoryRecord(username, 'Closing Report', refNo, status);
}

// Update stats when challan report is generated
export async function updateChallanStats(
  username: string,
  booking: string,
  status: 'success' | 'failed' = 'success'
): Promise<void> {
  await addHistoryRecord(username, 'Challan Report', booking, status);
}

// Update stats when hourly report is generated
export async function updateHourlyStats(
  username: string,
  date: string,
  status: 'success' | 'failed' = 'success',
  line?: string
): Promise<void> {
  const ref = line ? `${date} (Line ${line})` : date;
  await addHistoryRecord(username, 'Hourly Report', ref, status);
}

// Update stats when sewing closing report is generated
export async function updateSewingClosingStats(
  username: string,
  refNo: string,
  status: 'success' | 'failed' = 'success'
): Promise<void> {
  await addHistoryRecord(username, 'Sewing Closing Report', refNo, status);
}
