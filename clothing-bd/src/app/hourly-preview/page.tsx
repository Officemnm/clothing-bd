'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface TimeSlotData {
  slot1: number;
  slot2: number;
  slot3: number;
  total: number;
}

interface LineData {
  lineNo: string;
  buyer: string;
  timeSlots: TimeSlotData;
}

interface FloorData {
  floorName: string;
  lines: LineData[];
  subtotal: TimeSlotData;
}

interface BuyerSummary {
  buyerName: string;
  totalInput: number;
}

interface FactoryBuyerSummary {
  buyerName: string;
  sewingInput: number;
}

interface FactorySummary {
  buyerSummary: FactoryBuyerSummary[];
  totalSewingInput: number;
}

interface ReportData {
  success: boolean;
  date: string;
  floors: FloorData[];
  buyerSummary: BuyerSummary[];
  grandTotal: TimeSlotData;
  targetLine?: string;
  message?: string;
  currentSlot?: string;
  snapshotsAvailable?: {
    slot1: string | null;
    slot2: string | null;
    slot3: string | null;
  };
  factorySummary?: FactorySummary | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  role: string;
}

export default function HourlyPreviewPage() {
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
    const stored = sessionStorage.getItem('hourlyReportData');
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
      const link = document.createElement('a');
      link.download = `Hourly-Input-Report-${reportData.date}-${currentDate}.png`;
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
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 5;
      const contentWidth = pageWidth - (margin * 2);
      const imgRatio = rect.height / rect.width;
      const contentHeight = contentWidth * imgRatio;
      let finalWidth = contentWidth;
      let finalHeight = contentHeight;
      if (contentHeight > pageHeight - (margin * 2)) {
        finalHeight = pageHeight - (margin * 2);
        finalWidth = finalHeight / imgRatio;
      }
      const xOffset = (pageWidth - finalWidth) / 2;
      pdf.addImage(dataUrl, 'PNG', xOffset, margin, finalWidth, finalHeight);
      pdf.save(`Hourly-Input-Report-${reportData.date}-${currentDate}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Get line numbers for a specific floor only
  const getFloorLineNumbers = (floor: FloorData): string[] => {
    return floor.lines
      .map(line => line.lineNo)
      .sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      });
  };

  // Get line data for a specific floor and line number
  const getLineData = (floor: FloorData, lineNo: string): TimeSlotData | null => {
    const line = floor.lines.find(l => l.lineNo === lineNo);
    return line ? line.timeSlots : null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="relative w-12 h-12">
          <motion.div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
          <motion.div
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-sky-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-1 rounded-full border-[3px] border-transparent border-b-sky-300"
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
            onClick={() => router.push('/dashboard/daily-line-wise-input-report')}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-800 rounded hover:bg-gray-700"
          >
            Go to Daily Input Report
          </button>
        </div>
      </motion.div>
    );
  }

  const allLineNumbers = getFloorLineNumbers;

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 4mm; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50 p-2 font-sans">
        {/* Action Bar */}
        <div className="no-print max-w-4xl mx-auto mb-3 flex justify-end gap-3 p-3 bg-white rounded-xl shadow-md border border-gray-100">
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
          <div ref={reportRef} className="w-full max-w-4xl bg-white rounded shadow-sm overflow-hidden">
            {/* Header */}
            <div className="text-center py-3 border-b-2 border-black">
              <h1 className="text-lg font-bold text-black uppercase tracking-wide">
                COTTON CLOTHING BD LTD
              </h1>
              <p className="text-xs text-black mt-0.5">
                DAILY LINE WISE INPUT REPORT
              </p>
              <p className="text-xs text-black mt-0.5 font-medium">
                Report Date: {reportData.date} | Generated: {currentDate}
              </p>
            </div>

            {/* Top Summary Section - Vertical Layout with Reduced Gaps */}
            <div className="mx-3 my-2 grid grid-cols-2 gap-4 border-b border-black pb-2">
              {/* Left: Slot-wise Production Summary */}
              <div>
                <h3 className="text-xs font-bold text-black uppercase mb-1 border-b border-black pb-0.5">Hourly Production</h3>
                <div className="space-y-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-black">8AM - 12:45PM</span>
                    <span className="text-black font-bold">{reportData.grandTotal.slot1.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-black">12:45PM - 5PM</span>
                    <span className="text-black font-bold">{reportData.grandTotal.slot2.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-black">5PM - 9PM</span>
                    <span className="text-black font-bold">{reportData.grandTotal.slot3.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-black mt-0.5 pt-0.5">
                    <span className="text-black font-bold">TOTAL</span>
                    <span className="text-black font-bold">{reportData.grandTotal.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Right: Buyer-wise Sewing Input */}
              <div>
                <h3 className="text-xs font-bold text-black uppercase mb-1 border-b border-black pb-0.5">Buyer Wise Input</h3>
                <div className="space-y-0">
                  {reportData.factorySummary && reportData.factorySummary.buyerSummary.length > 0 ? (
                    <>
                      {reportData.factorySummary.buyerSummary.map((buyer, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-black truncate max-w-[140px]">{buyer.buyerName}</span>
                          <span className="text-black font-bold">{buyer.sewingInput.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs border-t border-black mt-0.5 pt-0.5">
                        <span className="text-black font-bold">TOTAL</span>
                        <span className="text-black font-bold">
                          {reportData.factorySummary.buyerSummary.reduce((sum, b) => sum + b.sewingInput, 0).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-black text-xs">No buyer data</div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Data Table - Like Closing Report */}
            <div className="p-2">
              {reportData.floors.map((floor, floorIdx) => {
                const floorLineNumbers = getFloorLineNumbers(floor);
                return (
                <div key={floorIdx} className="mb-3" style={{ border: '1px solid black', borderRadius: '2px', overflow: 'hidden' }}>
                  {/* Floor Header */}
                  <div className="px-3 py-1.5 text-base font-bold text-black" style={{ backgroundColor: '#bfdbfe', borderBottom: '1px solid black' }}>
                    {floor.floorName}
                  </div>

                  {/* Table */}
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="text-left font-bold text-black text-base whitespace-nowrap" style={{ border: '1px solid black', padding: '4px 6px', width: '140px' }}>TIME/LINE</th>
                        {floorLineNumbers.map((lineNo, i) => (
                          <th key={i} className="text-center font-bold text-black text-base" style={{ border: '1px solid black', padding: '4px 4px' }}>
                            {lineNo}
                          </th>
                        ))}
                        <th className="text-center font-bold text-black bg-gray-300 text-base" style={{ border: '1px solid black', padding: '4px 6px', width: '80px' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 8:00 AM - 12:45 PM */}
                      <tr className="bg-gray-50">
                        <td className="font-semibold text-black text-base whitespace-nowrap" style={{ border: '1px solid black', padding: '4px 6px' }}>8AM - 12:45PM</td>
                        {floorLineNumbers.map((lineNo, i) => {
                          const data = getLineData(floor, lineNo);
                          const val = data ? data.slot1 : 0;
                          return (
                            <td key={i} className="text-center font-medium text-black text-base" style={{ border: '1px solid black', padding: '4px 4px' }}>
                              {val === 0 ? '-' : val}
                            </td>
                          );
                        })}
                        <td className="text-center font-bold text-black bg-gray-100 text-base" style={{ border: '1px solid black', padding: '4px 6px' }}>
                          {floor.subtotal.slot1 === 0 ? '-' : floor.subtotal.slot1}
                        </td>
                      </tr>
                      
                      {/* 12:45 PM - 5:00 PM */}
                      <tr>
                        <td className="font-semibold text-black text-base whitespace-nowrap" style={{ border: '1px solid black', padding: '4px 6px' }}>12:45PM - 5PM</td>
                        {floorLineNumbers.map((lineNo, i) => {
                          const data = getLineData(floor, lineNo);
                          const val = data ? data.slot2 : 0;
                          return (
                            <td key={i} className="text-center font-medium text-black text-base" style={{ border: '1px solid black', padding: '4px 4px' }}>
                              {val === 0 ? '-' : val}
                            </td>
                          );
                        })}
                        <td className="text-center font-bold text-black bg-gray-100 text-base" style={{ border: '1px solid black', padding: '4px 6px' }}>
                          {floor.subtotal.slot2 === 0 ? '-' : floor.subtotal.slot2}
                        </td>
                      </tr>
                      
                      {/* 5:00 PM - 9:00 PM */}
                      <tr className="bg-gray-50">
                        <td className="font-semibold text-black text-base whitespace-nowrap" style={{ border: '1px solid black', padding: '4px 6px' }}>5PM - 9PM</td>
                        {floorLineNumbers.map((lineNo, i) => {
                          const data = getLineData(floor, lineNo);
                          const val = data ? data.slot3 : 0;
                          return (
                            <td key={i} className="text-center font-medium text-black text-base" style={{ border: '1px solid black', padding: '4px 4px' }}>
                              {val === 0 ? '-' : val}
                            </td>
                          );
                        })}
                        <td className="text-center font-bold text-black bg-gray-100 text-base" style={{ border: '1px solid black', padding: '4px 6px' }}>
                          {floor.subtotal.slot3 === 0 ? '-' : floor.subtotal.slot3}
                        </td>
                      </tr>
                      
                      {/* Grand Total Row */}
                      <tr className="bg-green-100">
                        <td className="font-bold text-black text-base whitespace-nowrap" style={{ border: '1px solid black', padding: '4px 6px' }}>TOTAL</td>
                        {floorLineNumbers.map((lineNo, i) => {
                          const data = getLineData(floor, lineNo);
                          const val = data ? data.total : 0;
                          return (
                            <td key={i} className="text-center font-bold text-black text-base" style={{ border: '1px solid black', padding: '4px 4px' }}>
                              {val === 0 ? '-' : val}
                            </td>
                          );
                        })}
                        <td className="text-center font-bold text-black bg-green-200 text-base" style={{ border: '1px solid black', padding: '4px 6px' }}>
                          {floor.subtotal.total === 0 ? '-' : floor.subtotal.total}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                );
              })}
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
