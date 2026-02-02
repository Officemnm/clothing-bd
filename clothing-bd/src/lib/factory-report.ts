import * as cheerio from 'cheerio';
import { getValidERPCookie } from './erp-cookie';

export interface BuyerInputSummary {
  buyerName: string;
  sewingInput: number;
}

export interface FactoryReportResult {
  success: boolean;
  buyerSummary: BuyerInputSummary[];
  totalSewingInput: number;
  message?: string;
}

/**
 * Fetch factory monthly production report and extract buyer-wise sewing input
 * Uses the same day for both start and end date (single day report)
 */
export async function fetchFactoryReport(date: string): Promise<FactoryReportResult> {
  try {
    // Get ERP cookie for authentication
    const erpCookie = await getValidERPCookie();
    if (!erpCookie) {
      console.log('[Factory Report] No valid ERP cookie');
      return {
        success: false,
        buyerSummary: [],
        totalSewingInput: 0,
        message: 'No valid ERP cookie'
      };
    }

    const url = 'http://180.92.235.190:8022/erp/production/reports/requires/factory_monthly_production_report_controller_chaity.php';
    
    // Format date with quotes like Python code does
    const formattedDate = `'${date}'`;
    
    // Exact payload structure from Python code
    const formData = new URLSearchParams();
    formData.append('action', 'report_generate');
    formData.append('cbo_working_company_id', "'2'");
    formData.append('cbo_location', "''");
    formData.append('cbo_production_process', "'0'");
    formData.append('cbo_buyer_name', "'0'");
    formData.append('cbo_floor_group_name', "'0'");
    formData.append('cbo_floor', "''");
    formData.append('cbo_year', "'0'");
    formData.append('txt_job_no', "''");
    formData.append('txt_style_ref', "''");
    formData.append('txt_po_no', "''");
    formData.append('txt_date_from', formattedDate);
    formData.append('txt_date_to', formattedDate);
    formData.append('report_title', '❏ Factory Monthly Production Report');
    formData.append('type', '3');
    formData.append('datediff', '1');

    console.log('[Factory Report] Fetching for date:', date);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': erpCookie,
        'Referer': 'http://180.92.235.190:8022/erp/production/reports/factory_monthly_production_report_chaity.php?permission=1_1_1_1',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.log('[Factory Report] HTTP error:', response.status);
      return {
        success: false,
        buyerSummary: [],
        totalSewingInput: 0,
        message: `HTTP error: ${response.status}`
      };
    }

    const html = await response.text();
    console.log('[Factory Report] HTML length:', html.length);
    
    // Check if redirected to login
    if (html.includes('login.php') && html.length < 500) {
      console.log('[Factory Report] Session expired - redirected to login');
      return {
        success: false,
        buyerSummary: [],
        totalSewingInput: 0,
        message: 'Session expired'
      };
    }
    
    return parseFactoryReportHTML(html);

  } catch (error) {
    console.error('Factory report fetch error:', error);
    return {
      success: false,
      buyerSummary: [],
      totalSewingInput: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse factory report HTML to extract buyer-wise sewing input
 * Following exact logic from Python code:
 * - Rows must have at least 8 columns
 * - Buyer name is in column index 1
 * - Sewing input is in column index 7
 */
function parseFactoryReportHTML(html: string): FactoryReportResult {
  try {
    const $ = cheerio.load(html);
    
    const buyerSummary: BuyerInputSummary[] = [];
    let totalSewingInput = 0;

    // Find all table rows
    $('tr').each((_, row) => {
      const cols = $(row).find('td');
      
      // Data row must have at least 8 columns
      if (cols.length < 8) {
        return; // continue
      }
      
      const col0Text = $(cols[0]).text().trim(); // SL or Grand Total
      const buyerName = $(cols[1]).text().trim(); // Buyer name
      const sewingInputText = $(cols[7]).text().trim(); // Sewing Input (index 7)
      
      // Handle Grand Total row
      if (col0Text.includes('Grand Total') || buyerName.includes('Grand Total')) {
        const cleanInput = sewingInputText.replace(/,/g, '');
        const value = parseInt(cleanInput);
        if (!isNaN(value)) {
          totalSewingInput = value;
          console.log('[Factory Report] Grand Total:', value);
        }
        return; // continue
      }
      
      // Skip header rows
      if (buyerName.includes('Buyer') || col0Text === 'SL' || !buyerName) {
        return; // continue
      }
      
      // Validate sewing input is a number
      const cleanInput = sewingInputText.replace(/,/g, '').replace(/%/g, '');
      if (!/^\d+$/.test(cleanInput)) {
        return; // continue if not a valid number
      }
      
      const sewingInput = parseInt(cleanInput);
      
      // Add to buyer summary
      const existingBuyer = buyerSummary.find(b => b.buyerName === buyerName);
      if (existingBuyer) {
        existingBuyer.sewingInput += sewingInput;
      } else {
        buyerSummary.push({
          buyerName,
          sewingInput
        });
      }
    });

    // Sort by sewing input descending
    buyerSummary.sort((a, b) => b.sewingInput - a.sewingInput);
    
    // Always calculate total from buyer summary
    const calculatedTotal = buyerSummary.reduce((sum, b) => sum + b.sewingInput, 0);
    console.log('[Factory Report] Calculated Total from buyers:', calculatedTotal);
    
    // Use calculated total if Grand Total was 0 or not found
    if (totalSewingInput === 0) {
      totalSewingInput = calculatedTotal;
    }
    
    console.log('[Factory Report] Found', buyerSummary.length, 'buyers, Final Total:', totalSewingInput);

    return {
      success: buyerSummary.length > 0,
      buyerSummary,
      totalSewingInput
    };

  } catch (error) {
    console.error('Factory report parse error:', error);
    return {
      success: false,
      buyerSummary: [],
      totalSewingInput: 0,
      message: 'Failed to parse HTML'
    };
  }
}
