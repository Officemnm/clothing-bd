'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BookingSummary {
  ref: string;
  buyer: string;
  style: string;
  challanCount: number;
  totalQty: number;
  lastUpdated: string;
}

export default function AccessoriesPage() {
  const [refNo, setRefNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await fetch('/api/accessories');
      const data = await response.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNo.trim()) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refNo: refNo.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/dashboard/accessories/${refNo.trim().toUpperCase()}`);
      } else {
        setError(data.message || 'Booking not found');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => 
    searchQuery === '' || 
    b.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.style.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Full Page Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            padding: '40px 56px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '4px solid #f3f4f6',
                borderRadius: '50%',
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                border: '4px solid transparent',
                borderTopColor: '#8b5cf6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' }}>
              Loading Booking
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Fetching data for <strong style={{ color: '#8b5cf6' }}>{refNo}</strong>
            </p>
          </div>
        </div>
      )}

      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a2e', marginBottom: '6px' }}>
            Accessories Challan
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Manage challan entries and tracking for accessories
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          {/* Search Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            border: '1px solid #f0f0f0',
            padding: '32px',
            height: 'fit-content',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a2e', marginBottom: '4px' }}>
                Search Booking
              </h2>
              <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                Enter reference to manage challans
              </p>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: '500', margin: 0 }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Booking Reference (IR/IB)
                </label>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value.toUpperCase())}
                  placeholder="e.g. IB-12345"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    backgroundColor: '#f9fafb',
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
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
                }}
              >
                <span>Proceed</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>

          {/* Bookings List */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            border: '1px solid #f0f0f0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a2e', margin: 0 }}>
                  Saved Bookings
                </h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                  {bookings.length} total bookings
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '38px',
                    paddingRight: '14px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    fontSize: '13px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e8e8e8',
                    borderRadius: '10px',
                    outline: 'none',
                    width: '200px',
                  }}
                />
              </div>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {isLoadingList ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e5e7eb',
                    borderTopColor: '#8b5cf6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto',
                  }} />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                    {searchQuery ? 'No matching bookings' : 'No bookings saved yet'}
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafafa' }}>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Reference</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Buyer</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Style</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Challans</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Total Qty</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((booking) => (
                      <tr 
                        key={booking.ref}
                        style={{ borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
                        onClick={() => router.push(`/dashboard/accessories/${booking.ref}`)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#faf5ff'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ fontWeight: '700', color: '#8b5cf6' }}>{booking.ref}</span>
                        </td>
                        <td style={{ padding: '14px 20px', fontWeight: '500', color: '#1f2937' }}>{booking.buyer}</td>
                        <td style={{ padding: '14px 20px', color: '#6b7280' }}>{booking.style}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            backgroundColor: booking.challanCount > 0 ? '#f0fdf4' : '#f5f5f5',
                            color: booking.challanCount > 0 ? '#166534' : '#6b7280',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '600',
                          }}>
                            {booking.challanCount}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#1f2937' }}>
                          {booking.totalQty.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/accessories/${booking.ref}`);
                            }}
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#8b5cf6',
                              backgroundColor: '#faf5ff',
                              border: '1px solid #e9d5ff',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
