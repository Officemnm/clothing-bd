import * as cheerio from 'cheerio';
import { getValidERPCookie } from './erp-cookie';

interface ReportBlock {
  style: string;
  buyer: string;
  color: string;
  headers: string[];
  gmts_qty: string[];
  plus_3_percent: string[];
  sewing_input: string[];
  cutting_qc: string[];
}

/**
 * Get authenticated session cookie from ERP
 * Uses the centralized cookie management system
 */
async function getAuthenticatedSession(): Promise<string | null> {
  // Use the centralized ERP cookie system
  return await getValidERPCookie();
}

export async function fetchClosingReportData(internalRefNo: string): Promise<ReportBlock[] | null> {
  const cookies = await getAuthenticatedSession();
  if (!cookies) return null;

  const reportUrl = process.env.ERP_REPORT_URL!;
  const years = ['2026', '2025', '2024', '2023'];
  const companyIds = [1, 2, 3, 4, 5];
  // Try with location '2' first, then fallback to '0' if no data found
  const locationParams = ['2', '0'];

  let foundData: string | null = null;

  for (const locationValue of locationParams) {
    for (const year of years) {
      for (const companyId of companyIds) {
        const formData = new URLSearchParams();
        formData.append('action', 'report_generate');
        formData.append('cbo_wo_company_name', locationValue);
        formData.append('cbo_location_name', locationValue);
        formData.append('cbo_floor_id', '0');
        formData.append('cbo_buyer_name', '0');
        formData.append('txt_internal_ref_no', internalRefNo);
        formData.append('reportType', '3');
        formData.append('cbo_year_selection', year);
        formData.append('cbo_company_name', companyId.toString());

        try {
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
            if (!text.includes('Data not Found') && text.length > 500) {
              foundData = text;
              break;
            }
          }
        } catch {
          continue;
        }
      }
      if (foundData) break;
    }
    if (foundData) break;
  }

  if (foundData) {
    return parseReportData(foundData);
  }
  return null;
}

function parseReportData(htmlContent: string): ReportBlock[] | null {
  const allReportData: ReportBlock[] = [];

  try {
    const $ = cheerio.load(htmlContent);
    
    // Get headers
    const headerRow = $('thead tr').eq(1);
    const headers: string[] = [];
    headerRow.find('th').each((_: number, th: cheerio.Element) => {
      const text = $(th).text().trim();
      if (!text.toLowerCase().includes('total')) {
        headers.push(text);
      }
    });

    // Get data rows
    const dataRows = $('div#scroll_body table tbody tr');
    const itemBlocks: cheerio.Element[][] = [];
    let currentBlock: cheerio.Element[] = [];

    dataRows.each((_: number, row: cheerio.Element) => {
      const bgColor = $(row).attr('bgcolor');
      if (bgColor === '#cddcdc') {
        if (currentBlock.length > 0) {
          itemBlocks.push(currentBlock);
        }
        currentBlock = [];
      } else {
        currentBlock.push(row);
      }
    });
    if (currentBlock.length > 0) {
      itemBlocks.push(currentBlock);
    }

    for (const block of itemBlocks) {
      let style = 'N/A';
      let color = 'N/A';
      let buyerName = 'N/A';
      let gmtsQtyData: string[] = [];
      let sewingInputData: string[] = [];
      let cuttingQcData: string[] = [];

      for (const row of block) {
        const cells = $(row).find('td');
        if (cells.length > 2) {
          const criteriaMain = $(cells[0]).text().trim();
          const criteriaSub = $(cells[2]).text().trim();
          const mainLower = criteriaMain.toLowerCase();
          const subLower = criteriaSub.toLowerCase();

          if (mainLower === 'style') {
            style = $(cells[1]).text().trim();
          } else if (mainLower === 'color & gmts. item') {
            color = $(cells[1]).text().trim();
          } else if (mainLower.includes('buyer')) {
            buyerName = $(cells[1]).text().trim();
          }

          if (subLower === 'gmts. color /country qty') {
            gmtsQtyData = [];
            for (let i = 3; i < Math.min(cells.length, headers.length + 3); i++) {
              gmtsQtyData.push($(cells[i]).text().trim());
            }
          }

          if (mainLower.includes('sewing input')) {
            sewingInputData = [];
            for (let i = 1; i < Math.min(cells.length, headers.length + 1); i++) {
              sewingInputData.push($(cells[i]).text().trim());
            }
          } else if (subLower.includes('sewing input')) {
            sewingInputData = [];
            for (let i = 3; i < Math.min(cells.length, headers.length + 3); i++) {
              sewingInputData.push($(cells[i]).text().trim());
            }
          }

          if (mainLower.includes('cutting qc') && !mainLower.includes('balance')) {
            cuttingQcData = [];
            for (let i = 1; i < Math.min(cells.length, headers.length + 1); i++) {
              cuttingQcData.push($(cells[i]).text().trim());
            }
          } else if (subLower.includes('cutting qc') && !subLower.includes('balance')) {
            cuttingQcData = [];
            for (let i = 3; i < Math.min(cells.length, headers.length + 3); i++) {
              cuttingQcData.push($(cells[i]).text().trim());
            }
          }
        }
      }

      if (gmtsQtyData.length > 0) {
        const plus3PercentData: string[] = [];
        for (const value of gmtsQtyData) {
          try {
            const numValue = parseInt(value.replace(/,/g, ''));
            const newQty = Math.round(numValue * 1.03);
            plus3PercentData.push(newQty.toString());
          } catch {
            plus3PercentData.push(value);
          }
        }

        allReportData.push({
          style,
          buyer: buyerName,
          color,
          headers,
          gmts_qty: gmtsQtyData,
          plus_3_percent: plus3PercentData,
          sewing_input: sewingInputData,
          cutting_qc: cuttingQcData,
        });
      }
    }

    return allReportData.length > 0 ? allReportData : null;
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

export function calculateMetrics(block: ReportBlock, index: number) {
  const actual = parseInt((block.gmts_qty[index] || '0').replace(/,/g, '')) || 0;
  const qty3 = Math.round(actual * 1.03);
  const cuttingQc = parseInt((block.cutting_qc[index] || '0').replace(/,/g, '')) || 0;
  const inputQty = parseInt((block.sewing_input[index] || '0').replace(/,/g, '')) || 0;
  const balance = cuttingQc - inputQty;
  const shortPlus = inputQty - qty3;
  const percentage = qty3 > 0 ? ((shortPlus / qty3) * 100) : 0;

  return { actual, qty3, cuttingQc, inputQty, balance, shortPlus, percentage };
}

export function calculateTotals(block: ReportBlock) {
  let tot3 = 0, totAct = 0, totCut = 0, totInp = 0;

  for (let i = 0; i < block.headers.length; i++) {
    const metrics = calculateMetrics(block, i);
    tot3 += metrics.qty3;
    totAct += metrics.actual;
    totCut += metrics.cuttingQc;
    totInp += metrics.inputQty;
  }

  const totBal = totCut - totInp;
  const totSp = totInp - tot3;
  const totPct = tot3 > 0 ? ((totSp / tot3) * 100) : 0;

  return { tot3, totAct, totCut, totInp, totBal, totSp, totPct };
}
