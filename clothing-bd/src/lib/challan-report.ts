/**
 * Challan Wise Input Report Library
 * 
 * This module handles:
 * - Fetching challan-wise production data from ERP
 * - Parsing HTML response and extracting data
 * - Grouping data by challan and summing quantities
 */

import { getValidERPCookie } from './erp-cookie';

// ERP URL from environment variable
const ERP_CHALLAN_REPORT_URL = process.env.ERP_CHALLAN_REPORT_URL;

export interface ChallanData {
  challanNo: string;
  date: string;
  buyer: string;
  style: string;
  company: string;
  totalQty: number;
}

export interface ChallanReportResult {
  success: boolean;
  message: string;
  data?: ChallanData[];
  grandTotal?: number;
  companyId?: number;
}

/**
 * Parse HTML response and extract challan data
 */
function parseAndSumChallans(htmlContent: string, companyId: number): ChallanReportResult {
  // Check if table exists
  if (!htmlContent.includes('tbl_list_search')) {
    return { success: false, message: 'No data table found' };
  }

  // Check for empty tbody
  if (htmlContent.replace(/\s/g, '').includes('<tbody></tbody>') || 
      htmlContent.replace(/\s/g, '').includes('<tbodyid="tbl_list_search"></tbody>')) {
    return { success: false, message: 'Empty table' };
  }

  // Parse HTML using regex (since we're in Node.js without DOM)
  const tbodyMatch = htmlContent.match(/<tbody[^>]*id="tbl_list_search"[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch || !tbodyMatch[1]) {
    return { success: false, message: 'Could not parse table body' };
  }

  const tbodyContent = tbodyMatch[1];
  const rowMatches = tbodyContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  
  if (!rowMatches || rowMatches.length === 0) {
    return { success: false, message: 'No rows found' };
  }

  // Data storage - Map challan to aggregated data
  const challanMap: Map<string, ChallanData> = new Map();

  for (const row of rowMatches) {
    // Extract all td elements
    const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!tdMatches || tdMatches.length < 13) continue;

    // Extract text content from td
    const getText = (td: string): string => {
      return td.replace(/<[^>]*>/g, '').trim();
    };

    // Column indices based on Python script
    const challanNo = getText(tdMatches[3]);
    const buyer = getText(tdMatches[4]);
    const style = getText(tdMatches[7]);
    const servingCompany = getText(tdMatches[10]);
    const qtyText = getText(tdMatches[11]);
    const dateTime = getText(tdMatches[12]);

    // Parse quantity (remove commas and convert to number)
    const qty = parseInt(qtyText.replace(/,/g, '').trim()) || 0;

    // Aggregate by challan
    if (challanMap.has(challanNo)) {
      const existing = challanMap.get(challanNo)!;
      existing.totalQty += qty;
    } else {
      challanMap.set(challanNo, {
        challanNo,
        date: dateTime,
        buyer,
        style,
        company: servingCompany,
        totalQty: qty,
      });
    }
  }

  if (challanMap.size === 0) {
    return { success: false, message: 'No valid data parsed' };
  }

  // Convert map to array and calculate grand total
  const data = Array.from(challanMap.values());
  const grandTotal = data.reduce((sum, item) => sum + item.totalQty, 0);

  return {
    success: true,
    message: `Data found (Company ID: ${companyId})`,
    data,
    grandTotal,
    companyId,
  };
}

/**
 * Fetch report from ERP for a specific company
 */
async function fetchReportForCompany(
  cookie: string,
  booking: string,
  companyId: number
): Promise<string | null> {
  if (!ERP_CHALLAN_REPORT_URL) {
    console.error('[Challan Report] ERP_CHALLAN_REPORT_URL not configured');
    return null;
  }

  const formData = new URLSearchParams();
  formData.append('action', 'report_generate');
  formData.append('cbo_company_name', String(companyId));
  formData.append('cbo_buyer_name', '0');
  formData.append('txt_job_no', '');
  formData.append('txt_order_no', '');
  formData.append('txt_file_no', '');
  formData.append('txt_challan_no', '');
  formData.append('txt_internal_ref', booking);
  formData.append('txt_date_from', '');
  formData.append('txt_date_to', '');

  try {
    const response = await fetch(ERP_CHALLAN_REPORT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch (error) {
    console.error(`[Challan Report] Error fetching company ${companyId}:`, error);
    return null;
  }
}

/**
 * Fetch challan wise input report
 * Tries companies 1-4 and returns first successful result
 */
export async function fetchChallanReport(booking: string): Promise<ChallanReportResult> {
  // Get valid ERP cookie
  const cookie = await getValidERPCookie();
  if (!cookie) {
    return {
      success: false,
      message: 'ERP authentication failed. Please try again later.',
    };
  }

  // Try companies 1-4
  for (let companyId = 1; companyId <= 4; companyId++) {
    console.log(`[Challan Report] Checking company ${companyId}...`);
    
    const htmlContent = await fetchReportForCompany(cookie, booking, companyId);
    
    if (htmlContent && htmlContent.includes('tbl_list_search')) {
      const result = parseAndSumChallans(htmlContent, companyId);
      if (result.success) {
        console.log(`[Challan Report] Data found in company ${companyId}`);
        return result;
      }
    }
  }

  return {
    success: false,
    message: 'No data found in any company. Please verify the booking number.',
  };
}
