/**
 * Color Wise Input Report Library
 * Python কোড হুবহু TypeScript এ - Session Pool সহ
 */

// Types
export interface ColorWiseChallanItem {
  challan: string;
  date: string;
  buyer: string;
  style: string;
  line: string;
  color: string;
  qty: number;
  systemId: string;
  companyId: number;
}

export interface ColorGroup {
  color: string;
  items: ColorWiseChallanItem[];
  subTotal: number;
}

export interface ColorWiseReportResult {
  success: boolean;
  message: string;
  data?: ColorGroup[];
  grandTotal?: number;
  companyId?: number;
  totalChallans?: number;
}

interface ChallanMeta {
  date: string;
  buyer: string;
  style: string;
}

interface ChallanDetails {
  line: string;
  color: string;
  qty: number;
  systemId: string;
}

// URLs - Python থেকে হুবহু
const LOGIN_URL = 'http://180.92.235.190:8022/erp/login.php';
const CREDENTIALS = {
  txt_userid: 'input1.clothing-cutting',
  txt_password: '123456',
  submit: 'Login'
};

const URL_1 = 'http://180.92.235.190:8022/erp/production/reports/requires/sewing_input_challan_controller.php';
const URL_2 = 'http://180.92.235.190:8022/erp/production/requires/bundle_wise_sewing_input_controller.php';

// Python: USER_AGENTS = [...]
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
];

// Python: SESSION_POOL = []
let SESSION_POOL: string[] = [];

/**
 * Python: create_single_login_session()
 */
async function createSingleLoginSession(): Promise<string | null> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  
  try {
    const formData = new URLSearchParams();
    formData.append('txt_userid', CREDENTIALS.txt_userid);
    formData.append('txt_password', CREDENTIALS.txt_password);
    formData.append('submit', CREDENTIALS.submit);

    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': LOGIN_URL,
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      console.log('[Color Wise] Session created successfully');
      return cookies;
    }
  } catch (e) {
    console.error('[Color Wise] Login error:', e);
  }
  return null;
}

/**
 * Python: generate_session_pool_fast(needed_count)
 */
async function generateSessionPoolFast(neededCount: number): Promise<boolean> {
  SESSION_POOL = [];
  const targetSessions = Math.min(neededCount, 30);

  console.log(`[Color Wise] Creating ${targetSessions} sessions...`);

  const promises = Array(targetSessions).fill(null).map(() => createSingleLoginSession());
  const results = await Promise.all(promises);

  for (const sess of results) {
    if (sess) SESSION_POOL.push(sess);
  }

  console.log(`[Color Wise] Session pool ready! ${SESSION_POOL.length} sessions`);
  return SESSION_POOL.length > 0;
}

/**
 * Python: get_rotated_session()
 */
function getRotatedSession(): string | null {
  if (SESSION_POOL.length === 0) return null;
  return SESSION_POOL[Math.floor(Math.random() * SESSION_POOL.length)];
}

/**
 * Python: fetch_details_from_third_api(session, system_id, company_id)
 * Line parsing fixed - Python BeautifulSoup style
 */
async function fetchDetailsFromThirdApi(
  cookie: string,
  systemId: string,
  companyId: number
): Promise<{ line: string; color: string; qty: number }> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const dataParam = `${companyId}*${systemId}*3*%E2%9D%8F%20Bundle%20Wise%20Sewing%20Input*undefined*undefined*undefined*1`;

  try {
    const params = new URLSearchParams();
    params.append('data', dataParam);
    params.append('action', 'sewing_input_challan_print_5');
    
    const response = await fetch(`${URL_2}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'User-Agent': userAgent,
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Python: line_label = soup.find(string=re.compile("Line"))
      // Python: if line_label: line_td = line_label.find_parent('td').find_next_sibling('td')
      let lineNo = '-';
      // Look for "Line" label and get next td value, fallback to any "Line" text
      const linePatterns = [
        /<td><strong>Line\s*<\/strong><\/td>\s*<td[^>]*>\s*:?\s*([^<]+)/i,
        /Line\s*No[^<]*<\/td>\s*<td[^>]*>\s*:?\s*([^<]+)/i,
        /Line[^<]*<\/td>\s*<td[^>]*>\s*:?\s*([^<]+)/i,
        />Line\s*<\/[^>]*>\s*<[^>]*>\s*:?\s*([^<]+)/i,
        /Line\s*:\s*([^<\n]+)/i,
      ];
      for (const pattern of linePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const extracted = match[1].replace(/[:\s]+$/, '').trim();
          if (extracted && extracted.length < 20) {
            lineNo = extracted;
            break;
          }
        }
      }

      // Color & Qty Extract from rpt_table
      const colors = new Set<string>();
      let totalQty = 0;

      const tableMatch = html.match(/<table[^>]*class=['"][^'"]*rpt_table[^'"]*['"][^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const tableContent = tableMatch[1];
        const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

        for (const row of rowMatches) {
          const rowText = row.replace(/<[^>]*>/g, '');
          const cols = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];

          if (cols.length > 12 && !rowText.includes('Grand Total')) {
            const colorText = cols[12].replace(/<[^>]*>/g, '').trim();
            if (colorText && !/^\d+$/.test(colorText)) {
              colors.add(colorText);
            }
          }

          if (rowText.includes('Grand Total') && cols.length >= 3) {
            const qtyText = cols[cols.length - 3].replace(/<[^>]*>/g, '').replace(/,/g, '').trim();
            const qty = parseInt(qtyText);
            if (!isNaN(qty)) {
              totalQty = qty;
            }
          }
        }
      }

      const colorStr = colors.size > 0 ? Array.from(colors).join(', ') : 'Unknown Color';
      return { line: lineNo, color: colorStr, qty: totalQty };
    }
  } catch (e) {
    // Python: except: pass
  }
  return { line: 'Err', color: 'Error', qty: 0 };
}

/**
 * Python: process_full_chain(full_challan_no, company_id)
 * Now returns systemId
 */
async function processFullChain(
  fullChallanNo: string,
  companyId: number
): Promise<ChallanDetails> {
  let searchNumber = '0';
  const match = fullChallanNo.match(/(\d+)$/);
  if (match) {
    searchNumber = String(parseInt(match[1]));
  }

  let systemId: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const session = getRotatedSession();
    if (!session) {
      return { line: 'N/A', color: 'Not Found', qty: 0, systemId: '' };
    }

    try {
      await new Promise(r => setTimeout(r, Math.random() * 200 + 100));

      const dataParam = `${searchNumber}_0__${companyId}_2__1___`;
      const params = new URLSearchParams();
      params.append('data', dataParam);
      params.append('action', 'create_challan_search_list_view');

      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

      const resp = await fetch(`${URL_2}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Cookie': session,
          'User-Agent': userAgent,
        },
      });

      if (resp.ok) {
        const text = await resp.text();
        const safeC = fullChallanNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchId = text.match(new RegExp(`js_set_value\\s*\\(\\s*'(\\d+)'\\s*,\\s*'${safeC}'\\s*\\)`));
        if (matchId) {
          systemId = matchId[1];
          break;
        }
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
  }

  if (!systemId) {
    return { line: 'N/A', color: 'Not Found', qty: 0, systemId: '' };
  }

  const session3 = getRotatedSession();
  if (!session3) {
    return { line: 'N/A', color: 'Not Found', qty: 0, systemId: '' };
  }

  const details = await fetchDetailsFromThirdApi(session3, systemId, companyId);
  return { ...details, systemId };
}

/**
 * Parse HTML to extract challan list with metadata
 */
function parseChallansFromHtml(htmlContent: string): { seenChallans: Set<string>; challanMeta: Map<string, ChallanMeta> } {
  const seenChallans = new Set<string>();
  const challanMeta = new Map<string, ChallanMeta>();

  if (!htmlContent.includes('tbl_list_search')) {
    return { seenChallans, challanMeta };
  }

  const tbodyMatch = htmlContent.match(/<tbody[^>]*id=['"]tbl_list_search['"][^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch || !tbodyMatch[1]) {
    return { seenChallans, challanMeta };
  }

  const rows = tbodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

  for (const row of rows) {
    const cols = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    
    if (cols.length > 12) {
      const getText = (td: string) => td.replace(/<[^>]*>/g, '').trim();
      const challanNo = getText(cols[3]);

      if (challanNo && !seenChallans.has(challanNo)) {
        seenChallans.add(challanNo);
        challanMeta.set(challanNo, {
          date: getText(cols[12]),
          buyer: getText(cols[4]),
          style: getText(cols[7]),
        });
      }
    }
  }

  return { seenChallans, challanMeta };
}

/**
 * Group items by color
 */
function groupByColor(items: ColorWiseChallanItem[]): ColorGroup[] {
  const groupedData = new Map<string, ColorWiseChallanItem[]>();

  for (const item of items) {
    const existing = groupedData.get(item.color) || [];
    existing.push(item);
    groupedData.set(item.color, existing);
  }

  const groups: ColorGroup[] = [];
  for (const [color, colorItems] of groupedData.entries()) {
    const sortedItems = colorItems.sort((a, b) => b.challan.localeCompare(a.challan));
    const subTotal = colorItems.reduce((sum, item) => sum + item.qty, 0);
    groups.push({ color, items: sortedItems, subTotal });
  }

  return groups;
}

/**
 * Python: fetch_first_report(session, booking_no, company_id)
 */
async function fetchFirstReport(
  cookie: string,
  bookingNo: string,
  companyId: number
): Promise<string | null> {
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const payload = new URLSearchParams();
  payload.append('action', 'report_generate');
  payload.append('cbo_company_name', String(companyId));
  payload.append('cbo_buyer_name', '0');
  payload.append('txt_internal_ref', bookingNo);

  try {
    const response = await fetch(URL_1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookie,
        'User-Agent': userAgent,
      },
      body: payload.toString(),
    });
    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    console.error('[fetchFirstReport] Error:', e);
  }
  return null;
}

/**
 * Main function: fetchColorWiseReport
 */
export async function fetchColorWiseReport(booking: string): Promise<ColorWiseReportResult> {
  const masterSession = await createSingleLoginSession();
  if (!masterSession) {
    return { success: false, message: 'ERP authentication failed. Please try again later.' };
  }

  for (let compId = 1; compId <= 4; compId++) {
    const htmlContent = await fetchFirstReport(masterSession, booking, compId);
    
    if (htmlContent && htmlContent.includes('tbl_list_search')) {
      if (!htmlContent.replace(/\s/g, '').includes('<tbody></tbody>')) {
        
        const { seenChallans, challanMeta } = parseChallansFromHtml(htmlContent);
        if (seenChallans.size === 0) continue;

        console.log(`[Color Wise] Found ${seenChallans.size} challans in company ${compId}`);

        const poolSize = Math.floor(seenChallans.size / 3) + 2;
        await generateSessionPoolFast(poolSize);

        const challanArray = Array.from(seenChallans);
        
        const collectedResults = await Promise.all(
          challanArray.map(async (challanNo) => {
            const meta = challanMeta.get(challanNo)!;
            const det = await processFullChain(challanNo, compId);
            
            // Extract only DD-MM-YYYY from date string
            let date = meta.date;
            const dateMatch = date.match(/\d{2}-\d{2}-\d{4}/);
            if (dateMatch) date = dateMatch[0];
            else date = date.substring(0, 11);
            return {
              challan: challanNo,
              date,
              buyer: meta.buyer.substring(0, 20),
              style: meta.style,
              line: det.line,
              color: det.color,
              qty: det.qty,
              systemId: det.systemId,
              companyId: compId,
            } as ColorWiseChallanItem;
          })
        );

        const colorGroups = groupByColor(collectedResults);
        const grandTotal = collectedResults.reduce((sum, item) => sum + item.qty, 0);

        return {
          success: true,
          message: `Data found (Company ID: ${compId})`,
          data: colorGroups,
          grandTotal,
          companyId: compId,
          totalChallans: seenChallans.size,
        };
      }
    }
  }

  return { success: false, message: 'No data found in any company. Please verify the booking number.' };
}
