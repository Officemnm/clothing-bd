'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function AccessoriesDetailPage() {
  const router = useRouter();
  const params = useParams();
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
  const [challanItemType, setChallanItemType] = useState<'Top' | 'Btm'>('Top');

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
          itemType: challanItemType,
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
        // Redirect to print preview with itemType
        window.open(`/accessories-preview?ref=${ref}&itemType=${challanItemType}`, '_blank');
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
    setChallanItemType(challan.itemType || 'Top');
    setEditingIndex(index);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setChallanLine('');
    setChallanSize('ALL');
    setChallanQty('');
    setChallanItemType('Top');
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
          itemType: challanItemType,
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
  const normalizedChallans = (booking?.challans || []).map((c, originalIndex) => ({
    ...c,
    qty: Number(c.qty) || 0,
    originalIndex, // Keep track of original index for editing/deleting
  }));

  // Reverse to show latest challans first
  const reversedChallans = [...normalizedChallans].reverse();

  const totalQty = normalizedChallans.reduce((sum, c) => sum + c.qty, 0);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-amber-500"
                animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
              />
            ))}
          </div>
          <p className="text-sm text-slate-500">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Booking Not Found</h2>
          <p className="text-sm text-slate-500 mb-5">{error}</p>
          <button
            onClick={() => router.push('/dashboard/accessories')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/accessories')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Accessories
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{booking.ref}</h1>
              <p className="text-sm text-slate-500">{booking.buyer} • {booking.style}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <motion.svg 
                className="w-4 h-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
                animate={isRefreshing ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </motion.svg>
              Refresh
            </button>
            <button
              onClick={() => window.open(`/accessories-preview?ref=${ref}`, '_blank')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
              </svg>
              Print
            </button>
            {userRole === 'admin' && (
              <button
                onClick={handleDeleteBooking}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-red-700 flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-700">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Challan Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {editingIndex !== null ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              )}
            </svg>
            {editingIndex !== null ? `Edit Challan #${editingIndex + 1}` : 'Add New Challan'}
          </h3>
        </div>
        
        <form onSubmit={editingIndex !== null ? handleUpdateChallan : handleAddChallan} className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </label>
              <input
                type="text"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                required
                className="w-full h-11 px-3.5 text-sm font-medium bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Line No
              </label>
              <input
                type="text"
                value={challanLine}
                onChange={(e) => setChallanLine(e.target.value)}
                placeholder="e.g. 5"
                required
                className="w-full h-11 px-3.5 text-sm font-medium bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Color
              </label>
              <select
                value={challanColor}
                onChange={(e) => setChallanColor(e.target.value)}
                required
                className="w-full h-11 px-3.5 text-sm font-medium bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer shadow-sm"
              >
                <option value="">Select</option>
                {booking.colors.map((color, i) => (
                  <option key={i} value={color}>{color}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Size
              </label>
              <input
                type="text"
                value={challanSize}
                onChange={(e) => setChallanSize(e.target.value)}
                placeholder="e.g. M, L"
                required
                className="w-full h-11 px-3.5 text-sm font-medium bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Item Type
              </label>
              <select
                value={challanItemType}
                onChange={(e) => setChallanItemType(e.target.value as 'Top' | 'Btm')}
                className="w-full h-11 px-3.5 text-sm font-medium bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer shadow-sm"
              >
                <option value="Top">TOP</option>
                <option value="Btm">BOTTOM</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Quantity
              </label>
              <input
                type="number"
                value={challanQty}
                onChange={(e) => setChallanQty(e.target.value)}
                placeholder="0"
                required
                min="1"
                className="w-full h-11 px-3.5 text-sm font-medium bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all shadow-sm"
              />
            </div>

            <div className="flex items-end gap-2">
              <motion.button
                type="submit"
                disabled={isAddingChallan}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex-1 h-11 px-5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg ${
                  editingIndex !== null 
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/25' 
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25'
                }`}
              >
                {isAddingChallan ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : editingIndex !== null ? (
                  <>Save</>
                ) : (
                  <>Add</>
                )}
              </motion.button>
              
              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-10 px-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>

      {/* Challans List - Premium Design */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-500/5 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Challan History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-700">{normalizedChallans.length}</span> challans • Total: <span className="font-bold text-amber-600">{totalQty}</span> pcs
              <span className="ml-2 text-amber-600 text-[10px] font-medium bg-amber-50 px-1.5 py-0.5 rounded">Latest First</span>
            </p>
          </div>
        </div>

        {reversedChallans.length === 0 ? (
          <div className="py-20 text-center bg-gradient-to-b from-white to-slate-50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-400">No challans added yet</p>
            <p className="text-xs text-slate-300 mt-1">Add your first challan using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <th className="text-left text-xs font-bold uppercase py-3.5 px-5 tracking-wide">#</th>
                  <th className="text-left text-xs font-bold uppercase py-3.5 px-5 tracking-wide">Date</th>
                  <th className="text-left text-xs font-bold uppercase py-3.5 px-5 tracking-wide">Line</th>
                  <th className="text-left text-xs font-bold uppercase py-3.5 px-5 tracking-wide">Color</th>
                  <th className="text-left text-xs font-bold uppercase py-3.5 px-5 tracking-wide">Size</th>
                  <th className="text-center text-xs font-bold uppercase py-3.5 px-5 tracking-wide">Item</th>
                  <th className="text-right text-xs font-bold uppercase py-3.5 px-5 tracking-wide">Qty</th>
                  {userRole === 'admin' && (
                    <th className="text-center text-xs font-bold uppercase py-3.5 px-5 tracking-wide">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reversedChallans.map((challan, displayIndex) => {
                  const isEditing = editingIndex === challan.originalIndex;
                  const isLatest = displayIndex === 0;
                  return (
                    <tr 
                      key={challan.originalIndex}
                      className={`transition-all ${isEditing ? 'bg-amber-50 border-l-4 border-l-amber-400' : isLatest ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isLatest ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {challan.originalIndex + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-medium text-slate-700">{challan.date}</td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                          L-{challan.line}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 font-medium">{challan.color}</td>
                      <td className="py-3.5 px-5 text-slate-600">{challan.size}</td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold text-slate-700">
                          {challan.itemType === 'Btm' ? 'BOTTOM' : 'TOP'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <span className="inline-flex items-center justify-center min-w-[50px] px-3 py-1.5 bg-amber-100 text-amber-700 font-bold rounded-lg">
                          {challan.qty}
                        </span>
                      </td>
                      {userRole === 'admin' && (
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditChallan(challan.originalIndex)}
                              disabled={editingIndex !== null}
                              className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteChallan(challan.originalIndex)}
                              disabled={deletingIndex === challan.originalIndex}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              {deletingIndex === challan.originalIndex ? (
                                <motion.div
                                  className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                />
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
