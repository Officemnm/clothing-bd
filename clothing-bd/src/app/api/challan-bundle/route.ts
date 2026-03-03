import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getValidERPCookie } from '@/lib/erp-cookie';

const BUNDLE_URL = process.env.ERP_BUNDLE_CONTROLLER_URL || '';
const ERP_LOGIN_URL = process.env.ERP_LOGIN_URL || '';

/**
 * GET /api/challan-bundle
 * Proxy endpoint to fetch bundle details from ERP
 * Returns the ERP page HTML so the user doesn't need to login to ERP directly
 * 
 * Query params:
 * - companyId: Company ID (required)
 * - systemId: System ID (required)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const systemId = searchParams.get('systemId');

    if (!companyId || !systemId) {
      return NextResponse.json(
        { success: false, message: 'companyId and systemId are required' },
        { status: 400 }
      );
    }

    // Get valid ERP cookie from the shared cookie management system
    const cookie = await getValidERPCookie();
    if (!cookie) {
      return NextResponse.json(
        { success: false, message: 'ERP authentication failed' },
        { status: 500 }
      );
    }

    // Fetch bundle details from ERP
    const dataParam = `${companyId}*${systemId}*3*%E2%9D%8F%20Bundle%20Wise%20Sewing%20Input*undefined*undefined*undefined*1`;
    const params = new URLSearchParams();
    params.append('data', dataParam);
    params.append('action', 'sewing_input_challan_print_5');

    const bundleResponse = await fetch(`${BUNDLE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!bundleResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch bundle details from ERP' },
        { status: 502 }
      );
    }

    let html = await bundleResponse.text();

    // Derive ERP base URL from login URL for loading relative resources
    const erpBaseUrl = ERP_LOGIN_URL ? ERP_LOGIN_URL.replace(/\/login\.php$/, '/') : '';
    if (erpBaseUrl) {
      html = html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${erpBaseUrl}">`
      );

      // If no <head> tag exists, prepend the base tag
      if (!html.includes('<base')) {
        html = `<base href="${erpBaseUrl}">` + html;
      }
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Challan bundle proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
