/**
 * PO Sheet Processing Library
 * Extracts size-wise quantity data from PO (Purchase Order) PDFs
 */

export interface POMetadata {
  buyer: string;
  booking: string;
  style: string;
  season: string;
  dept: string;
  item: string;
}

export interface PODataRow {
  poNo: string;
  color: string;
  size: string;
  quantity: number;
}

export interface ColorTable {
  color: string;
  sizes: string[];
  rows: {
    poNo: string;
    quantities: number[];
    total: number;
  }[];
  actualQty: number[];
  orderQty3Percent: number[];
  actualTotal: number;
  orderTotal: number;
}

export interface POProcessResult {
  success: boolean;
  metadata: POMetadata;
  tables: ColorTable[];
  grandTotal: number;
  error?: string;
}

// Standard size order for sorting
const STANDARD_SIZE_ORDER = [
  '0M', '1M', '3M', '6M', '9M', '12M', '18M', '24M', '36M',
  '2A', '3A', '4A', '5A', '6A', '8A', '10A', '12A', '14A', '16A', '18A',
  'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL',
  'TU', 'One Size', 'ONESIZE', 'ONE SIZE'
];

/**
 * Check if a header is a potential size identifier
 */
export function isPotentialSize(header: string): boolean {
  const h = header.trim().toUpperCase();
  
  // Exclude known non-size headers
  if (['COLO', 'SIZE', 'TOTAL', 'QUANTITY', 'PRICE', 'AMOUNT', 'CURRENCY', 'ORDER NO', 'P.O NO'].includes(h)) {
    return false;
  }
  
  // Pure numbers (like 2, 4, 6, 8, 10, 12)
  if (/^\d+$/.test(h)) return true;
  
  // Numbers with size suffix (2A, 3M, 4Y, 10T)
  if (/^\d+[AMYT]$/.test(h)) return true;
  
  // Standard letter sizes
  if (/^(XXS|XS|S|M|L|XL|XXL|XXXL|3XL|4XL|5XL|TU|ONE\s*SIZE|ONESIZE)$/.test(h)) return true;
  
  // Exclude codes like A12345
  if (/^[A-Z]\d{2,}$/.test(h)) return false;
  
  return false;
}

/**
 * Sort sizes in logical order
 */
export function sortSizes(sizeList: string[]): string[] {
  const sortKey = (s: string): [number, number | string, string?] => {
    const trimmed = s.trim();
    const upper = trimmed.toUpperCase();
    
    // Check standard order first
    const stdIndex = STANDARD_SIZE_ORDER.findIndex(std => std.toUpperCase() === upper);
    if (stdIndex !== -1) return [0, stdIndex];
    
    // Pure numbers
    if (/^\d+$/.test(trimmed)) return [1, parseInt(trimmed, 10)];
    
    // Number + letter combination (2A, 3M, etc.)
    const match = trimmed.match(/^(\d+)([A-Z]+)$/i);
    if (match) return [2, parseInt(match[1], 10), match[2].toUpperCase()];
    
    // Fallback - alphabetical
    return [3, trimmed];
  };

  return [...sizeList].sort((a, b) => {
    const keyA = sortKey(a);
    const keyB = sortKey(b);
    
    // Compare by priority first
    if (keyA[0] !== keyB[0]) return keyA[0] - keyB[0];
    
    // Then by number/index
    if (typeof keyA[1] === 'number' && typeof keyB[1] === 'number') {
      if (keyA[1] !== keyB[1]) return keyA[1] - keyB[1];
    }
    
    // Then by suffix if exists
    if (keyA[2] && keyB[2]) {
      return keyA[2].localeCompare(keyB[2]);
    }
    
    // Fallback string compare
    return String(keyA[1]).localeCompare(String(keyB[1]));
  });
}

/**
 * Extract metadata from PDF first page text
 * Following exact logic from app.py
 */
export function extractMetadata(text: string): POMetadata {
  const meta: POMetadata = {
    buyer: 'N/A',
    booking: 'N/A',
    style: 'N/A',
    season: 'N/A',
    dept: 'N/A',
    item: 'N/A'
  };

  // Buyer detection - same as app.py
  if (text.toUpperCase().includes('KIABI')) {
    meta.buyer = 'KIABI';
  } else {
    const buyerMatch = text.match(/Buyer.*?Name[\s\S]*?([\w\s&]+)(?:\n|$)/i);
    if (buyerMatch) meta.buyer = buyerMatch[1].trim();
  }

  // Booking number - exact same regex as app.py
  // Pattern: (?:Internal )?Booking NO\.?[:\s]*([\s\S]*?)(?:System NO|Control No|Buyer)
  const bookingMatch = text.match(/(?:Internal )?Booking NO\.?[:\s]*([\s\S]*?)(?:System NO|Control No|Buyer)/i);
  if (bookingMatch) {
    let rawBooking = bookingMatch[1].trim();
    // Clean booking - remove newlines and spaces
    let cleanBooking = rawBooking.replace(/\n/g, '').replace(/\r/g, '').replace(/ /g, '');
    // Stop at "System" if present
    if (cleanBooking.includes('System')) {
      cleanBooking = cleanBooking.split('System')[0];
    }
    meta.booking = cleanBooking;
  }

  // Style reference - exact same as app.py: Style Ref only, NOT Computer Reference
  const styleMatch = text.match(/Style Ref\.?[:\s]*([\w-]+)/i);
  if (styleMatch) {
    meta.style = styleMatch[1].trim();
  } else {
    // Try Style Des pattern
    const altStyleMatch = text.match(/Style Des\.?[\s\S]*?([\w-]+)/i);
    if (altStyleMatch) meta.style = altStyleMatch[1].trim();
    else {
      // For KIABI - extract middle part from Computer Reference (FDL79 / MSBS26HCVIS / WORLD)
      const compRefMatch = text.match(/Computer Reference\s*:\s*([^\n]+)/i);
      if (compRefMatch) {
        const parts = compRefMatch[1].split('/').map(p => p.trim());
        if (parts.length >= 2) {
          // Get the middle part (MSBS26HCVIS)
          meta.style = parts[1].trim();
        } else if (parts.length === 1) {
          meta.style = parts[0].trim();
        }
      }
    }
  }

  // Season - exact same as app.py: Season\s*[:\n\"]*([\w\d-]+)
  const seasonMatch = text.match(/Season\s*[:\n"]*([\w\d-]+)/i);
  if (seasonMatch) meta.season = seasonMatch[1].trim();

  // Department - exact same as app.py: Dept\.?[\s\n:]*([A-Za-z]+)
  const deptMatch = text.match(/Dept\.?[\s\n:]*([A-Za-z]+)/i);
  if (deptMatch) meta.dept = deptMatch[1].trim();

  // Garment item - exact same as app.py
  const itemMatch = text.match(/Garments? Item[\s\n:]*([^\n\r]+)/i);
  if (itemMatch) {
    let itemText = itemMatch[1].trim();
    if (itemText.includes('Style')) {
      itemText = itemText.split('Style')[0].trim();
    }
    meta.item = itemText;
  } else {
    // Look for common item types in text
    const itemTypes = ['T-SHIRT', 'SHIRT', 'PANTS', 'SHORTS', 'JACKET', 'DRESS', 'POLO', 'SWEATER', 'HOODIE', 'BLOUSE', 'TROUSER'];
    for (const itemType of itemTypes) {
      if (text.toUpperCase().includes(itemType)) {
        meta.item = itemType;
        break;
      }
    }
  }

  return meta;
}

/**
 * Check if text is likely a color name
 */
export function isColorName(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Not a pure number
  if (/^\d+$/.test(trimmed)) return false;
  
  // Not a price-like number
  if (/^\d+[,\.]\d{2}$/.test(trimmed)) return false;
  
  // Not a size
  if (isPotentialSize(trimmed)) return false;
  
  // Not containing keywords
  const keywords = ['spec', 'price', 'total', 'quantity', 'amount', 'currency', 'order'];
  if (keywords.some(kw => trimmed.toLowerCase().includes(kw))) return false;
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  return true;
}

/**
 * Check if text could be a partial color name
 */
export function isPartialColorName(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Only letters and spaces
  if (/^[A-Za-z\s]+$/.test(trimmed)) {
    const keywords = ['spec', 'price', 'total', 'quantity', 'amount'];
    if (!keywords.some(kw => trimmed.toLowerCase().includes(kw))) {
      return true;
    }
  }
  return false;
}

/**
 * Parse vertical table format from PDF lines
 */
export function parseVerticalTable(
  lines: string[],
  startIdx: number,
  sizes: string[],
  orderNo: string
): PODataRow[] {
  const extractedData: PODataRow[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for end of color data section
    if (line.startsWith('Total') && i + 1 < lines.length) {
      const nextLine = lines[i + 1]?.trim() || '';
      if (nextLine.includes('Quantity') || nextLine.includes('Amount') || /^Quantity/.test(nextLine)) {
        break;
      }
      if (/^\d/.test(nextLine)) break;
    }

    // Found a color name
    if (line && isColorName(line)) {
      let colorName = line;
      i++;

      // Accumulate multi-line color names
      while (i < lines.length) {
        const nextLine = lines[i].trim();

        if (nextLine.toLowerCase().includes('spec')) {
          i++;
          break;
        }

        if (/^\d+$/.test(nextLine)) break;
        if (!nextLine) {
          i++;
          continue;
        }

        if (isPartialColorName(nextLine)) {
          colorName = colorName + ' ' + nextLine;
          i++;
        } else {
          break;
        }
      }

      // Skip 'spec' line if present
      if (i < lines.length && lines[i].toLowerCase().includes('spec')) {
        i++;
      }

      // Extract quantities for each size
      const quantities: number[] = [];
      let sizeIdx = 0;

      while (sizeIdx < sizes.length && i < lines.length) {
        const qtyLine = lines[i]?.trim() || '';
        const priceLine = lines[i + 1]?.trim() || '';

        // Check if we hit next color
        if (qtyLine && isColorName(qtyLine)) {
          while (sizeIdx < sizes.length) {
            quantities.push(0);
            sizeIdx++;
          }
          break;
        }

        // Empty quantity slot
        if ((!qtyLine || /^\s*$/.test(qtyLine)) && (!priceLine || /^\s*$/.test(priceLine))) {
          quantities.push(0);
          sizeIdx++;
          i += 2;
          continue;
        }

        // Found a quantity
        if (/^\d+$/.test(qtyLine)) {
          quantities.push(parseInt(qtyLine, 10));
          sizeIdx++;
          i += 2;
          continue;
        }

        i++;
      }

      // Pad quantities array if needed
      while (quantities.length < sizes.length) {
        quantities.push(0);
      }

      // Add data rows for each size
      if (quantities.length > 0) {
        for (let idx = 0; idx < sizes.length; idx++) {
          extractedData.push({
            poNo: orderNo,
            color: colorName,
            size: sizes[idx],
            quantity: quantities[idx] ?? 0
          });
        }
      }

      continue;
    }

    i++;
  }

  return extractedData;
}

/**
 * Parse horizontal table format (color and quantities on same line)
 * Used by KIABI and similar PO formats
 */
export function parseHorizontalTable(
  lines: string[],
  startIdx: number,
  sizes: string[],
  orderNo: string
): PODataRow[] {
  const extractedData: PODataRow[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Stop at sub/grand total lines
    if (/^(Sub\s*Total|Grand\s*Total)/i.test(line)) break;
    
    // Skip empty lines
    if (!line) continue;
    
    // Skip header-like lines
    if (line.includes('Color/Size') || line.includes('PO')) continue;
    if (/^Total\s/i.test(line)) continue;
    
    // Try to extract color and quantities from the line
    // KIABI format: "BLANC NEIG- SNOW WHITE 11-0602 TCX 168 147 125 126 177 107 126 245 1,221"
    
    // Find where numbers start
    const parts = line.split(/\s+/);
    
    // Look for the transition from text (color) to numbers
    let colorEndIdx = -1;
    let consecutiveNumbers = 0;
    
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      // Check if this is a number (quantity)
      if (/^\d+$/.test(part) || /^\d{1,3}(,\d{3})+$/.test(part)) {
        consecutiveNumbers++;
        if (consecutiveNumbers >= sizes.length && colorEndIdx === -1) {
          // Found enough numbers to match sizes, mark color end
          colorEndIdx = j - sizes.length;
          break;
        }
      } else if (!/^[\d,]+$/.test(part)) {
        // Reset if we hit text again
        if (consecutiveNumbers > 0 && consecutiveNumbers < sizes.length) {
          consecutiveNumbers = 0;
          colorEndIdx = -1;
        }
      }
    }
    
    // If we didn't find enough numbers, try alternative parsing
    if (colorEndIdx < 0) {
      // Try finding numbers from the end (excluding last which is total)
      const numbers: number[] = [];
      let lastTextIdx = parts.length - 1;
      
      for (let j = parts.length - 1; j >= 0; j--) {
        const part = parts[j].replace(/,/g, '');
        if (/^\d+$/.test(part)) {
          numbers.unshift(parseInt(part, 10));
        } else {
          lastTextIdx = j;
          break;
        }
      }
      
      // If we have more numbers than sizes (includes total), extract
      if (numbers.length > sizes.length) {
        const colorName = parts.slice(0, lastTextIdx + 1).join(' ').trim();
        // Remove the last number (total) and any extra leading numbers
        const quantities = numbers.slice(-(sizes.length + 1), -1);
        
        if (colorName && isValidColorForHorizontal(colorName) && quantities.length === sizes.length) {
          for (let idx = 0; idx < sizes.length; idx++) {
            extractedData.push({
              poNo: orderNo,
              color: colorName,
              size: sizes[idx],
              quantity: quantities[idx] ?? 0
            });
          }
        }
      }
    } else {
      // Extract color and quantities
      const colorName = parts.slice(0, colorEndIdx).join(' ').trim();
      const quantities: number[] = [];
      
      for (let j = colorEndIdx; j < colorEndIdx + sizes.length && j < parts.length; j++) {
        const num = parseInt(parts[j].replace(/,/g, ''), 10);
        quantities.push(isNaN(num) ? 0 : num);
      }
      
      if (colorName && quantities.length === sizes.length) {
        for (let idx = 0; idx < sizes.length; idx++) {
          extractedData.push({
            poNo: orderNo,
            color: colorName,
            size: sizes[idx],
            quantity: quantities[idx] ?? 0
          });
        }
      }
    }
  }

  return extractedData;
}

/**
 * Check if text looks like a valid color name for horizontal parsing
 */
function isValidColorForHorizontal(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Must have at least 2 characters
  if (trimmed.length < 2) return false;
  
  // Not purely numeric
  if (/^\d+$/.test(trimmed)) return false;
  
  // Should contain at least one letter
  if (!/[A-Za-z]/.test(trimmed)) return false;
  
  return true;
}

/**
 * Process extracted data into color-based tables
 */
export function processDataIntoTables(data: PODataRow[]): { tables: ColorTable[]; grandTotal: number } {
  if (!data.length) {
    return { tables: [], grandTotal: 0 };
  }

  // Get unique colors
  const colors = [...new Set(data.map(d => d.color.trim()).filter(c => c))];
  
  // Get all sizes and sort them
  const allSizes = [...new Set(data.map(d => d.size))];
  const sortedSizes = sortSizes(allSizes);
  
  let grandTotal = 0;
  const tables: ColorTable[] = [];

  for (const color of colors) {
    const colorData = data.filter(d => d.color.trim() === color);
    const poNumbers = [...new Set(colorData.map(d => d.poNo))];
    
    const rows: { poNo: string; quantities: number[]; total: number }[] = [];
    
    for (const poNo of poNumbers) {
      const poColorData = colorData.filter(d => d.poNo === poNo);
      const quantities: number[] = [];
      
      for (const size of sortedSizes) {
        const match = poColorData.find(d => d.size === size);
        quantities.push(match?.quantity ?? 0);
      }
      
      const total = quantities.reduce((sum, q) => sum + q, 0);
      grandTotal += total;
      
      rows.push({ poNo, quantities, total });
    }
    
    // Calculate actual quantities per size
    const actualQty: number[] = [];
    for (let i = 0; i < sortedSizes.length; i++) {
      const sum = rows.reduce((s, r) => s + (r.quantities[i] ?? 0), 0);
      actualQty.push(sum);
    }
    
    // Calculate 3% order quantities
    const orderQty3Percent = actualQty.map(q => Math.round(q * 1.03));
    
    const actualTotal = actualQty.reduce((sum, q) => sum + q, 0);
    const orderTotal = orderQty3Percent.reduce((sum, q) => sum + q, 0);

    tables.push({
      color,
      sizes: sortedSizes,
      rows,
      actualQty,
      orderQty3Percent,
      actualTotal,
      orderTotal
    });
  }

  return { tables, grandTotal };
}
