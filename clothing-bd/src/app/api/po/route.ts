import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { addHistoryRecord } from '@/lib/stats';
import {
  POMetadata,
  PODataRow,
  extractMetadata,
  isPotentialSize,
  parseVerticalTable,
  parseHorizontalTable,
  processDataIntoTables
} from '@/lib/po';
import { extractText } from 'unpdf';

/**
 * Extract text from PDF buffer using unpdf
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer);
  const result = await extractText(uint8Array);
  // unpdf returns { text: string[] } - join all pages
  if (Array.isArray(result.text)) {
    return result.text.join('\n');
  }
  return String(result.text || '');
}

/**
 * Extract data from a single PDF buffer
 */
async function extractDataFromPDF(buffer: Buffer): Promise<{ data: PODataRow[]; metadata: POMetadata }> {
  const extractedData: PODataRow[] = [];
  let metadata: POMetadata = {
    buyer: 'N/A',
    booking: 'N/A',
    style: 'N/A',
    season: 'N/A',
    dept: 'N/A',
    item: 'N/A'
  };

  try {
    const text = await extractTextFromPDF(buffer);

    // Check if this is a fabric booking sheet (not a PO)
    if (text.includes('Main Fabric Booking') || text.includes('Fabric Booking Sheet')) {
      metadata = extractMetadata(text);
      return { data: [], metadata };
    }

    // Extract order number
    let orderNo = 'Unknown';
    const orderMatch = text.match(/Order no\s*[:\.]?\s*(\d+)/i);
    if (orderMatch) {
      orderNo = orderMatch[1];
    } else {
      const altMatch = text.match(/Order\s*[:\.]?\s*(\d+)/i);
      if (altMatch) orderNo = altMatch[1];
    }

    orderNo = orderNo.trim();
    if (orderNo.endsWith('00')) {
      orderNo = orderNo.slice(0, -2);
    }

    // Split text into lines and process
    const lines = text.split('\n');
    let foundData = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Method 1: Look for "Color/Size" header with sizes (KIABI horizontal format)
      if (line.includes('Color/Size') && (line.includes('Total') || line.match(/\d+M|\d+A/))) {
        const parts = line.split(/\s+/);
        const colorSizeIdx = parts.findIndex((x: string) => x.includes('Color/Size'));
        
        // Find sizes after Color/Size
        const afterColorSize = parts.slice(colorSizeIdx + 1);
        const sizes: string[] = [];
        
        for (const part of afterColorSize) {
          if (part === 'Total' || part.includes('Order') || part.includes('Qty')) break;
          if (isPotentialSize(part)) {
            sizes.push(part);
          }
        }
        
        if (sizes.length > 0) {
          // Try horizontal parsing first (data on same line as color)
          const horizontalData = parseHorizontalTable(lines, i + 1, sizes, orderNo);
          if (horizontalData.length > 0) {
            extractedData.push(...horizontalData);
            foundData = true;
          } else {
            // Fall back to vertical parsing
            const data = parseVerticalTable(lines, i + 1, sizes, orderNo);
            if (data.length > 0) {
              extractedData.push(...data);
              foundData = true;
            }
          }
        }
      }
      
      // Method 2: Look for standard "Colo" or "Size" header line
      if (!foundData && (line.includes('Colo') || line.includes('Size')) && line.includes('Total')) {
        const parts = line.split(/\s+/);
        
        // Find 'Total' index
        const totalIdx = parts.findIndex((x: string) => x.includes('Total'));
        if (totalIdx === -1) continue;

        // Extract sizes (everything before Total, excluding known non-size words)
        const rawSizes = parts.slice(0, totalIdx);
        const sizes = rawSizes.filter((s: string) => 
          !['Colo', '/', 'Size', 'Colo/Size', 'Colo/', "Size's", 'Color/Size'].includes(s)
        );

        // Validate that most are potential sizes
        const validSizeCount = sizes.filter((s: string) => isPotentialSize(s)).length;
        if (sizes.length > 0 && validSizeCount >= sizes.length / 2) {
          const data = parseVerticalTable(lines, i + 1, sizes, orderNo);
          if (data.length > 0) {
            extractedData.push(...data);
            foundData = true;
          }
        }
      }
      
      if (foundData) break;
    }

    // Extract metadata from first page
    metadata = extractMetadata(text);

  } catch (error) {
    console.error('Error processing PDF:', error);
  }

  return { data: extractedData, metadata };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files uploaded' },
        { status: 400 }
      );
    }

    let allData: PODataRow[] = [];
    let finalMetadata: POMetadata = {
      buyer: 'N/A',
      booking: 'N/A',
      style: 'N/A',
      season: 'N/A',
      dept: 'N/A',
      item: 'N/A'
    };

    // Process each PDF file
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { data, metadata } = await extractDataFromPDF(buffer);

      // Use metadata from file that has valid booking (Fabric Booking Sheet has booking info)
      // Prioritize file with booking number
      if (metadata.booking !== 'N/A' && finalMetadata.booking === 'N/A') {
        finalMetadata = metadata;
      } else if (finalMetadata.buyer === 'N/A' && metadata.buyer !== 'N/A') {
        // Fallback: use any file with valid buyer if no booking found yet
        finalMetadata = metadata;
      }

      if (data.length > 0) {
        allData = allData.concat(data);
      }
    }

    if (allData.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid PO data found in uploaded files' },
        { status: 400 }
      );
    }

    // Process data into color-based tables
    const { tables, grandTotal } = processDataIntoTables(allData);

    // Update stats with success
    await addHistoryRecord(session.username, 'PO Sheet', finalMetadata.booking, 'success', { file_count: files.length });

    return NextResponse.json({
      success: true,
      data: {
        metadata: finalMetadata,
        tables,
        grandTotal,
        fileCount: files.length
      }
    });

  } catch (error) {
    console.error('PO processing error:', error);
    
    // Log failed attempt
    const session = await getSession();
    if (session?.username) {
      try {
        await addHistoryRecord(session.username, 'PO Sheet', 'Unknown', 'failed', { file_count: 0 });
      } catch (e) {
        console.error('Failed to log failed PO stats:', e);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to process files' },
      { status: 500 }
    );
  }
}
