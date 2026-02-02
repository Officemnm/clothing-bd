import * as cheerio from 'cheerio';

export interface BuyerInputSummary {
  buyerName: string;
  sewingInput: number;
}

export interface FactoryReportResult {
  success: boolean;
  buyerSummary: BuyerInputSummary[];
  totalSewingInput: number;
  totalSewingOutput: number;
  totalFinishing: number;
  totalShipment: number;
  message?: string;
}

/**
 * Fetch factory monthly production report and extract buyer-wise sewing input
 */
export async function fetchFactoryReport(date: string): Promise<FactoryReportResult> {
  try {
    // Parse the date to get month and year
    const dateParts = date.split('-');
    const day = dateParts[0];
    const monthName = dateParts[1];
    const year = dateParts[2];
    
    // Convert month name to number
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    const month = monthMap[monthName] || '01';

    const url = 'http://180.92.235.190:8022/erp/production/reports/requires/factory_monthly_production_report_controller_chaity.php';
    
    const formData = new URLSearchParams();
    formData.append('month', month);
    formData.append('year', year);
    formData.append('day', day);
    formData.append('submit', 'Show');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return {
        success: false,
        buyerSummary: [],
        totalSewingInput: 0,
        totalSewingOutput: 0,
        totalFinishing: 0,
        totalShipment: 0,
        message: `HTTP error: ${response.status}`
      };
    }

    const html = await response.text();
    return parseFactoryReportHTML(html);

  } catch (error) {
    console.error('Factory report fetch error:', error);
    return {
      success: false,
      buyerSummary: [],
      totalSewingInput: 0,
      totalSewingOutput: 0,
      totalFinishing: 0,
      totalShipment: 0,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse factory report HTML to extract buyer-wise sewing input
 */
function parseFactoryReportHTML(html: string): FactoryReportResult {
  try {
    const $ = cheerio.load(html);
    
    const buyerSummary: BuyerInputSummary[] = [];
    let totalSewingInput = 0;
    let totalSewingOutput = 0;
    let totalFinishing = 0;
    let totalShipment = 0;

    // Find tables with buyer data
    $('table').each((_, table) => {
      const $table = $(table);
      
      // Look for rows with buyer names and sewing input
      $table.find('tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 4) {
          const firstCell = $(cells[0]).text().trim();
          
          // Check if this is a buyer row (not header, not total)
          if (firstCell && 
              !firstCell.toLowerCase().includes('total') && 
              !firstCell.toLowerCase().includes('buyer') &&
              !firstCell.toLowerCase().includes('sewing') &&
              !firstCell.toLowerCase().includes('date') &&
              firstCell.length > 1) {
            
            // Try to find sewing input value (usually 2nd or 3rd column)
            for (let i = 1; i < Math.min(cells.length, 5); i++) {
              const cellText = $(cells[i]).text().trim().replace(/,/g, '');
              const value = parseInt(cellText);
              if (!isNaN(value) && value > 0) {
                // Check if buyer already exists
                const existingBuyer = buyerSummary.find(b => b.buyerName === firstCell);
                if (existingBuyer) {
                  existingBuyer.sewingInput += value;
                } else {
                  buyerSummary.push({
                    buyerName: firstCell,
                    sewingInput: value
                  });
                }
                break;
              }
            }
          }
          
          // Look for total row
          if (firstCell.toLowerCase().includes('total') || firstCell.toLowerCase().includes('grand')) {
            cells.each((idx, cell) => {
              const val = parseInt($(cell).text().trim().replace(/,/g, ''));
              if (!isNaN(val)) {
                if (idx === 1) totalSewingInput = val;
                else if (idx === 2) totalSewingOutput = val;
                else if (idx === 3) totalFinishing = val;
                else if (idx === 4) totalShipment = val;
              }
            });
          }
        }
      });
    });

    // Sort by sewing input descending
    buyerSummary.sort((a, b) => b.sewingInput - a.sewingInput);

    return {
      success: true,
      buyerSummary,
      totalSewingInput,
      totalSewingOutput,
      totalFinishing,
      totalShipment
    };

  } catch (error) {
    console.error('Factory report parse error:', error);
    return {
      success: false,
      buyerSummary: [],
      totalSewingInput: 0,
      totalSewingOutput: 0,
      totalFinishing: 0,
      totalShipment: 0,
      message: 'Failed to parse HTML'
    };
  }
}
