'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Challan {
  date: string;
  line: string;
  color: string;
  size: string;
  qty: number;
  itemType?: 'Top' | 'Btm';
}

interface BookingData {
  ref: string;
  buyer: string;
  style: string;
  colors: string[];
  challans: Challan[];
  lastUpdated: string;
}

interface UserData {
  username: string;
  role: string;
}

function AccessoriesPreviewContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || '';
  const itemTypeParam = searchParams.get('itemType') as 'Top' | 'Btm' | null;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ref) {
      loadBooking();
      loadUser();
    }
  }, [ref]);

  const loadBooking = async () => {
    try {
      const response = await fetch(`/api/accessories/${ref}`);
      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
      } else {
        setError(data.message || 'Booking not found');
      }
    } catch {
      setError('Failed to load booking');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const response = await fetch('/api/user', { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      }
    } catch { /* ignore */ }
  };

  const handlePrint = () => {
    window.print();
  };

  // Normalize quantities to numbers to avoid string concatenation issues
  const normalizedChallans = (booking?.challans || []).map((c) => ({
    ...c,
    qty: Number(c.qty) || 0,
  }));

  const totalQty = normalizedChallans.reduce((sum, c) => sum + c.qty, 0);

  // Calculate line-wise summary
  const lineSummary: { [line: string]: number } = {};
  normalizedChallans.forEach((c) => {
    if (!lineSummary[c.line]) lineSummary[c.line] = 0;
    lineSummary[c.line] += c.qty;
  });

  // Get today's date in DD-MM-YYYY format
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#fff',
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#2c3e50',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280' }}>Loading accessories data...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!ref) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#fff',
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
            No Reference Provided
          </h2>
          <p style={{ color: '#6b7280' }}>Please provide a booking reference in the URL.</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#fff',
        fontFamily: "'Poppins', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
            Booking Not Found
          </h2>
          <p style={{ color: '#6b7280' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
        
        body {
          font-family: 'Poppins', sans-serif;
          background: #fff;
          padding: 20px;
          color: #000;
          margin: 0;
        }
        
        @media print {
          .no-print { display: none !important; }
          .container { border: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          body { padding: 0 !important; }
          .main-table th { 
            background: #2c3e50 !important; 
            color: white !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .total-box {
            background: #ddd !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* No Print Buttons */}
      <div className="no-print" style={{ marginBottom: '20px', textAlign: 'right', maxWidth: '1000px', margin: '0 auto 20px' }}>
        <a 
          href={`/dashboard/accessories/${ref}`}
          style={{
            padding: '8px 20px',
            background: '#2c3e50',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block',
            borderRadius: '4px',
            fontSize: '14px',
            marginRight: '10px',
          }}
        >
          Back
        </a>
        <button 
          onClick={handlePrint}
          style={{
            padding: '8px 20px',
            background: '#2c3e50',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          🖨️ Print
        </button>
      </div>

      {/* Main Container */}
      <div className="container" style={{
        maxWidth: '1000px',
        margin: '0 auto',
        border: '2px solid #000',
        padding: '20px',
        minHeight: '90vh',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          borderBottom: '2px solid #000',
          paddingBottom: '10px',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 800, textTransform: 'uppercase', color: '#2c3e50', lineHeight: 1 }}>
            COTTON CLOTHING BD LTD
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#444', marginTop: '5px', marginBottom: '10px' }}>
            Kazi Tower, 27 Road, Gazipura, Tongi, Gazipur.
          </div>
          <div style={{
            background: '#2c3e50',
            color: 'white',
            padding: '5px 25px',
            display: 'inline-block',
            fontWeight: 'bold',
            fontSize: '18px',
            borderRadius: '4px',
          }}>
            ACCESSORIES DELIVERY CHALLAN
          </div>
        </div>

        {/* Info Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
        }}>
          {/* Left Info */}
          <div style={{
            flex: 2,
            border: '1px dashed #555',
            padding: '15px',
            marginRight: '15px',
          }}>
            <div style={{ display: 'flex', marginBottom: '5px', fontSize: '14px', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, width: '80px', color: '#444' }}>Booking:</span>
              <span style={{ border: '2px solid #000', padding: '2px 8px', display: 'inline-block', fontWeight: 900 }}>
                {booking.ref}
              </span>
            </div>
            <div style={{ display: 'flex', marginBottom: '5px', fontSize: '14px', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, width: '80px', color: '#444' }}>Buyer:</span>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#000' }}>{booking.buyer}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '5px', fontSize: '14px', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, width: '80px', color: '#444' }}>Style:</span>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#000' }}>{booking.style}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '5px', fontSize: '14px', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, width: '80px', color: '#444' }}>Date:</span>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#000' }}>{todayStr}</span>
            </div>
          </div>

          {/* Right Info */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            borderLeft: '1px solid #ddd',
            paddingLeft: '15px',
          }}>
            <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 700 }}>
              <span style={{ color: '#555' }}>Store:</span> Clothing General Store
            </div>
            <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 700 }}>
              <span style={{ color: '#555' }}>Send:</span> Cutting
            </div>
            <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 700 }}>
              <span style={{ color: '#555' }}>Item:</span>{' '}
              <span style={{ 
                border: '2px solid #000', 
                padding: '2px 10px', 
                fontWeight: 900
              }}>
                {itemTypeParam === 'Btm' ? 'BOTTOM' : 'TOP'}
              </span>
            </div>
          </div>
        </div>

        {/* Line-wise Summary */}
        <div style={{
          marginBottom: '20px',
          border: '2px solid #000',
          padding: '10px',
          background: '#f9f9f9',
        }}>
          <div style={{
            fontWeight: 900,
            textAlign: 'center',
            borderBottom: '1px solid #000',
            marginBottom: '5px',
            textTransform: 'uppercase',
          }}>
            Line-wise Summary
          </div>
          <table style={{ width: '100%', fontSize: '13px', fontWeight: 700 }}>
            <tbody>
              <tr>
                {Object.entries(lineSummary).map(([line, qty]) => (
                  <td key={line} style={{ padding: '2px 5px' }}>
                    L-{line}= [{qty}]
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: '5px', fontWeight: 800, borderTop: '1px solid #ccc', paddingTop: '5px' }}>
            Total Deliveries: {normalizedChallans.length}
          </div>
        </div>

        {/* Main Table */}
        <table className="main-table" style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px',
          fontSize: '14px',
        }}>
          <thead>
            <tr>
              <th style={{ background: '#2c3e50', color: 'white', padding: '10px', border: '1px solid #000', fontSize: '14px', textTransform: 'uppercase', width: '15%' }}>DATE</th>
              <th style={{ background: '#2c3e50', color: 'white', padding: '10px', border: '1px solid #000', fontSize: '14px', textTransform: 'uppercase', width: '15%' }}>LINE NO</th>
              <th style={{ background: '#2c3e50', color: 'white', padding: '10px', border: '1px solid #000', fontSize: '14px', textTransform: 'uppercase', width: '20%' }}>COLOR</th>
              <th style={{ background: '#2c3e50', color: 'white', padding: '10px', border: '1px solid #000', fontSize: '14px', textTransform: 'uppercase', width: '10%' }}>SIZE</th>
              <th style={{ background: '#2c3e50', color: 'white', padding: '10px', border: '1px solid #000', fontSize: '14px', textTransform: 'uppercase', width: '10%' }}>STATUS</th>
              <th style={{ background: '#2c3e50', color: 'white', padding: '10px', border: '1px solid #000', fontSize: '14px', textTransform: 'uppercase', width: '15%' }}>QTY</th>
            </tr>
          </thead>
          <tbody>
            {normalizedChallans.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ border: '1px solid #000', padding: '20px', textAlign: 'center', color: '#999' }}>
                  No challans recorded yet
                </td>
              </tr>
            ) : (
              normalizedChallans.map((challan, index) => {
                // Last entry of the entire booking has empty status
                // All previous entries have tick mark
                const isLastEntry = index === normalizedChallans.length - 1;
                
                return (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', color: '#000', fontWeight: 600 }}>
                      {challan.date}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', color: '#000', fontWeight: 600 }}>
                      {isLastEntry ? (
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          border: '2px solid #000',
                          fontSize: '16px',
                          fontWeight: 900,
                          borderRadius: '4px',
                          boxShadow: '2px 2px 0 #000',
                          background: '#fff',
                        }}>
                          {challan.line}
                        </div>
                      ) : (
                        <span style={{ fontSize: '14px', fontWeight: 800 }}>
                          {challan.line}
                        </span>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', color: '#000', fontWeight: 600 }}>
                      {challan.color}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', color: '#000', fontWeight: 600 }}>
                      {challan.size}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', fontSize: '20px', color: 'green', fontWeight: 900 }}>
                      {isLastEntry ? '' : '✔'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle', fontSize: '16px', fontWeight: 800 }}>
                      {challan.qty}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer Total */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <div className="total-box" style={{
            border: '3px solid #000',
            padding: '8px 30px',
            fontSize: '20px',
            fontWeight: 900,
            background: '#ddd',
          }}>
            TOTAL QTY: {totalQty}
          </div>
        </div>

        {/* Generator Signature */}
        <div style={{ textAlign: 'right', fontSize: '10px', marginTop: '5px', color: '#555' }}>
          Report Generated By {user?.username || 'System'}
        </div>

        {/* Signature Areas */}
        <div style={{
          marginTop: '60px',
          display: 'flex',
          justifyContent: 'space-between',
          textAlign: 'center',
          fontWeight: 'bold',
          padding: '0 50px',
        }}>
          <div style={{ borderTop: '2px solid #000', width: '180px', paddingTop: '5px' }}>
            Received By
          </div>
          <div style={{ borderTop: '2px solid #000', width: '180px', paddingTop: '5px' }}>
            Input Incharge
          </div>
          <div style={{ borderTop: '2px solid #000', width: '180px', paddingTop: '5px' }}>
            Store
          </div>
        </div>
      </div>
    </>
  );
}

export default function AccessoriesPreviewPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#fff',
      }}>
        <p style={{ color: '#6b7280', fontFamily: "'Poppins', sans-serif" }}>Loading...</p>
      </div>
    }>
      <AccessoriesPreviewContent />
    </Suspense>
  );
}
