'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

export default function ChallanWiseInputReportPage() {
  const [booking, setBooking] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'v1' | 'v2' | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent, version: 'v1' | 'v2' = 'v1') => {
    e.preventDefault();
    if (!booking.trim()) {
      setError('Please enter a booking number');
      return;
    }

    setIsLoading(true);
    setLoadingType(version);
    setError('');

    try {
      const params = new URLSearchParams({ booking: booking.trim() });
      const response = await fetch(`/api/challan-report?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Store data in sessionStorage for preview page
        sessionStorage.setItem('challanReportData', JSON.stringify(data));
        if (version === 'v2') {
          router.push('/challan-preview-v2');
        } else {
          router.push('/challan-preview');
        }
      } else {
        setError(data.message || 'Failed to fetch data. Please check the booking number.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
              className="flex flex-col items-center gap-6"
            >
              <div className="relative w-12 h-12">
                <motion.div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
                <motion.div
                  className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-violet-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-1 rounded-full border-[3px] border-transparent border-b-violet-300"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <p className="text-sm font-medium text-slate-500">Generating Report...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-3">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200"
          >
            <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Challan Wise Input Report</h1>
            <p className="text-sm text-slate-500">Generate challan wise production input report from ERP</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Search Report</h2>
          <p className="text-sm text-slate-500 mt-1">Enter booking number to generate the challan wise input report</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Booking Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={booking}
              onChange={(e) => { setBooking(e.target.value); setError(''); }}
              placeholder="Enter booking number (e.g., BK-123456)"
              className="w-full h-12 px-4 text-base bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
              >
                <ExclamationCircleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  <p className="text-xs text-red-600 mt-0.5">Please verify the booking number and try again</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <motion.button
              type="submit"
              disabled={isLoading || !booking.trim()}
              whileHover={!isLoading && booking.trim() ? { scale: 1.01 } : {}}
              whileTap={!isLoading && booking.trim() ? { scale: 0.99 } : {}}
              className={`flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                isLoading || !booking.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-200'
              }`}
            >
              <DocumentTextIcon className="w-5 h-5" />
              {loadingType === 'v1' ? 'Generating...' : 'Report V1'}
            </motion.button>

            <motion.button
              type="button"
              onClick={(e) => handleSubmit(e, 'v2')}
              disabled={isLoading || !booking.trim()}
              whileHover={!isLoading && booking.trim() ? { scale: 1.01 } : {}}
              whileTap={!isLoading && booking.trim() ? { scale: 0.99 } : {}}
              className={`flex-1 h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                isLoading || !booking.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-200'
              }`}
            >
              <TableCellsIcon className="w-5 h-5" />
              {loadingType === 'v2' ? 'Generating...' : 'Report V2'}
            </motion.button>
          </div>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 p-4 bg-violet-50 border border-violet-100 rounded-xl"
      >
        <h3 className="text-sm font-medium text-violet-800 mb-2">How to use</h3>
        <p className="text-xs text-violet-600">
          Enter your booking number in the field above. Click &quot;Report V1&quot; for detailed view or &quot;Report V2&quot; for simplified view.
        </p>
      </motion.div>
    </div>
  );
}
