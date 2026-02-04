'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function ClosingReportPage() {
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
      const response = await fetch('/api/closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refNo: refNo.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('closingReportData', JSON.stringify(data));
        router.push('/closing-preview');
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
    <div className="max-w-xl mx-auto">
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
              <p className="text-sm font-medium text-slate-600">Generating Report...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Closing Report</h1>
            <p className="text-xs text-slate-500">Generate production closing report from ERP</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-lg border border-slate-200"
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Search Booking</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Booking Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={refNo}
              onChange={(e) => { setRefNo(e.target.value.toUpperCase()); setError(''); }}
              placeholder="e.g., BD-24-0001"
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mb-4 text-sm text-red-600"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={isLoading || !refNo.trim()}
            whileTap={{ scale: 0.98 }}
            className={`w-full h-10 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              isLoading || !refNo.trim()
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            Generate Report
          </motion.button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg"
      >
        <h3 className="text-xs font-semibold text-slate-700 mb-3">How it works</h3>
        <div className="space-y-2">
          {[
            'Enter booking reference number',
            'System fetches data from ERP',
            'Report generates with size breakdown',
            'View, print or export',
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </div>
              <span className="text-xs text-slate-600">{text}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
