'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface SizeData {
  size: string;
  actual: number;
  qty3: number;
  cuttingQc: number;
  inputQty: number;
  balance: number;
  shortPlus: number;
  percentage: number;
}

interface BlockData {
  color: string;
  style: string;
  buyer: string;
  sizes: SizeData[];
  totals: {
    tot3: number;
    totAct: number;
    totCut: number;
    totInp: number;
    totBal: number;
    totSp: number;
    totPct: number;
  };
}

interface ReportData {
  data: BlockData[];
  refNo: string;
  meta: {
    buyer: string;
    style: string;
  };
}

interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  role: string;
}

export default function ClosingPreviewPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('closingReportData');
    if (stored) {
      setReportData(JSON.parse(stored));
    }
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setCurrentDate(`${day}-${month}-${year}`);
    setCurrentTime(`${hours}:${minutes}`);
    
    // Load user data
    const loadUser = async () => {
      try {
        const response = await fetch('/api/user', { cache: 'no-store', credentials: 'include' });
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        }
      } catch { /* ignore */ }
    };
    loadUser();
    setIsLoading(false);
  }, []);

  const handlePrint = () => window.print();
  const handleDownloadExcel = () => {
    if (reportData) window.location.href = `/api/closing/excel?ref=${reportData.refNo}`;
  };
  const handleBack = () => router.back();

  const handleScreenshot = async () => {
    if (!reportRef.current || !reportData) return;
    
    setIsCapturing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 6,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      
      // Download the image
      const link = document.createElement('a');
      link.download = `Closing-Report-${reportData.refNo}-${currentDate}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !reportData) return;
    
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
      pdf.save(`Closing-Report-${reportData.refNo}-${currentDate}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="relative w-12 h-12">
          <motion.div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
          <motion.div
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-teal-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-1 rounded-full border-[3px] border-transparent border-b-teal-300"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    );
  }

  if (!reportData) {
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
          <h2 className="text-lg font-semibold text-black mb-2">No Report Data</h2>
          <p className="text-gray-600 mb-5 text-sm">Please generate a report first.</p>
          <button
            onClick={() => router.push('/dashboard/closing-report')}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-800 rounded hover:bg-gray-700"
          >
            Go to Closing Report
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
        .compact-cell {
          padding-left: 2px !important;
          padding-right: 2px !important;
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
          <button onClick={handleDownloadExcel} className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-b from-green-600 to-green-800 rounded-lg flex items-center gap-2 hover:from-green-700 hover:to-green-900 hover:shadow-md transition-all duration-200">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Excel
          </button>
        </div>

        {/* Report Container - Wrapper for centering */}
        <div className="flex justify-center">
          <div ref={reportRef} className="w-full max-w-6xl bg-white rounded shadow-sm overflow-hidden">
            {/* Header - Centered, No Background */}
            <div className="text-center py-3 border-b-2 border-black">
              <h1 className="text-lg font-bold text-black uppercase tracking-wide">
                COTTON CLOTHING BD LTD
              </h1>
              <p className="text-xs text-black mt-0.5">
                CLOSING REPORT [ INPUT SECTION ]
              </p>
              <p className="text-xs text-black mt-0.5 font-medium">
                Date: {currentDate}
              </p>
            </div>

          {/* Meta Info - Card Style */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-300 bg-gray-50">
            <div className="flex gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Buyer</p>
                <p className="text-sm text-black font-bold">{reportData.meta.buyer}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm">
                <p className="text-[10px] text-black uppercase tracking-wide font-medium">Style</p>
                <p className="text-sm text-black font-bold">{reportData.meta.style}</p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 shadow-sm text-right">
              <p className="text-[10px] text-black uppercase tracking-wide font-medium">IR/IB NO</p>
              <p className="text-sm text-black font-bold">{reportData.refNo}</p>
            </div>
          </div>

          {/* Tables */}
          <div className="p-1">
            {reportData.data.map((block, idx) => (
              <div key={idx} className="mb-1" style={{ border: '1px solid black', borderRadius: '2px', overflow: 'hidden' }}>
                {/* Color Header - Light Orange */}
                <div className="px-1 text-sm font-bold uppercase text-black" style={{ backgroundColor: '#fed7aa', borderBottom: '1px solid black', lineHeight: '1.3' }}>
                  {block.color}
                </div>

                {/* Table */}
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="text-left font-bold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px', width: 'auto' }}>SIZE</th>
                      {block.sizes.map((s, i) => (
                        <th key={i} className="text-center font-bold text-black bg-gray-200 text-sm" style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.size}</th>
                      ))}
                      <th className="text-center font-bold text-black bg-gray-300 text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Order Qty 3% */}
                    <tr className="bg-gray-50">
                      <td className="font-bold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>Ord Qty 3%</td>
                      {block.sizes.map((s, i) => (
                        <td key={i} className="text-center font-bold text-black text-sm" style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.qty3}</td>
                      ))}
                      <td className="text-center font-bold text-black bg-gray-100 text-sm" style={{ border: '0.5px solid black', padding: '0px 3px' }}>{block.totals.tot3}</td>
                    </tr>
                    {/* Actual Qty */}
                    <tr>
                      <td className="font-semibold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>Actual Qty</td>
                      {block.sizes.map((s, i) => (
                        <td key={i} className="text-center font-semibold text-black text-sm" style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.actual}</td>
                      ))}
                      <td className="text-center font-bold text-black bg-gray-50 text-sm" style={{ border: '0.5px solid black', padding: '0px 3px' }}>{block.totals.totAct}</td>
                    </tr>
                    {/* Cutting QC */}
                    <tr>
                      <td className="font-semibold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>Cutting QC</td>
                      {block.sizes.map((s, i) => (
                        <td key={i} className="text-center font-semibold text-black text-sm" style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.cuttingQc}</td>
                      ))}
                      <td className="text-center font-bold text-black bg-gray-50 text-sm" style={{ border: '0.5px solid black', padding: '0px 3px' }}>{block.totals.totCut}</td>
                    </tr>
                    {/* Input Qty */}
                    <tr>
                      <td className="font-bold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>Input Qty</td>
                      {block.sizes.map((s, i) => (
                        <td key={i} className="text-center font-bold text-black text-sm" style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.inputQty}</td>
                      ))}
                      <td className="text-center font-bold text-black bg-gray-100 text-sm" style={{ border: '0.5px solid black', padding: '0px 3px' }}>{block.totals.totInp}</td>
                    </tr>
                    {/* Balance */}
                    <tr>
                      <td className="font-semibold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>Balance</td>
                      {block.sizes.map((s, i) => (
                        <td key={i} className="text-center font-semibold text-black text-sm" style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.balance}</td>
                      ))}
                      <td className="text-center font-bold text-black bg-gray-50 text-sm" style={{ border: '0.5px solid black', padding: '0px 3px' }}>{block.totals.totBal}</td>
                    </tr>
                    {/* Short/Plus */}
                    <tr>
                      <td className="font-semibold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>Short/Plus</td>
                      {block.sizes.map((s, i) => (
                        <td key={i} className={`text-center font-bold text-black text-sm ${s.shortPlus >= 0 ? 'bg-green-100' : 'bg-red-100'}`} style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.shortPlus}</td>
                      ))}
                      <td className={`text-center font-bold text-black text-sm ${block.totals.totSp >= 0 ? 'bg-green-200' : 'bg-red-200'}`} style={{ border: '0.5px solid black', padding: '0px 3px' }}>{block.totals.totSp}</td>
                    </tr>
                    {/* Percentage */}
                    <tr>
                      <td className="font-semibold text-black text-sm whitespace-nowrap" style={{ border: '0.5px solid black', padding: '0px 3px' }}>Percentage</td>
                      {block.sizes.map((s, i) => (
                        <td key={i} className="text-center font-semibold text-black text-xs" style={{ border: '0.5px solid black', padding: '0px 2px' }}>{s.percentage.toFixed(2)}%</td>
                      ))}
                      <td className="text-center font-bold text-black bg-gray-50 text-xs" style={{ border: '0.5px solid black', padding: '0px 3px' }}>{block.totals.totPct.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Footer */}
          {user?.role === 'admin' || user?.role === 'moderator' ? (
            <div className="text-center py-2 border-t border-gray-300 bg-gray-50">
              <p className="text-[10px] text-black">
                Generated by <span className="font-bold">Mehedi Hasan</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-center px-3 sm:px-4 py-2 border-t border-gray-300 bg-gray-50 gap-1 sm:gap-0">
              <div className="text-center sm:text-left">
                <p className="text-[9px] sm:text-[10px] text-gray-600">Generated By</p>
                <p className="text-[10px] sm:text-xs text-black font-semibold">
                  {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Loading...'}
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-600">
                  {currentDate} {currentTime}
                </p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-[9px] sm:text-[10px] text-gray-600">Design By</p>
                <p className="text-[10px] sm:text-xs text-black font-bold">
                  Mehedi Hasan
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-600">
                  © Clotton Clothing BD Ltd.
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
