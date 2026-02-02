import { NextRequest, NextResponse } from 'next/server';
import { getValidERPCookie } from '@/lib/erp-cookie';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refNo = searchParams.get('ref') || '502/2600';
    
    const cookies = await getValidERPCookie();
    if (!cookies) {
      return NextResponse.json({ error: 'No cookie' });
    }

    // Use exact URL from Python script
    const reportUrl = 'http://180.92.235.190:8022/erp/production/reports/requires/sewing_input_and_output_report_controller.php';
    
    // Try 2026 first, then 2025 (like Python script)
    const years = ['2026', '2025'];

    for (const year of years) {
      // Use exact parameters from Python script
      const formData = new URLSearchParams();
      formData.append('action', 'generate_report');
      formData.append('cbo_company_name', '0');
      formData.append('cbo_year', year);
      formData.append('cbo_wo_company_name', '2');
      formData.append('txt_int_ref', refNo);
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

      const text = await response.text();
      
      // Check for "Color Total" like Python script
      if (text && text.includes('Color Total')) {
        console.log(`[Debug] Found data for year=${year}`);
        return new NextResponse(text, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }
    
    return new NextResponse('Data not found for 2026 or 2025', {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
