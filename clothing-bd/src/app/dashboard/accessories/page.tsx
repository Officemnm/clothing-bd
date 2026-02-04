'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  InboxIcon,
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-8 bg-slate-800 rounded-full"
                    animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-slate-600">Loading...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <CubeIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Accessories</h1>
            <p className="text-xs text-slate-500">Track challan and accessories data</p>
          </div>
        </div>
      </motion.div>

      {/* Search Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-lg border border-slate-200 mb-5"
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Quick Search</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={refNo}
                onChange={(e) => { setRefNo(e.target.value.toUpperCase()); setError(''); }}
                placeholder="Enter booking number"
                className="w-full h-10 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
            <motion.button
              type="submit"
              disabled={isLoading || !refNo.trim()}
              whileTap={{ scale: 0.98 }}
              className={`h-10 px-5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                isLoading || !refNo.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              Search
            </motion.button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-3 text-sm text-red-600"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* Recent Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg border border-slate-200 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Recent Bookings</h3>
            <p className="text-xs text-slate-500">{bookings.length} available</p>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-slate-300 transition-all w-32"
            />
          </div>
        </div>

        {isLoadingList ? (
          <div className="py-10 text-center">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-6 bg-slate-300 rounded-full"
                  animate={{ scaleY: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-100 flex items-center justify-center">
              <InboxIcon className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600">No bookings found</p>
            <p className="text-xs text-slate-400 mt-0.5">Use search to find a booking</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="text-xs font-medium text-slate-500 py-2.5 px-4">Reference</th>
                  <th className="text-xs font-medium text-slate-500 py-2.5 px-4">Buyer</th>
                  <th className="text-xs font-medium text-slate-500 py-2.5 px-4">Style</th>
                  <th className="text-xs font-medium text-slate-500 py-2.5 px-4">Challans</th>
                  <th className="text-xs font-medium text-slate-500 py-2.5 px-4">Qty</th>
                  <th className="text-xs font-medium text-slate-500 py-2.5 px-4">Updated</th>
                  <th className="text-xs font-medium text-slate-500 py-2.5 px-4 text-right">Action</th>
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
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{booking.ref}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{booking.buyer}</td>
                    <td className="py-3 px-4 text-slate-600">{booking.style}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {booking.challanCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{booking.totalQty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{booking.lastUpdated}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/accessories/${booking.ref}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        View
                        <ArrowRightIcon className="w-3 h-3" />
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
