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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createFilter = (id: string): any => ({ _id: id });

// Parse date helper (DD-MM-YYYY to Date object)
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);
  try {
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
      const parts = dateStr.split('-');
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
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

  history.forEach((item: HistoryItem) => {
    if (item.type === 'Closing Report') closingCount++;
    if (item.type === 'PO Sheet') poCount++;
    if (item.type === 'Accessories') accessoriesHistoryCount++;
  });

  // Sort history by date and time (newest first)
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    // Sort by time if same date
    return (b.time || '').localeCompare(a.time || '');
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

  // Generate last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const label = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    
    labels.push(label);
    
    let closing = 0;
    let po = 0;
    let acc = 0;

    history.forEach((item: HistoryItem) => {
      let itemDate = item.date;
      // Convert DD-MM-YYYY to YYYY-MM-DD
      if (itemDate && itemDate.includes('-') && itemDate.split('-')[0].length === 2) {
        const parts = itemDate.split('-');
        itemDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      if (itemDate === dateStr) {
        if (item.type === 'Closing Report') closing++;
        if (item.type === 'PO Sheet') po++;
        if (item.type === 'Accessories') acc++;
      }
    });

    closingData.push(closing);
    poData.push(po);
    accessoriesData.push(acc);
  }

  return {
    labels,
    closing: closingData,
    po: poData,
    accessories: accessoriesData,
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

// Update stats when closing report is generated
export async function updateClosingStats(
  username: string,
  refNo: string,
  status: 'success' | 'failed' = 'success'
): Promise<void> {
  const statsCol = await getCollection(COLLECTIONS.STATS);
  
  const now = new Date();
  const newRecord = {
    ref: refNo,
    user: username,
    date: now.toISOString().split('T')[0],
    display_date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type: 'Closing Report',
    iso_time: now.toISOString(),
    status,
  };
  
  // Get current stats
  const statsRecord = await statsCol.findOne(createFilter('dashboard_stats')) as { data: StatsData } | null;
  const downloads = statsRecord?.data?.downloads || [];

  // Add to beginning
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
