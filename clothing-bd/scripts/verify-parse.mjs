// Verify the new parse rules against the saved raw HTML.
// Replicates the block/cell logic from src/lib/closing.ts
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const refNo = process.argv[2] || '502/2677H';
const safeRef = refNo.replace(/[^a-zA-Z0-9]/g, '_');
const html = fs.readFileSync(path.join(process.cwd(), 'scripts', 'output', `closing-raw-${safeRef}.html`), 'utf8');
const $ = cheerio.load(html);

const headerRow = $('thead tr').eq(1);
const headers = [];
headerRow.find('th').each((_, th) => {
  const t = $(th).text().trim();
  if (!t.toLowerCase().includes('total')) headers.push(t);
});

const dataRows = $('div#scroll_body table tbody tr');
const itemBlocks = [];
let currentBlock = [];
dataRows.each((_, row) => {
  if ($(row).attr('bgcolor') === '#cddcdc') {
    if (currentBlock.length) itemBlocks.push(currentBlock);
    currentBlock = [];
  } else currentBlock.push(row);
});
if (currentBlock.length) itemBlocks.push(currentBlock);

for (const block of itemBlocks) {
  let sewingInput = [], sendToSewing = [], cuttingQc = [], gmts = [];
  for (const row of block) {
    const cells = $(row).find('td');
    if (cells.length > 2) {
      const main = $(cells[0]).text().trim().toLowerCase();
      const sub = $(cells[2]).text().trim().toLowerCase();

      if (sub === 'gmts. color /country qty') {
        gmts = [];
        for (let i = 3; i < Math.min(cells.length, headers.length + 3); i++) gmts.push($(cells[i]).text().trim());
      }
      if (main.includes('sewing input')) {
        sewingInput = [];
        for (let i = 1; i < Math.min(cells.length, headers.length + 1); i++) sewingInput.push($(cells[i]).text().trim());
      } else if (sub.includes('sewing input')) {
        sewingInput = [];
        for (let i = 3; i < Math.min(cells.length, headers.length + 3); i++) sewingInput.push($(cells[i]).text().trim());
      }
      if (sub === 'send to sewing') {
        sendToSewing = [];
        for (let i = 3; i < Math.min(cells.length, headers.length + 3); i++) sendToSewing.push($(cells[i]).text().trim());
      } else if (main === 'send to sewing') {
        sendToSewing = [];
        for (let i = 1; i < Math.min(cells.length, headers.length + 1); i++) sendToSewing.push($(cells[i]).text().trim());
      }
      if ((main.includes('cutting qc') && !main.includes('balance'))) {
        cuttingQc = [];
        for (let i = 1; i < Math.min(cells.length, headers.length + 1); i++) cuttingQc.push($(cells[i]).text().trim());
      } else if (sub.includes('cutting qc') && !sub.includes('balance')) {
        cuttingQc = [];
        for (let i = 3; i < Math.min(cells.length, headers.length + 3); i++) cuttingQc.push($(cells[i]).text().trim());
      }
    }
  }
  if (gmts.length) {
    console.log('Headers      :', headers.join(', '));
    console.log('Gmts Qty     :', gmts.join(', '));
    console.log('Cutting QC   :', cuttingQc.join(', '));
    console.log('Input Qty    (Send To Sewing):', sendToSewing.join(', '));
    console.log('Sewing Punch (Sewing Input)  :', sewingInput.join(', '));
    // sample calc for first size
    const n = s => parseInt((s || '0').replace(/,/g, '')) || 0;
    const qty3 = Math.round(n(gmts[0]) * 1.03);
    const inp = n(sendToSewing[0]);
    console.log(`\nSample size ${headers[0]}: qty3=${qty3}, inputQty(SendToSewing)=${inp}, balance=${n(cuttingQc[0]) - inp}, short/plus=${inp - qty3}`);
  }
}
