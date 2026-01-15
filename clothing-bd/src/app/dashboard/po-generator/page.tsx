'use client';

import { useState, useRef } from 'react';
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

export default function POGeneratorPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<POResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      setError('');
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch('/api/po', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to process files');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFiles(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePreview = () => {
    if (result) {
      sessionStorage.setItem('poPreviewData', JSON.stringify(result));
      router.push('/po-preview');
    }
  };

  const truncateText = (text: string, maxLength: number = 25) => {
    if (!text || text === 'N/A') return text;
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
          PO Sheet Generator
        </h1>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>
          Extract size-wise quantity data from Purchase Order PDFs
        </p>
      </div>

      {!result ? (
        <div style={{
          maxWidth: '480px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '24px',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                Select PDF Files
              </label>
              <div 
                style={{
                  border: '1px dashed #d1d5db',
                  borderRadius: '6px',
                  padding: '24px',
                  textAlign: 'center',
                  background: '#f9fafb',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}>
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                  Click to browse or drag files here
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af' }}>PDF files only</p>
              </div>
            </div>

            {files && files.length > 0 && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#166534', marginBottom: '6px' }}>
                  {files.length} file(s) selected
                </div>
                <div style={{ fontSize: '11px', color: '#15803d' }}>
                  {Array.from(files).slice(0, 3).map(f => f.name).join(', ')}
                  {files.length > 3 && ` +${files.length - 3} more`}
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '13px', color: '#b91c1c' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !files}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: isLoading || !files ? '#e5e7eb' : '#2563eb',
                color: isLoading || !files ? '#9ca3af' : '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isLoading || !files ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #9ca3af',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Processing...
                </>
              ) : (
                'Process Files'
              )}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: '#22c55e',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>Processing Complete</div>
                <div style={{ fontSize: '12px', color: '#15803d' }}>
                  {result.fileCount} file(s) | {result.tables.length} color(s) | Total: {result.grandTotal.toLocaleString()} pcs
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleReset} style={{
                padding: '8px 14px',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                color: '#374151',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                New Upload
              </button>
              <button onClick={handlePreview} style={{
                padding: '8px 14px',
                background: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                Print Preview
              </button>
            </div>
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
              Order Information
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Buyer', value: result.metadata.buyer },
                { label: 'Booking No', value: result.metadata.booking },
                { label: 'Style', value: truncateText(result.metadata.style, 20) },
                { label: 'Season', value: result.metadata.season },
                { label: 'Dept', value: result.metadata.dept },
                { label: 'Item', value: result.metadata.item },
              ].map((item, idx) => (
                <div key={idx}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: item.value === 'N/A' ? '#d1d5db' : '#111827' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.tables.map((table, tableIdx) => (
            <div key={tableIdx} style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '16px',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{table.color}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Actual: {table.actualTotal.toLocaleString()} | Order: {table.orderTotal.toLocaleString()}
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>PO No</th>
                      {table.sizes.map((size, idx) => (
                        <th key={idx} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 500, color: '#6b7280', borderBottom: '1px solid #e5e7eb', minWidth: '50px' }}>{size}</th>
                      ))}
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIdx) => (
                      <tr key={rowIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#374151' }}>{row.poNo}</td>
                        {row.quantities.map((qty, qtyIdx) => (
                          <td key={qtyIdx} style={{ padding: '8px 12px', textAlign: 'center', color: qty === 0 ? '#d1d5db' : '#374151' }}>
                            {qty === 0 ? '-' : qty.toLocaleString()}
                          </td>
                        ))}
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#374151' }}>{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#374151' }}>Actual Qty</td>
                      {table.actualQty.map((qty, idx) => (
                        <td key={idx} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>{qty.toLocaleString()}</td>
                      ))}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>{table.actualTotal.toLocaleString()}</td>
                    </tr>
                    <tr style={{ background: '#eff6ff' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1d4ed8' }}>Order Qty (+3%)</td>
                      {table.orderQty3Percent.map((qty, idx) => (
                        <td key={idx} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: '#1d4ed8' }}>{qty.toLocaleString()}</td>
                      ))}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>{table.orderTotal.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{
            background: '#1e3a8a',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Grand Total (All Colors)</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{result.grandTotal.toLocaleString()} pcs</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
