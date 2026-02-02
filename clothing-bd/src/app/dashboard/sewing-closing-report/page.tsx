'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentChartBarIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

export default function SewingClosingReportPage() {
  const [refNo, setRefNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNo.trim()) {
      setError('Please enter a booking number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sewing-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refNo: refNo.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('sewingClosingReportData', JSON.stringify(data));
        router.push('/sewing-closing-preview');
      } else {
        setError(data.message || 'Failed to fetch data. Please check the booking number.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
              className="flex flex-col items-center gap-6"
            >
              {/* Modern Spinner */}
              <div className="relative w-12 h-12">
                <motion.div
                  className="absolute inset-0 rounded-full border-[3px] border-slate-200"
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-rose-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-1 rounded-full border-[3px] border-transparent border-b-pink-300"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <p className="text-sm font-medium text-slate-500">Generating Sewing Report...</p>
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
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-200"
          >
            <DocumentChartBarIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Sewing Closing Report</h1>
            <p className="text-sm text-slate-500">Generate sewing input/output report from ERP</p>
          </div>
        </div>
      </motion.div>

      {/* Main Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Search Booking</h2>
          <p className="text-sm text-slate-500 mt-1">Enter your booking reference number to generate the sewing report</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Input Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Booking Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={refNo}
              onChange={(e) => { setRefNo(e.target.value.toUpperCase()); setError(''); }}
              placeholder="Enter booking number (e.g., 502/2600)"
              className="w-full h-12 px-4 text-base bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Error Message */}
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

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading || !refNo.trim()}
            whileHover={!isLoading && refNo.trim() ? { scale: 1.01 } : {}}
            whileTap={!isLoading && refNo.trim() ? { scale: 0.99 } : {}}
            className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              isLoading || !refNo.trim()
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-lg hover:shadow-rose-200'
            }`}
          >
            <DocumentChartBarIcon className="w-5 h-5" />
            Generate Report
          </motion.button>
        </form>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6"
      >
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Report Information</h3>
        <div className="space-y-3">
          {[
            { step: 1, text: 'Color-wise size breakdown' },
            { step: 2, text: 'Order Qty, Input Qty, Output Qty' },
            { step: 3, text: 'Rejection & WIP data' },
            { step: 4, text: 'Download as image or PDF' },
          ].map((item) => (
            <motion.div 
              key={item.step} 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + item.step * 0.1 }}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {item.step}
              </div>
              <span className="text-sm text-slate-600">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
