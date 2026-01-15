// Accessories Challan Management Library
// Matches app.py logic exactly

import { connectToDatabase } from './mongodb';

export interface Challan {
  date: string;
  line: string;
  color: string;
  size: string;
  qty: number;
}

export interface AccessoryBooking {
  ref: string;
  buyer: string;
  style: string;
  colors: string[];
  challans: Challan[];
  lastApiCall: string;
}

export interface AccessoryBookingSummary {
  ref: string;
  buyer: string;
  style: string;
  challanCount: number;
  totalQty: number;
  lastUpdated: string;
}

// Load all accessories data from MongoDB
export async function loadAccessoriesDb(): Promise<Record<string, AccessoryBooking>> {
  const { db } = await connectToDatabase();
  const record = await db.collection('accessories').findOne({ _id: 'accessories_data' as unknown as import('mongodb').ObjectId });
  if (record && record.data) {
    return record.data;
  }
  return {};
}

// Save accessories data to MongoDB
export async function saveAccessoriesDb(data: Record<string, AccessoryBooking>): Promise<void> {
  const { db } = await connectToDatabase();
  await db.collection('accessories').replaceOne(
    { _id: 'accessories_data' as unknown as import('mongodb').ObjectId },
    { _id: 'accessories_data' as unknown as import('mongodb').ObjectId, data },
    { upsert: true }
  );
}

// Get all bookings summary (for list view)
export async function getAllAccessoriesBookings(): Promise<AccessoryBookingSummary[]> {
  const dbAcc = await loadAccessoriesDb();
  const bookings: AccessoryBookingSummary[] = [];
  
  for (const [ref, data] of Object.entries(dbAcc)) {
    const challanCount = data.challans?.length || 0;
    const totalQty = (data.challans || []).reduce((sum, c) => sum + (Number(c.qty) || 0), 0);
    
    bookings.push({
      ref,
      buyer: data.buyer || 'N/A',
      style: data.style || 'N/A',
      challanCount,
      totalQty,
      lastUpdated: data.lastApiCall || 'N/A',
    });
  }
  
  // Sort by ref descending
  bookings.sort((a, b) => b.ref.localeCompare(a.ref));
  return bookings;
}

// Get single booking
export async function getAccessoryBooking(ref: string): Promise<AccessoryBooking | null> {
  const dbAcc = await loadAccessoriesDb();
  const data = dbAcc[ref];
  if (!data) return null;
  return { ...data, ref };
}

// Create or update booking from ERP data
export async function createOrUpdateBooking(
  ref: string,
  erpData: { style: string; buyer: string; colors: string[] }
): Promise<AccessoryBooking> {
  const dbAcc = await loadAccessoriesDb();
  
  if (!dbAcc[ref]) {
    dbAcc[ref] = {
      ref,
      style: erpData.style,
      buyer: erpData.buyer,
      colors: erpData.colors,
      challans: [],
      lastApiCall: new Date().toISOString(),
    };
  } else {
    // Update colors and metadata
    dbAcc[ref].colors = erpData.colors;
    dbAcc[ref].style = erpData.style;
    dbAcc[ref].buyer = erpData.buyer;
    dbAcc[ref].lastApiCall = new Date().toISOString();
  }
  
  await saveAccessoriesDb(dbAcc);
  return { ...dbAcc[ref], ref };
}

// Add challan to booking
export async function addChallan(
  ref: string,
  challan: Omit<Challan, 'date'>,
  customDate?: string
): Promise<AccessoryBooking | null> {
  const dbAcc = await loadAccessoriesDb();
  
  if (!dbAcc[ref]) return null;
  
  // Use custom date or format current date as DD-MM-YYYY (Bangladesh format)
  let dateStr = customDate;
  if (!dateStr) {
    const now = new Date();
    dateStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-');
  }
  
  dbAcc[ref].challans.push({
    date: dateStr,
    line: challan.line,
    color: challan.color,
    size: challan.size,
    qty: Number(challan.qty),
  });
  
  await saveAccessoriesDb(dbAcc);
  return { ...dbAcc[ref], ref };
}

// Update/Edit challan in booking
export async function updateChallan(
  ref: string,
  index: number,
  challan: Challan
): Promise<AccessoryBooking | null> {
  const dbAcc = await loadAccessoriesDb();
  
  if (!dbAcc[ref] || !dbAcc[ref].challans[index]) return null;
  
  dbAcc[ref].challans[index] = {
    date: challan.date,
    line: challan.line,
    color: challan.color,
    size: challan.size,
    qty: Number(challan.qty),
  };
  
  await saveAccessoriesDb(dbAcc);
  return { ...dbAcc[ref], ref };
}

// Delete challan from booking
export async function deleteChallan(ref: string, index: number): Promise<AccessoryBooking | null> {
  const dbAcc = await loadAccessoriesDb();
  
  if (!dbAcc[ref] || !dbAcc[ref].challans[index]) return null;
  
  dbAcc[ref].challans.splice(index, 1);
  await saveAccessoriesDb(dbAcc);
  return { ...dbAcc[ref], ref };
}

// Delete entire booking
export async function deleteBooking(ref: string): Promise<boolean> {
  const dbAcc = await loadAccessoriesDb();
  
  if (!dbAcc[ref]) return false;
  
  delete dbAcc[ref];
  await saveAccessoriesDb(dbAcc);
  return true;
}

// Update stats when accessory action happens
export async function updateAccessoriesStats(
  username: string,
  refNo: string,
  actionType: string = 'Updated'
): Promise<void> {
  const { db } = await connectToDatabase();
  
  const now = new Date();
  const newRecord = {
    ref: refNo,
    user: username,
    date: now.toISOString().split('T')[0],
    display_date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    type: 'Accessories',
    action: actionType,
    iso_time: now.toISOString(),
  };
  
  // Get current stats
  const stats = await db.collection('stats').findOne({ _id: 'stats_data' as unknown as import('mongodb').ObjectId });
  const downloads = stats?.downloads || [];

  // Add to beginning
  downloads.unshift(newRecord);

  // Keep only last 5000
  if (downloads.length > 5000) {
    downloads.length = 5000;
  }

  // Save
  await db.collection('stats').updateOne(
    { _id: 'stats_data' as unknown as import('mongodb').ObjectId },
    { $set: { downloads } },
    { upsert: true }
  );
}
