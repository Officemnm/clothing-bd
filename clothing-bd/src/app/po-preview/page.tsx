'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface POMetadata {
  buyer: string;
  booking: string;
  style: string;
  season: string;
  dept: string;
  item: string;
}

interface ColorTable {
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

interface POResult {
  metadata: POMetadata;
  tables: ColorTable[];
  grandTotal: number;
  fileCount: number;
}

export default function POPreviewPage() {
  const [data, setData] = useState<POResult | null>(null);
  const [currentDate, setCurrentDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('poPreviewData');
    if (stored) {
      setData(JSON.parse(stored));
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    setCurrentDate(`${day}-${month}-${year}`);
    setIsLoading(false);
  }, []);

  const handlePrint = () => window.print();
  const handleBack = () => router.back();

  const handleScreenshot = async () => {
    if (!reportRef.current || !data) return;
    
    setIsCapturing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 6,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      const link = document.createElement('a');
      link.download = `PO-Sheet-${data.metadata.booking}-${currentDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !data) return;
    
    setIsPdfGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const element = reportRef.current;
      const rect = element.getBoundingClientRect();
      
      const dataUrl = await toPng(element, {
        pixelRatio: 4,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      // A4 size in mm: 210 x 297
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 5;
      const contentWidth = pageWidth - (margin * 2);
      
      // Calculate height maintaining aspect ratio
      const imgRatio = rect.height / rect.width;
      const contentHeight = contentWidth * imgRatio;
      
      // If content is taller than page, scale to fit
      let finalWidth = contentWidth;
      let finalHeight = contentHeight;
      
      if (contentHeight > pageHeight - (margin * 2)) {
        finalHeight = pageHeight - (margin * 2);
        finalWidth = finalHeight / imgRatio;
      }
      
      // Center horizontally
      const xOffset = (pageWidth - finalWidth) / 2;
      
      pdf.addImage(dataUrl, 'PNG', xOffset, margin, finalWidth, finalHeight);
      pdf.save(`PO-Sheet-${data.metadata.booking}-${currentDate}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-blue-500"
              animate={{ y: [0, -12, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex items-center justify-center bg-white font-sans"
      >
        <div className="text-center p-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-black mb-2">No PO Data</h2>
          <p className="text-gray-600 mb-5 text-sm">Please generate a PO sheet first.</p>
          <button
            onClick={() => router.push('/dashboard/po-generator')}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-800 rounded hover:bg-gray-700"
          >
            Go to PO Generator
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 4mm; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50 p-2 font-sans">
        {/* Action Bar - Professional Style */}
        <div className="no-print max-w-6xl mx-auto mb-3 flex justify-end gap-3 p-3 bg-white rounded-xl shadow-md border border-gray-100">
          <button onClick={handleBack} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-300 rounded-lg flex items-center gap-2 hover:from-gray-100 hover:to-gray-200 hover:shadow-sm transition-all duration-200">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button 
            onClick={handleScreenshot} 
            disabled={isCapturing}
            title="Screenshot"
            className="p-2.5 text-white bg-gradient-to-b from-cyan-500 to-cyan-700 rounded-lg hover:from-cyan-600 hover:to-cyan-800 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCapturing ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>
          <button 
            onClick={handleDownloadPdf} 
            disabled={isPdfGenerating}
            title="Download PDF"
            className="p-2.5 text-white bg-gradient-to-b from-red-500 to-red-700 rounded-lg hover:from-red-600 hover:to-red-800 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPdfGenerating ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            )}
          </button>
          <button onClick={handlePrint} className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg flex items-center gap-2 hover:from-gray-800 hover:to-black hover:shadow-md transition-all duration-200">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>

        {/* Report Container */}
        <div className="flex justify-center">
          <div ref={reportRef} className="w-full max-w-6xl bg-white rounded shadow-sm overflow-hidden">
          {/* Header - Centered, No Background */}
          <div className="text-center py-3 border-b-2 border-black">
            <h1 className="text-lg font-bold text-black uppercase tracking-wide">
              COTTON CLOTHING BD LTD
            </h1>
            <p className="text-xs text-black mt-0.5">
              PO SHEET - SIZE WISE QUANTITY
            </p>
            <p className="text-xs text-black mt-0.5 font-medium">
              Date: {currentDate}
            </p>
          </div>

          {/* Meta Info - Card Style */}
          <div className="flex flex-wrap justify-between items-center px-4 py-3 border-b border-gray-300 bg-gray-50 gap-2">
            <div className="flex flex-wrap gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Buyer</p>
                <p className="text-sm text-black font-bold">{data.metadata.buyer}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Style</p>
                <p className="text-sm text-black font-bold">{data.metadata.style}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Booking</p>
                <p className="text-sm text-black font-bold">{data.metadata.booking}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Season</p>
                <p className="text-sm text-black font-bold">{data.metadata.season}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Dept</p>
                <p className="text-sm text-black font-bold">{data.metadata.dept}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Item</p>
                <p className="text-sm text-black font-bold">{data.metadata.item}</p>
              </div>
            </div>
            <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 shadow-sm text-right">
              <p className="text-[10px] text-black uppercase tracking-wide font-medium">Grand Total</p>
              <p className="text-lg font-bold text-black">{data.grandTotal} pcs</p>
            </div>
          </div>

          {/* Tables */}
          <div className="p-3">
            {data.tables.map((table, idx) => (
              <div key={idx} className="mb-4">
                {/* Color Header */}
                <div className="px-3 py-1.5 text-xs font-bold uppercase text-black border border-[#e8a854]" style={{ backgroundColor: '#fed7aa' }}>
                  COLOR: {table.color}
                </div>

                {/* Table */}
                <table className="w-full text-xs border border-gray-400">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="px-2 py-1 text-left font-bold text-black border-b border-r border-gray-400 w-28 text-[11px]">PO No</th>
                      {table.sizes.map((size, i) => (
                        <th key={i} className="px-1 py-1 text-center font-bold text-black border-b border-r border-gray-400 text-sm bg-gray-200">{size}</th>
                      ))}
                      <th className="px-2 py-1 text-center font-bold text-black border-b border-gray-400 bg-gray-300 w-20 text-[11px]">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* PO Rows */}
                    {table.rows.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="px-2 py-1 font-bold text-black border-r border-b border-gray-300 text-[11px]">{row.poNo}</td>
                        {row.quantities.map((qty, qtyIdx) => (
                          <td key={qtyIdx} className={`px-1 py-1 text-center font-semibold border-r border-b border-gray-300 text-xs ${qty === 0 ? 'text-gray-400' : 'text-black'}`}>
                            {qty === 0 ? '-' : qty}
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center font-bold text-black border-b border-gray-300 bg-gray-50 text-xs">{row.total}</td>
                      </tr>
                    ))}
                    {/* Actual Qty - Highlighted */}
                    <tr className="bg-green-100">
                      <td className="px-2 py-1 font-bold text-black border-r border-b border-gray-300 text-sm bg-green-100">Actual Qty</td>
                      {table.actualQty.map((qty, i) => (
                        <td key={i} className="px-1 py-1 text-center font-bold text-black border-r border-b border-gray-300 text-sm bg-green-100">{qty}</td>
                      ))}
                      <td className="px-2 py-1 text-center font-bold text-black border-b border-gray-300 bg-green-100 text-sm">{table.actualTotal}</td>
                    </tr>
                    {/* Order Qty 3% - Highlighted */}
                    <tr className="bg-amber-100">
                      <td className="px-2 py-1 font-bold text-black border-r border-b border-gray-300 text-sm whitespace-nowrap bg-amber-100">Order Qty 3%</td>
                      {table.orderQty3Percent.map((qty, i) => (
                        <td key={i} className="px-1 py-1 text-center font-bold text-black border-r border-b border-gray-300 text-sm bg-amber-100">{qty}</td>
                      ))}
                      <td className="px-2 py-1 text-center font-bold text-black border-b border-gray-300 bg-amber-100 text-sm">{table.orderTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center py-2 border-t border-gray-300 bg-gray-50">
            <p className="text-[10px] text-black">
              Generated by <span className="font-bold">Mehedi Hasan</span>
            </p>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
