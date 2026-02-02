import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getValidERPCookie } from '@/lib/erp-cookie';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || '02-Feb-2026';
    
    // Get ERP cookie
    const erpCookie = await getValidERPCookie();
    if (!erpCookie) {
      return NextResponse.json({ success: false, error: 'No ERP cookie' });
    }

    const url = 'http://180.92.235.190:8022/erp/production/reports/requires/factory_monthly_production_report_controller_chaity.php';
    
    // Format date with quotes like Python code
    const formattedDate = `'${date}'`;
    
    // Exact payload from Python code
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

    console.log('Fetching with date:', date);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': erpCookie,
        'Referer': 'http://180.92.235.190:8022/erp/production/reports/factory_monthly_production_report_chaity.php?permission=1_1_1_1',
      },
      body: formData.toString(),
    });

    const html = await response.text();
    
    // Parse and find tables
    const $ = cheerio.load(html);
    
    const tables: { headers: string[], rows: string[][] }[] = [];
    
    $('table').each((tableIdx, table) => {
      const $table = $(table);
      const tableData: { headers: string[], rows: string[][] } = { headers: [], rows: [] };
      
      // Get headers
      $table.find('th').each((_, th) => {
        tableData.headers.push($(th).text().trim());
      });
      
      // Get rows
      $table.find('tr').each((_, row) => {
        const rowData: string[] = [];
        $(row).find('td').each((_, td) => {
          rowData.push($(td).text().trim());
        });
        if (rowData.length > 0) {
          tableData.rows.push(rowData);
        }
      });
      
      if (tableData.rows.length > 0) {
        tables.push(tableData);
      }
    });

    return NextResponse.json({
      success: true,
      params: { month, year, day },
      htmlLength: html.length,
      tablesFound: tables.length,
      tables: tables.slice(0, 5) // First 5 tables only
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
