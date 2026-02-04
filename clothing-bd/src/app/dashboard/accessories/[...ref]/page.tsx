'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  CubeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  PrinterIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

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
        setChallanSize('ALL');
        setChallanQty('');
        setSuccessMsg('Challan added');
        setTimeout(() => setSuccessMsg(''), 3000);
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

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setChallanLine('');
    setChallanSize('ALL');
    setChallanQty('');
    setChallanItemType('Top');
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    setChallanDate(`${dd}-${mm}-${yyyy}`);
  };

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
        setSuccessMsg('Challan updated');
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

  const normalizedChallans = (booking?.challans || []).map((c, originalIndex) => ({
    ...c,
    qty: Number(c.qty) || 0,
    originalIndex,
  }));

  // Latest first
  const reversedChallans = [...normalizedChallans].reverse();
  const totalQty = normalizedChallans.reduce((sum, c) => sum + c.qty, 0);
  const canEdit = userRole === 'admin' || userRole === 'moderator';

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-6 bg-slate-400 rounded-full"
              animate={{ scaleY: [1, 1.5, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-red-100 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Booking Not Found</h2>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard/accessories')}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/accessories')}
            className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 text-slate-600" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <CubeIcon className="w-5 h-5 text-slate-600" />
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
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => window.open(`/accessories-preview?ref=${ref}`, '_blank')}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>
          {canEdit && (
            <button
              onClick={handleDeleteBooking}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"
          >
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2"
          >
            <CheckIcon className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Challan Form */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          {editingIndex !== null ? (
            <PencilIcon className="w-4 h-4 text-amber-600" />
          ) : (
            <PlusIcon className="w-4 h-4 text-slate-600" />
          )}
          <h3 className="text-sm font-semibold text-slate-800">
            {editingIndex !== null ? `Edit Challan #${editingIndex + 1}` : 'Add New Challan'}
          </h3>
        </div>
        
        <form onSubmit={editingIndex !== null ? handleUpdateChallan : handleAddChallan} className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="text"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                required
                className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Line</label>
              <input
                type="text"
                value={challanLine}
                onChange={(e) => setChallanLine(e.target.value)}
                placeholder="e.g. 5"
                required
                className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
              <select
                value={challanColor}
                onChange={(e) => setChallanColor(e.target.value)}
                required
                className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Select</option>
                {booking.colors.map((color, i) => (
                  <option key={i} value={color}>{color}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Size</label>
              <input
                type="text"
                value={challanSize}
                onChange={(e) => setChallanSize(e.target.value)}
                placeholder="ALL"
                required
                className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Item</label>
              <select
                value={challanItemType}
                onChange={(e) => setChallanItemType(e.target.value as 'Top' | 'Btm')}
                className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="Top">TOP</option>
                <option value="Btm">BOTTOM</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
              <input
                type="number"
                value={challanQty}
                onChange={(e) => setChallanQty(e.target.value)}
                placeholder="0"
                required
                min="1"
                className="w-full h-9 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={isAddingChallan}
                className={`flex-1 h-9 px-4 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                  editingIndex !== null ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {isAddingChallan ? '...' : editingIndex !== null ? 'Save' : 'Add'}
              </button>
              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="h-9 px-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Challans Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Challan History
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{reversedChallans.length} entries</span>
            <span className="px-2 py-0.5 bg-slate-800 text-white rounded font-bold">{totalQty} pcs</span>
          </div>
        </div>

        {reversedChallans.length === 0 ? (
          <div className="py-12 text-center">
            <CubeIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">No challans added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase">#</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase">Date</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase">Line</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase">Color</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold uppercase">Size</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold uppercase">Item</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold uppercase">Qty</th>
                  {canEdit && (
                    <th className="text-center py-2.5 px-4 text-xs font-semibold uppercase">Action</th>
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
                      className={`transition-colors ${
                        isEditing ? 'bg-amber-50' : isLatest ? 'bg-emerald-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                          isLatest ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {challan.originalIndex + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{challan.date}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                          L-{challan.line}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">{challan.color}</td>
                      <td className="py-2.5 px-4 text-slate-600">{challan.size}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-xs font-medium text-slate-600">
                          {challan.itemType === 'Btm' ? 'BTM' : 'TOP'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 bg-slate-800 text-white font-bold text-xs rounded">
                          {challan.qty}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditChallan(challan.originalIndex)}
                              disabled={editingIndex !== null}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteChallan(challan.originalIndex)}
                              disabled={deletingIndex === challan.originalIndex}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              {deletingIndex === challan.originalIndex ? (
                                <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                              ) : (
                                <TrashIcon className="w-4 h-4" />
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
      </div>
    </div>
  );
}
