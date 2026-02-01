import * as cheerio from 'cheerio';
import { getValidERPCookie } from './erp-cookie';

// ============ Types ============
export interface LineData {
  lineNo: string;
  input: number;
}

export interface FloorData {
  floorName: string;
  lines: LineData[];
  subtotal: number;
}

export interface HourlyReportResult {
  success: boolean;
  date: string;
  floors: FloorData[];
  grandTotal: number;
  targetLine?: string;
  message?: string;
}

// ============ Configuration ============
const ERP_HOURLY_REPORT_URL = 'http://180.92.235.190:8022/erp/production/reports/requires/company_wise_hourly_production_monitoring_chaity_v2_controller.php';

/**
 * Format date string for ERP API
 * Input: "28-Jan-2026" or similar
 * Output: "'28-Jan-2026'"
 */
function formatDateForERP(dateInput: string): string {
  const cleanDate = dateInput.replace(/['"]/g, '').trim();
  return `'${cleanDate}'`;
}

/**
 * Parse the HTML response and extract line-wise input data
 */
function parseHourlyReportHTML(htmlContent: string, targetLine?: string): HourlyReportResult {
  const $ = cheerio.load(htmlContent);
  
  const floors: FloorData[] = [];
  let grandTotal = 0;
  
  const tableBody = $('#table_body');
  if (!tableBody.length) {
    return {
      success: false,
      date: '',
      floors: [],
      grandTotal: 0,
      message: 'ডাটা টেবিল পাওয়া যায়নি!'
    };
  }

  const rows = tableBody.find('tr');
  
  let currentFloorName = '';
  let currentFloorLines: LineData[] = [];
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
      return; // continue
    }

    // 2. Skip header rows
    if (text.includes('Company Name') || text.includes('Line No')) {
      return; // continue
    }

    // 3. Process line data
    if (cols.length > 15) {
      const lineNo = $(cols[0]).text().trim();
      
      // Skip empty lines (subtotal rows)
      if (!lineNo) {
        return; // continue
      }

      // Filter by target line if specified
      if (targetLine && targetLine.toLowerCase() !== lineNo.toLowerCase()) {
        return; // continue
      }

      // Extract input value (5th column from end)
      let inputValue = 0;
      try {
        const inputStr = $(cols[cols.length - 5]).text().trim();
        inputValue = parseInt(inputStr) || 0;
      } catch {
        inputValue = 0;
      }

      currentFloorLines.push({
        lineNo,
        input: inputValue
      });
      
      currentFloorSubtotal += inputValue;
      grandTotal += inputValue;
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
      targetLine,
      message: targetLine 
        ? `'${targetLine}' লাইনটি খুঁজে পাওয়া যায়নি বা ইনপুট নেই।`
        : 'কোনো ডাটা পাওয়া যায়নি।'
    };
  }

  return {
    success: true,
    date: '',
    floors,
    grandTotal,
    targetLine
  };
}

/**
 * Fetch hourly production monitoring report from ERP
 */
export async function fetchHourlyReport(
  inputDate: string,
  targetLine?: string
): Promise<HourlyReportResult> {
  // Get authenticated cookie
  const cookies = await getValidERPCookie();
  if (!cookies) {
    return {
      success: false,
      date: inputDate,
      floors: [],
      grandTotal: 0,
      message: 'ERP লগইন ব্যর্থ হয়েছে।'
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
        message: `সার্ভার এরর: ${response.status}`
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
        message: 'এই তারিখে কোনো লাইন এনগেজড নেই।'
      };
    }

    const result = parseHourlyReportHTML(htmlContent, targetLine);
    result.date = inputDate;
    
    return result;

  } catch (error) {
    console.error('Hourly report fetch error:', error);
    return {
      success: false,
      date: inputDate,
      floors: [],
      grandTotal: 0,
      message: `ডাটা আনতে সমস্যা হয়েছে: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
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
