'use client';

import { useState } from 'react';

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
  success: boolean;
  data: BlockData[];
  refNo: string;
  meta: {
    buyer: string;
    style: string;
  };
}

export default function ClosingReportPage() {
  const [refNo, setRefNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNo.trim()) {
      setError('Please enter a booking number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refNo: refNo.trim() }),
      });

      const data: ReportData = await response.json();

      if (data.success) {
        // Store data in sessionStorage and open preview in new tab
        sessionStorage.setItem('closingReportData', JSON.stringify(data));
        window.open('/closing-preview', '_blank');
      } else {
        setError('Failed to fetch data. Please check the booking number.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Full Page Blur Overlay with Loading Animation */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.15)',
            padding: '48px 64px',
            textAlign: 'center',
            maxWidth: '420px',
          }}>
            {/* Animated Spinner */}
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 28px',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '5px solid #f3f4f6',
                borderRadius: '50%',
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '5px solid transparent',
                borderTopColor: '#f97316',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <div style={{
                position: 'absolute',
                inset: '12px',
                border: '5px solid transparent',
                borderTopColor: '#fb923c',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite reverse',
              }} />
              <div style={{
                position: 'absolute',
                inset: '24px',
                border: '5px solid transparent',
                borderTopColor: '#fdba74',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }} />
              {/* Center Icon */}
              <div style={{
                position: 'absolute',
                inset: '36px',
                backgroundColor: '#fff7ed',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                  <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            <h3 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1a2e',
              marginBottom: '10px',
            }}>
              Connecting to ERP System
            </h3>
            <p style={{
              fontSize: '15px',
              color: '#6b7280',
              marginBottom: '20px',
            }}>
              Fetching closing report data for <strong style={{ color: '#f97316' }}>{refNo}</strong>
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#f97316', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ width: '8px', height: '8px', backgroundColor: '#fb923c', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out 0.2s infinite' }} />
              <div style={{ width: '8px', height: '8px', backgroundColor: '#fdba74', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out 0.4s infinite' }} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' }}>
            Closing Report
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280' }}>
            Generate production closing reports from ERP system
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '40px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              borderRadius: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 10px 30px rgba(249, 115, 22, 0.3)',
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a2e', marginBottom: '8px' }}>
              Generate New Report
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Enter the booking number to fetch closing data
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Booking Number (IR/IB)
              </label>
              <input
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value.toUpperCase())}
                placeholder="e.g. IB-12345 or IR-67890"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  fontSize: '18px',
                  fontWeight: '600',
                  border: '2px solid #e5e7eb',
                  borderRadius: '14px',
                  backgroundColor: isLoading ? '#f3f4f6' : '#f9fafb',
                  color: '#1f2937',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                borderRadius: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 10px 30px rgba(249, 115, 22, 0.3)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Generate Report</span>
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div style={{
          marginTop: '24px',
          backgroundColor: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: '16px',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#c2410c', marginBottom: '4px' }}>
                How it works
              </h4>
              <p style={{ fontSize: '13px', color: '#9a3412', margin: 0, lineHeight: '1.6' }}>
                Enter your IR or IB booking number. The system will connect to ERP, fetch the closing data, 
                and open a preview page in a new tab with options to print or download as Excel.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}
