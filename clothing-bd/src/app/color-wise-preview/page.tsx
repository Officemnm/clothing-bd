'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ColorWiseChallanItem {
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

interface ColorGroup {
  color: string;
  items: ColorWiseChallanItem[];
  subTotal: number;
}

interface ReportData {
  success: boolean;
  message: string;
  data: ColorGroup[];
  grandTotal: number;
  companyId: number;
  totalChallans: number;
}

interface UserData {
  firstName: string;
  lastName: string;
  username: string;
  role: string;
}

export default function ColorWisePreviewPage() {
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
    const stored = sessionStorage.getItem('colorWiseReportData');
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

  const handleOpenBundle = (item: ColorWiseChallanItem) => {
    const params = new URLSearchParams({
      companyId: String(item.companyId),
      systemId: item.systemId,
    });
    window.open(`/api/challan-bundle?${params.toString()}`, '_blank');
  };

  const handleScreenshot = async () => {
    if (!reportRef.current || !reportData) return;
    setIsCapturing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 4,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `Color-Wise-Report-${currentDate}.png`;
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
        pixelRatio: 3,
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
      pdf.save(`Color-Wise-Report-${currentDate}.pdf`);
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
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-violet-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-1 rounded-full border-[3px] border-transparent border-b-purple-300"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.success) {
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
          <p className="text-gray-600 mb-5 text-sm">Please generate a color-wise report first.</p>
          <button
            onClick={() => router.push('/dashboard/challan-wise-input-report')}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-800 rounded hover:bg-gray-700"
          >
            Go to Challan Wise Input Report
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
            className="p-2.5 text-white bg-gradient-to-b from-violet-500 to-violet-700 rounded-lg hover:from-violet-600 hover:to-violet-800 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                COLOR WISE INPUT REPORT
              </p>
              <p className="text-xs text-black mt-0.5 font-medium">
                Generated: {currentDate}
              </p>
            </div>

            {/* Top Summary Section */}
            <div className="mx-3 my-2 grid grid-cols-2 gap-4 border-b border-black pb-2">
              <div>
                <h3 className="text-xs font-bold text-black uppercase mb-1 border-b border-black pb-0.5">Summary</h3>
                <div className="space-y-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-black">Total Challans</span>
                    <span className="text-black font-bold">{reportData.totalChallans}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-black">Total Colors</span>
                    <span className="text-black font-bold">{reportData.data.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-black">Company ID</span>
                    <span className="text-black font-bold">{reportData.companyId}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-black mt-0.5 pt-0.5">
                    <span className="text-black font-bold">GRAND TOTAL</span>
                    <span className="text-black font-bold">{reportData.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-black uppercase mb-1 border-b border-black pb-0.5">Color Wise</h3>
                <div className="space-y-0">
                  {reportData.data.map((group, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-black truncate max-w-[140px]">{group.color}</span>
                      <span className="text-black font-bold">{group.subTotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Color Groups */}
            <div className="p-2">
              {reportData.data.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-3" style={{ border: '1px solid black', borderRadius: '2px', overflow: 'hidden' }}>
                  {/* Group Header */}
                  <div className="px-3 py-1.5 text-base font-bold text-black" style={{ backgroundColor: '#c4b5fd', borderBottom: '1px solid black' }}>
                    {group.color} (Sub Total: {group.subTotal.toLocaleString()})
                  </div>

                  {/* Table */}
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="text-center font-bold text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px', width: '40px' }}>#</th>
                        <th className="text-left font-bold text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>DATE</th>
                        <th className="text-left font-bold text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>CHALLAN NO</th>
                        <th className="text-left font-bold text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>BUYER</th>
                        <th className="text-left font-bold text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>STYLE</th>
                        <th className="text-left font-bold text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>LINE</th>
                        <th className="text-right font-bold text-black text-sm bg-gray-300" style={{ border: '1px solid black', padding: '4px 6px', width: '80px' }}>QTY</th>
                        <th className="text-center font-bold text-black text-sm no-print" style={{ border: '1px solid black', padding: '4px 6px', width: '50px' }}>VIEW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, index) => (
                        <tr key={item.challan} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="text-center text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>{index + 1}</td>
                          <td className="text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>{item.date}</td>
                          <td className="text-black text-sm font-medium" style={{ border: '1px solid black', padding: '4px 6px', color: '#6d28d9' }}>{item.challan}</td>
                          <td className="text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>{item.buyer}</td>
                          <td className="text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>{item.style}</td>
                          <td className="text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>{item.line}</td>
                          <td className="text-right text-black text-sm font-medium bg-gray-100" style={{ border: '1px solid black', padding: '4px 6px' }}>{item.qty.toLocaleString()}</td>
                          <td className="text-center no-print" style={{ border: '1px solid black', padding: '4px 6px' }}>
                            {item.systemId && (
                              <button
                                onClick={() => handleOpenBundle(item)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="View Bundle Details"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-green-100">
                        <td colSpan={6} className="text-right font-bold text-black text-sm" style={{ border: '1px solid black', padding: '4px 6px' }}>SUB TOTAL</td>
                        <td className="text-right font-bold text-black text-sm bg-green-200" style={{ border: '1px solid black', padding: '4px 6px' }}>{group.subTotal.toLocaleString()}</td>
                        <td className="no-print" style={{ border: '1px solid black', padding: '4px 6px' }}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}

              {/* Grand Total */}
              <div className="mt-2 p-2 bg-gray-800 text-white rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">GRAND TOTAL PRODUCTION</span>
                  <span className="text-lg font-bold">{reportData.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center py-2 border-t border-gray-300 bg-gray-50">
              <p className="text-[10px] text-black">
                Generated by <span className="font-bold">
                  {user?.role === 'admin' || user?.role === 'moderator'
                    ? 'Mehedi Hasan'
                    : user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Loading...'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
