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

    const reportUrl = process.env.ERP_SEWING_REPORT_URL!;
    const years = ['2026', '2025', '2024', '2023'];
    const companyIds = ['0', '1', '2', '3', '4', '5'];
    const woCompanyId = '2';
    const locationId = '2';

    for (const year of years) {
      for (const companyId of companyIds) {
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
        formData.append('txt_int_ref', refNo);
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

        const text = await response.text();
        
        if (text && text.length > 500 && !text.includes('Data not found') && !text.includes('Data not Found')) {
          console.log(`[Debug] Found data for year=${year}, company=${companyId}`);
          return new NextResponse(text, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      }
    }
    
    return new NextResponse('Data not found for any combination', {
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
