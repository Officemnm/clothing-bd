'use client';

import { useEffect, useState } from 'react';

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

export default function ClosingPreviewPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('closingReportData');
    if (stored) {
      setReportData(JSON.parse(stored));
    }
    setCurrentDate(new Date().toLocaleDateString('en-GB'));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    if (reportData) {
      window.location.href = `/api/closing/excel?ref=${reportData.refNo}`;
    }
  };

  const handleBack = () => {
    window.close();
  };

  if (!reportData) {
    return (
      <html>
        <body style={{ margin: 0, padding: 0 }}>
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontFamily: 'Arial, sans-serif',
          }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#000', marginBottom: '12px' }}>
                No Report Data
              </h2>
              <p style={{ color: '#000', marginBottom: '24px' }}>Please generate a report first.</p>
              <button
                onClick={() => window.close()}
                style={{
                  padding: '10px 28px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'white',
                  backgroundColor: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Close Window
              </button>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html>
      <head>
        <title>Closing Report - {reportData.refNo}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
            color: #000;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }
          table { font-family: Arial, sans-serif; border-collapse: collapse; }
          @media print {
            @page { margin: 5mm; size: both; }
            body { background: white !important; }
            .no-print { display: none !important; }
            .print-container { box-shadow: none !important; }
          }
        `}</style>
      </head>
      <body>
        <div style={{ minHeight: '100vh', padding: '12px' }}>
          {/* Action Bar */}
          <div className="no-print" style={{
            maxWidth: '1600px',
            margin: '0 auto 12px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
          }}>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#000',
                backgroundColor: '#fff',
                border: '1px solid #000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#fff',
                backgroundColor: '#000',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={handleDownloadExcel}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#fff',
                backgroundColor: '#0d6939',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel
            </button>
          </div>

          {/* Report Container */}
          <div className="print-container" style={{
            maxWidth: '1600px',
            margin: '0 auto',
            backgroundColor: 'white',
          }}>
            {/* Header - Compact */}
            <div style={{
              textAlign: 'center',
              padding: '12px 20px',
              borderBottom: '2px solid #000',
            }}>
              <h1 style={{
                fontSize: '22px',
                fontWeight: '900',
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '2px',
              }}>
                COTTON CLOTHING BD LTD
              </h1>
              <h2 style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                CLOSING REPORT [ INPUT SECTION ] &nbsp;|&nbsp; Date: {currentDate}
              </h2>
            </div>

            {/* Info Section - Compact */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 20px',
              backgroundColor: '#f8f8f8',
              borderBottom: '1px solid #ccc',
            }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#000' }}>
                  Buyer: <span style={{ fontWeight: '900' }}>{reportData.meta.buyer}</span>
                </p>
                <p style={{ fontSize: '14px', fontWeight: '700', color: '#000' }}>
                  Style: <span style={{ fontWeight: '900' }}>{reportData.meta.style}</span>
                </p>
              </div>
              <div style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '6px 16px',
                fontWeight: '900',
                fontSize: '14px',
              }}>
                {reportData.refNo}
              </div>
            </div>

            {/* Data Tables - Compact */}
            <div style={{ padding: '10px 20px' }}>
              {reportData.data.map((block, blockIndex) => (
                <div key={blockIndex} style={{ marginBottom: '16px' }}>
                  {/* Color Header */}
                  <div style={{
                    backgroundColor: '#000',
                    color: '#fff',
                    padding: '6px 12px',
                    fontSize: '14px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    COLOR: {block.color}
                  </div>

                  {/* Table */}
                  <table style={{ width: '100%', fontSize: '15px', border: '2px solid #000' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e8e8e8' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '900', fontSize: '14px', color: '#000', borderBottom: '2px solid #000', borderRight: '1px solid #999', width: '120px' }}>METRICS</th>
                        {block.sizes.map((s, i) => (
                          <th key={i} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '900', fontSize: '15px', color: '#000', borderBottom: '2px solid #000', borderRight: '1px solid #999', backgroundColor: '#d4d4d4' }}>{s.size}</th>
                        ))}
                        <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '900', fontSize: '15px', color: '#fff', borderBottom: '2px solid #000', backgroundColor: '#000' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Order Qty 3% - Light blue background */}
                      <tr style={{ backgroundColor: '#e3f2fd' }}>
                        <td style={{ padding: '5px 8px', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#e3f2fd', borderRight: '2px solid #64b5f6', borderBottom: '1px solid #90caf9' }}>Order Qty 3%</td>
                        {block.sizes.map((s, i) => (
                          <td key={i} style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '800', fontSize: '15px', color: '#000', backgroundColor: '#e3f2fd', borderRight: '1px solid #90caf9', borderBottom: '1px solid #90caf9' }}>{s.qty3.toLocaleString()}</td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '900', fontSize: '15px', color: '#fff', backgroundColor: '#1976d2', borderBottom: '1px solid #90caf9' }}>{block.totals.tot3.toLocaleString()}</td>
                      </tr>
                      {/* Actual Qty */}
                      <tr>
                        <td style={{ padding: '5px 8px', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#fafafa', borderRight: '2px solid #ccc', borderBottom: '1px solid #ddd' }}>Actual Qty</td>
                        {block.sizes.map((s, i) => (
                          <td key={i} style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '700', fontSize: '15px', color: '#000', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>{s.actual.toLocaleString()}</td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '900', fontSize: '15px', color: '#000', backgroundColor: '#e0e0e0', borderBottom: '1px solid #ddd' }}>{block.totals.totAct.toLocaleString()}</td>
                      </tr>
                      {/* Cutting QC */}
                      <tr>
                        <td style={{ padding: '5px 8px', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#fafafa', borderRight: '2px solid #ccc', borderBottom: '1px solid #ddd' }}>Cutting QC</td>
                        {block.sizes.map((s, i) => (
                          <td key={i} style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '700', fontSize: '15px', color: '#000', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>{s.cuttingQc.toLocaleString()}</td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '900', fontSize: '15px', color: '#000', backgroundColor: '#e0e0e0', borderBottom: '1px solid #ddd' }}>{block.totals.totCut.toLocaleString()}</td>
                      </tr>
                      {/* Input Qty - Green highlight */}
                      <tr style={{ backgroundColor: '#e8f5e9' }}>
                        <td style={{ padding: '5px 8px', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#e8f5e9', borderRight: '2px solid #66bb6a', borderBottom: '1px solid #81c784' }}>Input Qty</td>
                        {block.sizes.map((s, i) => (
                          <td key={i} style={{ padding: '5px 8px', textAlign: 'center', color: '#000', fontWeight: '900', fontSize: '16px', backgroundColor: '#e8f5e9', borderRight: '1px solid #81c784', borderBottom: '1px solid #81c784' }}>{s.inputQty.toLocaleString()}</td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: '#fff', fontWeight: '900', fontSize: '16px', backgroundColor: '#2e7d32', borderBottom: '1px solid #81c784' }}>{block.totals.totInp.toLocaleString()}</td>
                      </tr>
                      {/* Balance */}
                      <tr>
                        <td style={{ padding: '5px 8px', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#fafafa', borderRight: '2px solid #ccc', borderBottom: '1px solid #ddd' }}>Balance</td>
                        {block.sizes.map((s, i) => (
                          <td key={i} style={{ padding: '5px 8px', textAlign: 'center', color: s.balance !== 0 ? '#c62828' : '#000', fontWeight: '700', fontSize: '15px', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>{s.balance.toLocaleString()}</td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: block.totals.totBal !== 0 ? '#c62828' : '#000', fontWeight: '900', fontSize: '15px', backgroundColor: '#e0e0e0', borderBottom: '1px solid #ddd' }}>{block.totals.totBal.toLocaleString()}</td>
                      </tr>
                      {/* Short/Plus */}
                      <tr>
                        <td style={{ padding: '5px 8px', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#fafafa', borderRight: '2px solid #ccc', borderBottom: '1px solid #ddd' }}>Short/Plus</td>
                        {block.sizes.map((s, i) => (
                          <td key={i} style={{ padding: '5px 8px', textAlign: 'center', color: s.shortPlus >= 0 ? '#1b5e20' : '#c62828', fontWeight: '800', fontSize: '15px', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>{s.shortPlus.toLocaleString()}</td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: block.totals.totSp >= 0 ? '#1b5e20' : '#c62828', fontWeight: '900', fontSize: '15px', backgroundColor: '#e0e0e0', borderBottom: '1px solid #ddd' }}>{block.totals.totSp.toLocaleString()}</td>
                      </tr>
                      {/* Percentage */}
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <td style={{ padding: '5px 8px', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#f5f5f5', borderRight: '2px solid #ccc', borderBottom: '2px solid #000' }}>Percentage %</td>
                        {block.sizes.map((s, i) => (
                          <td key={i} style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '700', fontSize: '14px', color: '#000', backgroundColor: '#f5f5f5', borderRight: '1px solid #ddd', borderBottom: '2px solid #000' }}>{s.percentage.toFixed(2)}%</td>
                        ))}
                        <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '900', fontSize: '14px', color: '#000', backgroundColor: '#e0e0e0', borderBottom: '2px solid #000' }}>{block.totals.totPct.toFixed(2)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Footer - Compact */}
            <div style={{
              textAlign: 'center',
              padding: '8px',
              borderTop: '1px solid #ccc',
              backgroundColor: '#f8f8f8',
            }}>
              <p style={{ fontSize: '11px', color: '#000' }}>
                Report Generated By <span style={{ fontWeight: '900' }}>Mehedi Hasan</span>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
