/**
 * Sewing Closing Report Data Fetcher
 * 
 * Fetches sewing input and output report data from ERP
 * 
 * Based on Python script logic:
 * - Parse color name from row containing "Size" and "Total"
 * - Parse sizes from "Size" to "Total"
 * - Color Qty row = Order Quantity
 * - Color Total row = Input values + Output values + Rejection (last value)
 * - WIP = (Input - Output) - Rejection
 * 
 * Note: Size-wise rejection and wip show "-" (value = -1), only totals have actual values
 */

import * as cheerio from 'cheerio';
import { getValidERPCookie } from './erp-cookie';

interface SewingSizeData {
  size: string;
  orderQty: number;
  inputQty: number;
  outputQty: number;
  rejection: number;  // -1 means show "-"
  wip: number;        // -1 means show "-"
}

interface SewingReportBlock {
  color: string;
  sizes: SewingSizeData[];
  totals: {
    totOrderQty: number;
    totInputQty: number;
    totOutputQty: number;
    totRejection: number;
    totWip: number;
  };
}

interface SewingReportResult {
  success: boolean;
  data: SewingReportBlock[];
  refNo: string;
  meta: {
    buyer: string;
    style: string;
    item: string;
  };
}

/**
 * Get authenticated session cookie from ERP
 */
async function getAuthenticatedSession(): Promise<string | null> {
  return await getValidERPCookie();
}

/**
 * Clean text by removing commas and trimming
 */
function cleanText(text: string): string {
  return text.replace(/,/g, '').trim();
}

/**
 * Fetch sewing input/output report data from ERP
 */
export async function fetchSewingClosingReportData(internalRefNo: string): Promise<SewingReportResult | null> {
  const cookies = await getAuthenticatedSession();
  if (!cookies) {
    console.error('[Sewing Closing] No valid ERP cookie available');
    return null;
  }

  const reportUrl = 'http://180.92.235.190:8022/erp/production/reports/requires/sewing_input_and_output_report_controller.php';

  // Try 2026 first, then 2025 (like Python script)
  const years = ['2026', '2025'];

  for (const year of years) {
    try {
      console.log(`[Sewing Closing] Trying year ${year} for ${internalRefNo}...`);
      
      const formData = new URLSearchParams();
      formData.append('action', 'generate_report');
      formData.append('cbo_company_name', '0');
      formData.append('cbo_year', year);
      formData.append('cbo_wo_company_name', '2');
      formData.append('txt_int_ref', internalRefNo);
      formData.append('type', '1');
      formData.append('report_title', '❏ Sewing Input and Output Report');

      const response = await fetch(reportUrl, {
        method: 'POST',
        headers: {
          'Host': '180.92.235.190:8022',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
          'Referer': 'http://180.92.235.190:8022/erp/production/reports/sewing_input_and_output_report.php?permission=1_1_1_1',
          'Cookie': cookies,
        },
        body: formData.toString(),
      });

      if (response.ok) {
        const text = await response.text();
        // Check if "Color Total" exists (like Python script)
        if (text && text.includes('Color Total')) {
          const parsedData = parseSewingSummary(text, internalRefNo);
          if (parsedData && parsedData.data.length > 0) {
            console.log(`[Sewing Closing] Found data for year ${year}`);
            return parsedData;
          }
        }
      }
    } catch (error) {
      console.error(`[Sewing Closing] Error fetching year ${year}:`, error);
      continue;
    }
  }

  console.log('[Sewing Closing] No data found for any year');
  return null;
}

/**
 * Parse the HTML response from ERP into structured data
 * Following Python script logic exactly
 */
function parseSewingSummary(htmlContent: string, refNo: string): SewingReportResult | null {
  try {
    const $ = cheerio.load(htmlContent);
    const tables = $('table');
    
    if (tables.length === 0) {
      return null;
    }

    const reportBlocks: SewingReportBlock[] = [];
    const seenColors = new Set<string>();
    
    // Extract meta info from header
    let buyer = 'N/A';
    let style = 'N/A';
    let item = 'N/A';

    $('td').each((_, td) => {
      const text = $(td).text().trim().toLowerCase();
      const nextTd = $(td).next('td');
      
      if (text.includes('style') && text.includes(':')) {
        style = nextTd.text().trim() || style;
      } else if (text.includes('buyer') && text.includes(':')) {
        buyer = nextTd.text().trim() || buyer;
      } else if (text.includes('item') && text.includes(':')) {
        item = nextTd.text().trim() || item;
      }
    });

    // State variables for parsing - each color block
    let currentColor = '';
    let currentSizes: string[] = [];
    let currentOrderQty = 0;
    let currentInputQty = 0;
    let currentOutputQty = 0;
    let currentRejection = 0;
    let inputSizeBreakdown: number[] = [];
    let outputSizeBreakdown: number[] = [];
    let orderSizeBreakdown: number[] = [];
    let hasColorTotal = false;

    // Function to save color block
    const saveColorBlock = () => {
      if (!currentColor || currentSizes.length === 0 || !hasColorTotal) return;
      
      // Check if already saved
      if (reportBlocks.some(b => b.color === currentColor)) return;
      
      const sizes: SewingSizeData[] = currentSizes.map((size, idx) => {
        const orderQty = orderSizeBreakdown[idx] || 0;
        const inputQty = inputSizeBreakdown[idx] || 0;
        const outputQty = outputSizeBreakdown[idx] || 0;
        
        return {
          size,
          orderQty,
          inputQty,
          outputQty,
          rejection: -1,  // -1 means show "-" in UI
          wip: -1,        // -1 means show "-" in UI
        };
      });

      // WIP calculation: (Input - Output) - Rejection (like Python script)
      const calculatedWip = (currentInputQty - currentOutputQty) - currentRejection;

      const totals = {
        totOrderQty: currentOrderQty,
        totInputQty: currentInputQty,
        totOutputQty: currentOutputQty,
        totRejection: currentRejection,
        totWip: calculatedWip,
      };

      console.log(`[Sewing Closing] Saving color: ${currentColor}, Order: ${currentOrderQty}, Input: ${currentInputQty}, Output: ${currentOutputQty}, Rejection: ${currentRejection}, WIP: ${calculatedWip}`);

      reportBlocks.push({
        color: currentColor,
        sizes,
        totals,
      });
    };

    // Reset state for new color
    const resetState = () => {
      currentColor = '';
      currentSizes = [];
      currentOrderQty = 0;
      currentInputQty = 0;
      currentOutputQty = 0;
      currentRejection = 0;
      inputSizeBreakdown = [];
      outputSizeBreakdown = [];
      orderSizeBreakdown = [];
      hasColorTotal = false;
    };

    tables.each((_, table) => {
      const rows = $(table).find('tr');
      
      rows.each((_, row) => {
        const cols = $(row).find('td');
        const rowText = $(row).text().trim();
        const colTexts = cols.map((__, c) => $(c).text().trim()).get();
        
        // ১. কালার এবং সাইজ বের করা (Row containing "Size" and "Total")
        if (rowText.includes('Size') && rowText.includes('Total')) {
          try {
            const sizeStartIndex = colTexts.findIndex(t => t === 'Size');
            if (sizeStartIndex >= 0) {
              // Find "Total" after "Size"
              let totalIndex = -1;
              for (let i = sizeStartIndex + 1; i < colTexts.length; i++) {
                if (colTexts[i] === 'Total') {
                  totalIndex = i;
                  break;
                }
              }
              
              if (totalIndex > sizeStartIndex) {
                // Extract color from text before "Size"
                let rawColor = colTexts.slice(0, sizeStartIndex).join(' ').replace('Size', '').trim();
                if (rawColor.includes('|')) {
                  rawColor = rawColor.split('|')[0].trim();
                }
                
                // Skip if empty or too short
                if (!rawColor || rawColor.length < 2) return;
                
                // Check if color already seen (skip duplicates like Python script)
                if (seenColors.has(rawColor)) {
                  return;
                }
                
                // Save previous color block before starting new one
                saveColorBlock();
                resetState();
                
                currentColor = rawColor;
                seenColors.add(currentColor);
                
                // Extract sizes from between "Size" and "Total"
                currentSizes = colTexts.slice(sizeStartIndex + 1, totalIndex).filter(s => s.trim() !== '');
                
                console.log(`[Sewing Closing] Found color: ${currentColor}, Sizes: ${currentSizes.join(', ')}`);
              }
            }
          } catch {
            return;
          }
        }
        
        // Skip if no current color
        if (!currentColor || currentSizes.length === 0) return;
        
        // ২. অর্ডার কোয়ান্টিটি (Color Qty)
        if (rowText.includes('Color Qty')) {
          const vals = colTexts.map(c => cleanText(c));
          
          // সব সংখ্যা বের করি
          const nums: number[] = [];
          for (const v of vals) {
            if (/^\d+$/.test(v)) {
              nums.push(parseInt(v) || 0);
            }
          }
          
          const numSizes = currentSizes.length;
          
          if (nums.length >= numSizes + 1) {
            // প্রথম numSizes টি = per-size order qty
            orderSizeBreakdown = nums.slice(0, numSizes);
            // পরেরটি = total order qty
            currentOrderQty = nums[numSizes];
            
            console.log(`[Sewing Closing] Color Qty for ${currentColor}: Total=${currentOrderQty}, PerSize=${orderSizeBreakdown.join(',')}`);
          }
        }
        
        // ৩. মেইন ক্যালকুলেশন (Color Total)
        if (rowText.includes('Color Total')) {
          const vals = colTexts.map(c => cleanText(c));
          
          // সংখ্যাগুলো বের করা (নেগেটিভ সহ)
          const nums: number[] = [];
          for (const v of vals) {
            if (/^-?\d+$/.test(v)) {
              nums.push(parseInt(v) || 0);
            }
          }
          
          const numSizes = currentSizes.length;
          
          // লজিক (from Python): 
          // Block 1 (Input): [Size Values...] [Total Input]
          // Block 2 (Output): [Size Values...] [Total Output]
          // End: [WIP] [Rejection] -> Rejection is LAST value
          
          // আমাদের দরকার অন্তত: (Size count * 2) + 2 (Totals)
          const minLen = (numSizes * 2) + 2;
          
          if (nums.length >= minLen) {
            // --- INPUT ---
            inputSizeBreakdown = nums.slice(0, numSizes);
            const inputTotal = nums[numSizes];
            
            // --- OUTPUT ---
            const outputStartIdx = numSizes + 1;
            outputSizeBreakdown = nums.slice(outputStartIdx, outputStartIdx + numSizes);
            const outputTotal = nums[outputStartIdx + numSizes];
            
            // --- REJECTION ---
            // শেষের সংখ্যাটি রিজেকশন (like Python script: nums[-1])
            const rejectionQty = nums[nums.length - 1];
            
            currentInputQty = inputTotal;
            currentOutputQty = outputTotal;
            currentRejection = rejectionQty;
            hasColorTotal = true;
            
            console.log(`[Sewing Closing] Color Total for ${currentColor}: Input=${inputTotal}, Output=${outputTotal}, Rejection=${rejectionQty}`);
            
            // Color Total পাওয়ার সাথে সাথে save করি
            saveColorBlock();
          }
        }
      });
    });

    // Save any remaining color block
    saveColorBlock();

    return {
      success: reportBlocks.length > 0,
      data: reportBlocks,
      refNo: refNo.toUpperCase(),
      meta: {
        buyer,
        style,
        item,
      },
    };
  } catch (error) {
    console.error('[Sewing Closing] Parse error:', error);
    return null;
  }
}
