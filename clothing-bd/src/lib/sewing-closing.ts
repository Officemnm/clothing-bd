/**
 * Sewing Closing Report Data Fetcher
 * 
 * Fetches sewing input and output report data from ERP
 * 
 * HTML Structure Analysis:
 * - Header table contains: Style, Buyer, Int. Ref., Item
 * - PO NO row: <td colspan="24"><strong> PO NO=</strong>... (NOT a color!)
 * - Color row: <td colspan="4" rowspan="3"><strong>COLOR NAME</strong></td>
 * - Size row: Size | 3A | 4A | ... | Total | 3A | 4A | ... | Total (sizes appear TWICE - for input & output)
 * - Color Qty row: Color Qty | values (twice for input & output) - this is ORDER QTY
 * - Color Total row: Contains Input Qty (first set) and Output Qty (second set)
 * 
 * Key insight: First 7 size columns = Input data, Second 7 size columns = Output data
 */

import * as cheerio from 'cheerio';
import { getValidERPCookie } from './erp-cookie';

interface SewingSizeData {
  size: string;
  orderQty: number;
  inputQty: number;
  outputQty: number;
  rejection: number;
  wip: number;
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
 * Fetch sewing input/output report data from ERP
 */
export async function fetchSewingClosingReportData(internalRefNo: string): Promise<SewingReportResult | null> {
  const cookies = await getAuthenticatedSession();
  if (!cookies) {
    console.error('[Sewing Closing] No valid ERP cookie available');
    return null;
  }

  const reportUrl = process.env.ERP_SEWING_REPORT_URL;
  if (!reportUrl) {
    console.error('[Sewing Closing] ERP_SEWING_REPORT_URL not configured');
    return null;
  }

  const years = ['2026', '2025'];
  const companyIds = ['0', '1', '2', '3', '4', '5'];
  const woCompanyIds = ['0', '1', '2', '3', '4', '5'];
  const locationIds = ['0', '1', '2', '3', '4', '5'];

  for (const year of years) {
    for (const companyId of companyIds) {
      for (const woCompanyId of woCompanyIds) {
        for (const locationId of locationIds) {
          try {
            const formData = new URLSearchParams();
            formData.append('action', 'generate_report');
            formData.append('cbo_company_name', companyId);
            formData.append('hidden_job_id', '');
            formData.append('hidden_color_id', '');
            formData.append('cbo_year', year);
            formData.append('cbo_wo_company_name', woCompanyId);
            formData.append('cbo_location_name', locationId);
            formData.append('hidden_floor_id', '');
            formData.append('hidden_line_id', '');
            formData.append('txt_int_ref', internalRefNo);
            formData.append('type', '1');
            formData.append('report_title', 'Sewing Input and Output Report');

        const response = await fetch(reportUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookies,
          },
          body: formData.toString(),
        });

        if (response.ok) {
          const text = await response.text();
          if (text && text.length > 500 && !text.includes('No data found') && !text.includes('Data not Found') && !text.includes('Data not found')) {
            const parsedData = parseSewingReportData(text, internalRefNo);
            if (parsedData && parsedData.data.length > 0) {
              console.log(`[Sewing Closing] Found data for year ${year}, company ${companyId}, woCompany ${woCompanyId}, location ${locationId}`);
              return parsedData;
            }
          }
        }
          } catch (error) {
            continue;
          }
        }
      }
    }
  }

  console.log('[Sewing Closing] No data found for any combination');
  return null;
}

/**
 * Parse the HTML response from ERP into structured data
 */
function parseSewingReportData(htmlContent: string, refNo: string): SewingReportResult | null {
  try {
    const $ = cheerio.load(htmlContent);
    const reportBlocks: SewingReportBlock[] = [];
    
    let buyer = 'N/A';
    let style = 'N/A';
    let item = 'N/A';

    // Extract meta info from header
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

    // Find all color blocks - look for td with colspan=4 and rowspan=3 containing strong tag
    // But skip if it contains "PO NO"
    $('td[colspan="4"][rowspan="3"]').each((_, colorCell) => {
      const $colorCell = $(colorCell);
      const colorText = $colorCell.find('strong').text().trim() || $colorCell.text().trim();
      
      // Skip if this is a PO NO row or empty or too short
      if (!colorText || colorText.toLowerCase().includes('po no') || colorText.length < 3) {
        return;
      }

      // Get the parent row
      const $colorRow = $colorCell.closest('tr');
      
      // Collect rows for this color block - use ReturnType to avoid cheerio type issues
      const rows: ReturnType<typeof $>[] = [];
      let $currentRow = $colorRow;
      
      for (let i = 0; i < 30 && $currentRow.length; i++) {
        rows.push($currentRow);
        $currentRow = $currentRow.next('tr');
        
        // Check if current row is a Type A Color Total row
        // Type A has "Color Total" as an actual cell value, not just in row text
        const currentCells = $currentRow.find('td').toArray();
        const hasColorTotalCell = currentCells.some(c => 
          $(c).text().trim().toLowerCase() === 'color total'
        );
        
        if (hasColorTotalCell) {
          rows.push($currentRow);
          break;
        }
        
        // Stop if we hit another color block or PO NO
        const hasNewColor = $currentRow.find('td[colspan="4"][rowspan="3"] strong').length > 0;
        if (hasNewColor) break;
        
        // Also stop if row contains PO NO
        if ($currentRow.text().toLowerCase().includes('po no=')) break;
      }

      // Parse collected rows
      let sizeHeaders: string[] = [];
      let orderQtyValues: number[] = [];
      let inputQtyValues: number[] = [];
      let outputQtyValues: number[] = [];
      let rejectionTotal = 0;

      for (const $row of rows) {
        const rowText = $row.text();
        const rowTextLower = rowText.toLowerCase();
        const cells = $row.find('td, th').toArray();
        const cellTexts = cells.map(c => $(c).text().trim());
        
        // Size row - contains "Size" and values like 3A, 4A
        if (rowTextLower.includes('size') && cellTexts.some(t => /^\d+a$/i.test(t))) {
          // Find "Size" position and extract sizes until "Total"
          const sizeIdx = cellTexts.findIndex(t => t.toLowerCase() === 'size');
          if (sizeIdx >= 0) {
            for (let i = sizeIdx + 1; i < cellTexts.length; i++) {
              const val = cellTexts[i];
              if (val.toLowerCase() === 'total') break;
              if (val && val.length < 6 && /^[0-9]+[aA]?$/.test(val)) {
                sizeHeaders.push(val);
              }
            }
          }
          continue;
        }
        
        // Color Qty row - ORDER QTY (first numeric row)
        if (rowTextLower.includes('color qty') && orderQtyValues.length === 0) {
          // Find numeric cells and take first set (up to sizeHeaders.length)
          const numCells = cells.filter(c => /^[\d,]+$/.test($(c).text().trim().replace(/,/g, '')));
          const numSizes = sizeHeaders.length || 7;
          orderQtyValues = numCells.slice(0, numSizes).map(c => 
            parseInt($(c).text().trim().replace(/,/g, '')) || 0
          );
          continue;
        }
        
        // Color Total row - contains both Input and Output totals
        // Structure: [empty][empty][Color Total][Input1]...[Input7][InputTotal][Output1]...[Output7][OutputTotal][Rejection][empty]
        // There are two types of Color Total rows:
        // Type A (21 cells): Has "Color Total" text - ["","","Color Total", numbers...]
        // Type B (19 cells): No "Color Total" text - [numbers only...]
        // We want Type A which has the complete structure
        if (rowTextLower.includes('color total')) {
          // Check if this row has "Color Total" as a cell value (Type A)
          const allCellTexts = cells.map(c => $(c).text().trim());
          const hasColorTotalCell = allCellTexts.some(t => t.toLowerCase() === 'color total');
          
          // Skip Type B rows (which don't have "Color Total" cell)
          if (!hasColorTotalCell) {
            continue;
          }
          
          // Get all cell values as numbers, filter out non-numeric and empty
          const allCellValues: number[] = [];
          for (const c of cells) {
            const t = $(c).text().trim().replace(/,/g, '');
            // Must be numeric and not empty
            if (t && /^\d+$/.test(t)) {
              allCellValues.push(parseInt(t) || 0);
            }
          }
          
          const numSizes = sizeHeaders.length || 7;
          
          // Analyze the structure to find correct indices
          // Looking at raw cells: ['', '', 'Color Total', '0', '', '503', '1,033', ...]
          // Numeric values: [0, 503, 1033, 1053, 1426, 1882, 1717, 1260, 8874, 499, 1029, 1050, ...]
          // Structure: [ExtraZero][Input1..7][InputTotal][Output1..7][OutputTotal][ExtraZero/WIP][Rejection]
          
          // Skip the first 0 if present (it's an extra column before input)
          let startIdx = 0;
          if (allCellValues[0] === 0 && allCellValues.length > numSizes * 2 + 3) {
            startIdx = 1; // Skip the leading 0
          }
          
          // First numSizes values = Input Qty per size
          inputQtyValues = allCellValues.slice(startIdx, startIdx + numSizes);
          
          // Skip input total (position startIdx + numSizes)
          // Next numSizes values = Output Qty per size
          const outputStartIdx = startIdx + numSizes + 1;
          outputQtyValues = allCellValues.slice(outputStartIdx, outputStartIdx + numSizes);
          
          // Rejection is after output total and possible extra 0
          // Look for the last meaningful value before empty/0 at the end
          const afterOutputTotal = outputStartIdx + numSizes + 1;
          if (allCellValues.length > afterOutputTotal) {
            // Could be: [OutputTotal][0][Rejection] or [OutputTotal][Rejection]
            const remaining = allCellValues.slice(afterOutputTotal);
            // Rejection is typically the last non-zero value or the value after a 0
            if (remaining.length >= 2 && remaining[0] === 0) {
              rejectionTotal = remaining[1] || 0;
            } else if (remaining.length >= 1) {
              rejectionTotal = remaining[0] || 0;
            }
          }
          
          continue;
        }
      }

      // Build size data if we have valid data
      if (sizeHeaders.length > 0 && (orderQtyValues.length > 0 || inputQtyValues.length > 0)) {
        const sizes: SewingSizeData[] = sizeHeaders.map((size, idx) => {
          const orderQty = orderQtyValues[idx] || 0;
          const inputQty = inputQtyValues[idx] || 0;
          const outputQty = outputQtyValues[idx] || 0;
          const wip = inputQty - outputQty;
          
          return {
            size,
            orderQty,
            inputQty,
            outputQty,
            rejection: 0,
            wip: wip > 0 ? wip : 0,
          };
        });

        const totals = {
          totOrderQty: sizes.reduce((sum, s) => sum + s.orderQty, 0),
          totInputQty: sizes.reduce((sum, s) => sum + s.inputQty, 0),
          totOutputQty: sizes.reduce((sum, s) => sum + s.outputQty, 0),
          totRejection: rejectionTotal,
          totWip: sizes.reduce((sum, s) => sum + s.wip, 0),
        };

        reportBlocks.push({
          color: colorText,
          sizes,
          totals,
        });
      }
    });

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
