'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Challan {
  date: string;
  line: string;
  color: string;
  size: string;
  qty: number;
}

interface BookingData {
  ref: string;
  buyer: string;
  style: string;
  colors: string[];
  challans: Challan[];
  lastUpdated: string;
}

export default function AccessoriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  // Handle catch-all route - ref can be array like ["508", "057", "MASTER"]
  const refParam = params.ref;
  const ref = Array.isArray(refParam) ? refParam.join('/') : (refParam as string);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingChallan, setIsAddingChallan] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userRole, setUserRole] = useState('');

  // Challan form
  const [challanDate, setChallanDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });
  const [challanLine, setChallanLine] = useState('');
  const [challanColor, setChallanColor] = useState('');
  const [challanSize, setChallanSize] = useState('ALL');
  const [challanQty, setChallanQty] = useState('');

  useEffect(() => {
    loadBooking();
    loadUserRole();
  }, [ref]);

  const loadUserRole = async () => {
    try {
      const response = await fetch('/api/user', { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setUserRole(data.user.role);
      }
    } catch { /* ignore */ }
  };

  // Remove leading zeros from line number input (e.g., 01 -> 1)
  const sanitizeLine = (line: string) => {
    const trimmed = line.trim();
    const withoutLeadingZeros = trimmed.replace(/^0+/, '');
    return withoutLeadingZeros === '' ? '0' : withoutLeadingZeros;
  };

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError('');
    try {
      const response = await fetch(`/api/accessories/${ref}`, { method: 'PUT' });
      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
        setSuccessMsg('Color list refreshed from ERP');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.message || 'Failed to refresh');
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!confirm('Are you sure you want to delete this entire booking and all its challans?')) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/accessories/${ref}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        router.push('/dashboard/accessories');
      } else {
        setError(data.message || 'Failed to delete');
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challanLine || !challanColor || !challanSize || !challanQty) return;
    const cleanLine = sanitizeLine(challanLine);
    
    setIsAddingChallan(true);
    setError('');

    try {
      const response = await fetch(`/api/accessories/${ref}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: challanDate,
          line: cleanLine,
          color: challanColor,
          size: challanSize,
          qty: parseInt(challanQty),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
        setChallanLine('');
        setChallanSize('');
        setChallanQty('');
        setSuccessMsg('Challan added successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.message || 'Failed to add challan');
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsAddingChallan(false);
    }
  };

  const handleDeleteChallan = async (index: number) => {
    if (!confirm('Delete this challan entry?')) return;
    setDeletingIndex(index);
    try {
      const response = await fetch(`/api/accessories/${ref}?challan=${index}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
        setSuccessMsg('Challan deleted');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.message || 'Failed to delete');
      }
    } catch {
      setError('Connection error');
    } finally {
      setDeletingIndex(null);
    }
  };

  // Start editing a challan - populate form
  const handleEditChallan = (index: number) => {
    const challan = booking?.challans[index];
    if (!challan) return;
    
    setChallanDate(challan.date);
    setChallanLine(challan.line);
    setChallanColor(challan.color);
    setChallanSize(challan.size);
    setChallanQty(String(challan.qty));
    setEditingIndex(index);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setChallanLine('');
    setChallanSize('ALL');
    setChallanQty('');
    // Reset date to today
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    setChallanDate(`${dd}-${mm}-${yyyy}`);
  };

  // Update/save edited challan
  const handleUpdateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null || !challanLine || !challanColor || !challanSize || !challanQty) return;
    const cleanLine = sanitizeLine(challanLine);
    
    setIsAddingChallan(true);
    setError('');

    try {
      const response = await fetch(`/api/accessories/${ref}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: editingIndex,
          date: challanDate,
          line: cleanLine,
          color: challanColor,
          size: challanSize,
          qty: parseInt(challanQty),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setBooking(data.booking);
        handleCancelEdit();
        setSuccessMsg('Challan updated successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.message || 'Failed to update challan');
      }
    } catch {
      setError('Connection error');
    } finally {
      setIsAddingChallan(false);
    }
  };

  // Normalize challans to ensure qty is numeric (avoids string concatenation in totals)
  const normalizedChallans = (booking?.challans || []).map((c) => ({
    ...c,
    qty: Number(c.qty) || 0,
  }));

  const totalQty = normalizedChallans.reduce((sum, c) => sum + c.qty, 0);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280' }}>Loading booking...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#fef2f2',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
          Booking Not Found
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
        <button
          onClick={() => router.push('/dashboard/accessories')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ animation: 'fadeIn 0.4s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <button
              onClick={() => router.push('/dashboard/accessories')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#6b7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Accessories
            </button>
            <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' }}>
              {booking.ref}
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {booking.buyer} • {booking.style}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }}>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Refreshing...' : 'Refresh Colors'}
            </button>
            <button
              onClick={() => window.open(`/accessories-preview?ref=${ref}`, '_blank')}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#8b5cf6',
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
              </svg>
              Print Preview
            </button>
            {userRole === 'admin' && (
              <button
                onClick={handleDeleteBooking}
                disabled={isDeleting}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeleting ? 'Deleting...' : 'Delete Booking'}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>×</button>
          </div>
        )}

        {successMsg && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ color: '#16a34a', fontSize: '14px', margin: 0 }}>{successMsg}</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          {/* Add Challan Form */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            border: '1px solid #f0f0f0',
            padding: '28px',
            height: 'fit-content',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a2e', marginBottom: '20px' }}>
              {editingIndex !== null ? `Edit Challan #${editingIndex + 1}` : 'Add New Challan'}
            </h3>
            <form onSubmit={editingIndex !== null ? handleUpdateChallan : handleAddChallan}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Date (DD-MM-YYYY)
                </label>
                <input
                  type="text"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Line No
                </label>
                <input
                  type="text"
                  value={challanLine}
                  onChange={(e) => setChallanLine(e.target.value)}
                  placeholder="e.g. L-5"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Color
                </label>
                <select
                  value={challanColor}
                  onChange={(e) => setChallanColor(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select a color</option>
                  {booking.colors.map((color, i) => (
                    <option key={i} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Size
                </label>
                <input
                  type="text"
                  value={challanSize}
                  onChange={(e) => setChallanSize(e.target.value)}
                  placeholder="e.g. M, L, XL"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Quantity
                </label>
                <input
                  type="number"
                  value={challanQty}
                  onChange={(e) => setChallanQty(e.target.value)}
                  placeholder="0"
                  required
                  min="1"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    backgroundColor: '#f9fafb',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isAddingChallan}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  background: editingIndex !== null 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                    : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isAddingChallan ? 'not-allowed' : 'pointer',
                  opacity: isAddingChallan ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isAddingChallan 
                  ? (editingIndex !== null ? 'Updating...' : 'Adding...') 
                  : (editingIndex !== null ? 'Update Challan' : 'Add Challan')
                }
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {editingIndex !== null 
                    ? <path d="M5 13l4 4L19 7" />
                    : <path d="M12 4v16m8-8H4" />
                  }
                </svg>
              </button>

              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>

          {/* Challans List */}
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
                  Challan Entries
                </h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                  {normalizedChallans.length} challans • Total: <strong style={{ color: '#8b5cf6' }}>{totalQty}</strong> pcs
                </p>
              </div>
            </div>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {normalizedChallans.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                    No challans added yet
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafafa' }}>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Line</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Color</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Size</th>
                      <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Qty</th>
                      {userRole === 'admin' && (
                        <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedChallans.map((challan, index) => (
                      <tr 
                        key={index}
                        style={{ 
                          borderBottom: '1px solid #f5f5f5',
                          backgroundColor: editingIndex === index ? '#fffbeb' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '14px 20px', color: '#9ca3af' }}>{index + 1}</td>
                        <td style={{ padding: '14px 20px', fontWeight: '500', color: '#1f2937' }}>{challan.date}</td>
                        <td style={{ padding: '14px 20px', color: '#6b7280' }}>{challan.line}</td>
                        <td style={{ padding: '14px 20px', color: '#1f2937' }}>{challan.color}</td>
                        <td style={{ padding: '14px 20px', color: '#6b7280' }}>{challan.size}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '700', color: '#8b5cf6' }}>
                          {challan.qty}
                        </td>
                        {userRole === 'admin' && (
                          <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleEditChallan(index)}
                                disabled={editingIndex !== null}
                                title="Edit"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: '#f59e0b',
                                  backgroundColor: 'transparent',
                                  border: '1px solid #fcd34d',
                                  borderRadius: '6px',
                                  cursor: editingIndex !== null ? 'not-allowed' : 'pointer',
                                  opacity: editingIndex !== null ? 0.5 : 1,
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteChallan(index)}
                                disabled={deletingIndex === index}
                                title="Delete"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  color: '#dc2626',
                                  backgroundColor: 'transparent',
                                  border: '1px solid #fecaca',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                }}
                              >
                                {deletingIndex === index ? '...' : 'Del'}
                              </button>
                            </div>
                          </td>
                        )}
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
