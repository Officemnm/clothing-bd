// Standalone script to replicate the closing-report ERP flow and save RAW data.
// Run with:  node --env-file=.env.local scripts/fetch-closing-raw.mjs "502/2677H"
//
// It logs in to the ERP, loops through year/company/location combinations
// (exactly like src/lib/closing.ts), and saves the raw HTML response that
// contains the report to a file under scripts/output/.

import fs from 'node:fs';
import path from 'node:path';

const refNo = process.argv[2] || '502/2677H';

const LOGIN_URL = process.env.ERP_LOGIN_URL;
const REPORT_URL = process.env.ERP_REPORT_URL;
const USERNAME = process.env.ERP_USERNAME;
const PASSWORD = process.env.ERP_PASSWORD;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function log(...args) {
  console.log(...args);
}

async function login() {
  if (!LOGIN_URL || !USERNAME || !PASSWORD) {
    throw new Error('Missing ERP_LOGIN_URL / ERP_USERNAME / ERP_PASSWORD');
  }
  const formData = new URLSearchParams();
  formData.append('txt_userid', USERNAME);
  formData.append('txt_password', PASSWORD);
  formData.append('submit', 'Login');

  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    body: formData.toString(),
    redirect: 'manual',
  });

  const cookie = res.headers.get('set-cookie');
  log(`[login] status=${res.status} cookie=${cookie ? 'received' : 'NONE'}`);
  return cookie;
}

async function fetchReport(cookie) {
  const years = ['2026', '2025', '2024', '2023'];
  const companyIds = [1, 2, 3, 4, 5];
  const locationParams = ['2', '0'];

  for (const locationValue of locationParams) {
    for (const year of years) {
      for (const companyId of companyIds) {
        const formData = new URLSearchParams();
        formData.append('action', 'report_generate');
        formData.append('cbo_wo_company_name', locationValue);
        formData.append('cbo_location_name', locationValue);
        formData.append('cbo_floor_id', '0');
        formData.append('cbo_buyer_name', '0');
        formData.append('txt_internal_ref_no', refNo);
        formData.append('reportType', '3');
        formData.append('cbo_year_selection', year);
        formData.append('cbo_company_name', String(companyId));

        try {
          const res = await fetch(REPORT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': UA,
              'Cookie': cookie,
            },
            body: formData.toString(),
          });

          if (res.ok) {
            const text = await res.text();
            const notFound = text.includes('Data not Found');
            log(`[try] loc=${locationValue} year=${year} company=${companyId} len=${text.length} found=${!notFound && text.length > 500}`);
            if (!notFound && text.length > 500) {
              return { text, locationValue, year, companyId };
            }
          } else {
            log(`[try] loc=${locationValue} year=${year} company=${companyId} HTTP ${res.status}`);
          }
        } catch (e) {
          log(`[try] loc=${locationValue} year=${year} company=${companyId} ERROR ${e.message}`);
        }
      }
    }
  }
  return null;
}

async function main() {
  log(`Booking / Internal Ref No: ${refNo}`);
  log(`Report URL: ${REPORT_URL}`);

  const cookie = await login();
  if (!cookie) {
    log('Could not obtain ERP cookie. Aborting.');
    process.exit(1);
  }

  const result = await fetchReport(cookie);
  if (!result) {
    log('No data found for any year/company/location combination.');
    process.exit(2);
  }

  log(`\n>>> DATA FOUND: location=${result.locationValue} year=${result.year} company=${result.companyId}`);

  const outDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const safeRef = refNo.replace(/[^a-zA-Z0-9]/g, '_');
  const htmlPath = path.join(outDir, `closing-raw-${safeRef}.html`);
  const metaPath = path.join(outDir, `closing-raw-${safeRef}.meta.json`);

  fs.writeFileSync(htmlPath, result.text, 'utf8');
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        refNo,
        foundAt: { location: result.locationValue, year: result.year, company: result.companyId },
        bytes: result.text.length,
        fetchedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );

  log(`\nRaw HTML saved to: ${htmlPath}`);
  log(`Meta saved to:     ${metaPath}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
