// Quick preview of the saved raw closing HTML.
// Usage: node scripts/preview-closing-raw.mjs "502/2677H"
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const refNo = process.argv[2] || '502/2677H';
const safeRef = refNo.replace(/[^a-zA-Z0-9]/g, '_');
const htmlPath = path.join(process.cwd(), 'scripts', 'output', `closing-raw-${safeRef}.html`);

const html = fs.readFileSync(htmlPath, 'utf8');
const $ = cheerio.load(html);

console.log('=== TABLE ROWS (text) ===');
$('table tr').each((i, tr) => {
  const cells = $(tr).find('td, th').map((_, c) => $(c).text().trim()).get();
  const line = cells.filter(Boolean).join(' | ');
  if (line) console.log(line);
});
