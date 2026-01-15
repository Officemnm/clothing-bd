import { NextRequest, NextResponse } from 'next/server';
import { fetchClosingReportData } from '@/lib/closing';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refNo = searchParams.get('ref');

    if (!refNo) {
      return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 });
    }

    const data = await fetchClosingReportData(refNo);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Closing Report');

    // Styles
    const titleFont = { name: 'Arial', size: 24, bold: true, color: { argb: '7B261A' } };
    const headerFont = { name: 'Arial', size: 12, bold: true };
    const boldFont = { name: 'Arial', size: 11, bold: true };
    const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Colors
    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DE7465' } };
    const lightBlueFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B9C2DF' } };
    const lightGreenFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C4D09D' } };
    const lightFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F2E8' } };
    const irFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7B261A' } };

    // Title Row
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'COTTON CLOTHING BD LTD';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlign;

    // Subtitle
    worksheet.mergeCells('A2:I2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = 'CLOSING REPORT [ INPUT SECTION ]';
    subtitleCell.font = { name: 'Arial', size: 14, bold: true };
    subtitleCell.alignment = centerAlign;

    // Empty row
    worksheet.getRow(3).height = 8;

    // Info section
    const currentDate = new Date().toLocaleDateString('en-GB');
    const infoData = [
      ['BUYER', data[0]?.buyer || 'N/A', '', '', '', '', '', 'CLOSING DATE', currentDate],
      ['IR/IB NO', refNo.toUpperCase(), '', '', '', '', '', 'SHIPMENT', 'ALL'],
      ['STYLE NO', data[0]?.style || 'N/A', '', '', '', '', '', 'PO NO', 'ALL'],
    ];

    for (let i = 0; i < infoData.length; i++) {
      const row = worksheet.getRow(4 + i);
      row.values = infoData[i];
      
      // Merge cells B to G
      worksheet.mergeCells(4 + i, 2, 4 + i, 7);
      
      for (let j = 1; j <= 9; j++) {
        const cell = row.getCell(j);
        cell.font = boldFont;
        cell.border = thinBorder;
        cell.fill = lightFill;
        
        // Special styling for IR/IB NO value
        if (i === 1 && j === 2) {
          cell.fill = irFill;
          cell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
        }
      }
    }

    let currentRow = 8;

    // Data blocks
    for (const block of data) {
      // Header row
      const headers = ['COLOUR NAME', 'SIZE', 'ORDER QTY 3%', 'ACTUAL QTY', 'CUTTING QC', 'INPUT QTY', 'BALANCE', 'SHORT/PLUS QTY', 'Percentage %'];
      const headerRow = worksheet.getRow(currentRow);
      headerRow.values = headers;
      
      for (let j = 1; j <= 9; j++) {
        const cell = headerRow.getCell(j);
        cell.font = headerFont;
        cell.alignment = centerAlign;
        cell.border = thinBorder;
        cell.fill = headerFill;
      }
      currentRow++;

      const startRow = currentRow;
      const colorName = block.color;

      // Data rows
      for (let i = 0; i < block.headers.length; i++) {
        const size = block.headers[i];
        const actualQty = parseInt((block.gmts_qty[i] || '0').replace(/,/g, '')) || 0;
        const cuttingQc = parseInt((block.cutting_qc[i] || '0').replace(/,/g, '')) || 0;
        const inputQty = parseInt((block.sewing_input[i] || '0').replace(/,/g, '')) || 0;
        const qty3 = Math.round(actualQty * 1.03);
        const balance = cuttingQc - inputQty;
        const shortPlus = inputQty - qty3;
        const pct = qty3 > 0 ? shortPlus / qty3 : 0;

        const row = worksheet.getRow(currentRow);
        row.values = [
          i === 0 ? colorName : '',
          size,
          qty3,
          actualQty,
          cuttingQc,
          inputQty,
          balance,
          shortPlus,
          pct,
        ];

        for (let j = 1; j <= 9; j++) {
          const cell = row.getCell(j);
          cell.border = thinBorder;
          cell.alignment = centerAlign;
          cell.fill = lightFill;
          
          if (j === 3) cell.fill = lightBlueFill;
          if (j === 6) cell.fill = lightGreenFill;
          if ([1, 2, 3, 6].includes(j)) cell.font = boldFont;
          if (j === 9) cell.numFmt = '0.00%';
        }
        currentRow++;
      }

      const endRow = currentRow - 1;

      // Merge color column
      if (startRow <= endRow) {
        worksheet.mergeCells(startRow, 1, endRow, 1);
        const colorCell = worksheet.getCell(startRow, 1);
        colorCell.alignment = { ...centerAlign, wrapText: true };
        colorCell.font = boldFont;
      }

      // Total row
      const totalRow = worksheet.getRow(currentRow);
      worksheet.mergeCells(currentRow, 1, currentRow, 2);
      
      // Calculate totals
      let tot3 = 0, totAct = 0, totCut = 0, totInp = 0;
      for (let i = 0; i < block.headers.length; i++) {
        const actual = parseInt((block.gmts_qty[i] || '0').replace(/,/g, '')) || 0;
        tot3 += Math.round(actual * 1.03);
        totAct += actual;
        totCut += parseInt((block.cutting_qc[i] || '0').replace(/,/g, '')) || 0;
        totInp += parseInt((block.sewing_input[i] || '0').replace(/,/g, '')) || 0;
      }
      const totBal = totCut - totInp;
      const totSp = totInp - tot3;
      const totPct = tot3 > 0 ? totSp / tot3 : 0;

      totalRow.values = ['TOTAL', '', tot3, totAct, totCut, totInp, totBal, totSp, totPct];

      for (let j = 1; j <= 9; j++) {
        const cell = totalRow.getCell(j);
        cell.font = { name: 'Arial', size: 11, bold: true };
        cell.border = thinBorder;
        cell.alignment = centerAlign;
        cell.fill = headerFill;
        if (j === 9) cell.numFmt = '0.00%';
      }

      currentRow += 2;
    }

    // Set column widths
    worksheet.columns = [
      { width: 23 },
      { width: 10 },
      { width: 18 },
      { width: 15 },
      { width: 15 },
      { width: 14 },
      { width: 12 },
      { width: 18 },
      { width: 14 },
    ];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Report-${refNo.toUpperCase()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Excel generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}
