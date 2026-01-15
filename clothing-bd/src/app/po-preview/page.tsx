'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('poPreviewData');
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      router.push('/dashboard/po-generator');
    }
  }, [router]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.back();
  };

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      {/* Print Controls */}
      <div className="no-print" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={handleBack} style={{
            padding: '8px 12px',
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            color: '#374151',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            PO Sheet - {data.metadata.booking !== 'N/A' ? data.metadata.booking : 'Preview'}
          </span>
        </div>
        <button onClick={handlePrint} style={{
          padding: '8px 16px',
          background: '#2563eb',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
          </svg>
          Print
        </button>
      </div>

      {/* Print Content */}
      <div className="print-content" style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '80px 24px 24px',
        background: '#fff',
      }}>
        {/* Header */}
        <div style={{
          borderBottom: '2px solid #111827',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                PO SHEET - SIZE WISE QUANTITY
              </h1>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>Generated: {currentDate}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Grand Total</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>{data.grandTotal.toLocaleString()} pcs</div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', fontSize: '12px' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Buyer: </span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{data.metadata.buyer}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Booking: </span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{data.metadata.booking}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Style: </span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{data.metadata.style}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Season: </span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{data.metadata.season}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Dept: </span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{data.metadata.dept}</span>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Item: </span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{data.metadata.item}</span>
            </div>
          </div>
        </div>

        {/* Color Tables */}
        {data.tables.map((table, tableIdx) => (
          <div key={tableIdx} style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
            {/* Color Header */}
            <div style={{
              background: '#1e3a8a',
              color: '#fff',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              {table.color}
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#374151', border: '1px solid #e5e7eb' }}>PO No</th>
                  {table.sizes.map((size, idx) => (
                    <th key={idx} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600, color: '#374151', border: '1px solid #e5e7eb', minWidth: '45px' }}>{size}</th>
                  ))}
                  <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#374151', border: '1px solid #e5e7eb' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td style={{ padding: '6px 8px', fontWeight: 500, color: '#374151', border: '1px solid #e5e7eb' }}>{row.poNo}</td>
                    {row.quantities.map((qty, qtyIdx) => (
                      <td key={qtyIdx} style={{ padding: '6px 8px', textAlign: 'center', color: qty === 0 ? '#d1d5db' : '#374151', border: '1px solid #e5e7eb' }}>
                        {qty === 0 ? '-' : qty.toLocaleString()}
                      </td>
                    ))}
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 500, color: '#374151', border: '1px solid #e5e7eb' }}>{row.total.toLocaleString()}</td>
                  </tr>
                ))}
                {/* Actual Qty */}
                <tr style={{ background: '#f9fafb' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, color: '#111827', border: '1px solid #e5e7eb' }}>Actual Qty</td>
                  {table.actualQty.map((qty, idx) => (
                    <td key={idx} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#111827', border: '1px solid #e5e7eb' }}>{qty.toLocaleString()}</td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#111827', border: '1px solid #e5e7eb' }}>{table.actualTotal.toLocaleString()}</td>
                </tr>
                {/* Order Qty +3% */}
                <tr style={{ background: '#dbeafe' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 700, color: '#1e40af', border: '1px solid #e5e7eb' }}>Order Qty (+3%)</td>
                  {table.orderQty3Percent.map((qty, idx) => (
                    <td key={idx} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#1e40af', border: '1px solid #e5e7eb' }}>{qty.toLocaleString()}</td>
                  ))}
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1e40af', border: '1px solid #e5e7eb' }}>{table.orderTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Grand Total Footer */}
        <div style={{
          background: '#111827',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>GRAND TOTAL (ALL COLORS)</span>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>{data.grandTotal.toLocaleString()} pcs</span>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-content { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 both; margin: 10mm; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
