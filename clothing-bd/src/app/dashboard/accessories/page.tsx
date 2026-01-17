'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

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
    <div className="max-w-5xl mx-auto">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-amber-500"
                    animate={{ y: [0, -12, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-slate-500">Loading Accessories...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-3">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-200"
          >
            <CubeIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Accessories</h1>
            <p className="text-sm text-slate-500">Track challan and accessories data by booking reference</p>
          </div>
        </div>
      </motion.div>

      {/* Search Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6"
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Quick Search</h2>
          <p className="text-sm text-slate-500 mt-1">Enter booking reference to view accessories details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={refNo}
                onChange={(e) => { setRefNo(e.target.value.toUpperCase()); setError(''); }}
                placeholder="Enter booking number (e.g., BD-24-0001)"
                className="w-full h-12 pl-12 pr-4 text-base bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-400"
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading || !refNo.trim()}
              whileHover={!isLoading && refNo.trim() ? { scale: 1.02 } : {}}
              whileTap={!isLoading && refNo.trim() ? { scale: 0.98 } : {}}
              className={`h-12 px-8 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                isLoading || !refNo.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-200'
              }`}
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              Search
            </motion.button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
              >
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-red-800">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* Recent Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Recent Bookings</h3>
            <p className="text-sm text-slate-500 mt-0.5">{bookings.length} bookings available</p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all"
            />
          </div>
        </div>

        {isLoadingList ? (
          <div className="py-12 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-amber-500"
                  animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                />
              ))}
            </div>
            <p className="text-sm text-slate-500">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No bookings found</p>
            <p className="text-sm text-slate-400 mt-1">Use the search above to find a booking</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-6">Reference</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-6">Buyer</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-6">Style</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-6">Challans</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-6">Total Qty</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-6">Last Updated</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase py-3 px-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking, index) => (
                  <motion.tr
                    key={booking.ref}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-800">{booking.ref}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{booking.buyer}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-600">{booking.style}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        {booking.challanCount} challans
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-slate-800">{booking.totalQty.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-500">{booking.lastUpdated}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/accessories/${booking.ref}`)}
                        className="px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
