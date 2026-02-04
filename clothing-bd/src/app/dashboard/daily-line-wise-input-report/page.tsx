'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TableCellsIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import DatePicker from '@/components/DatePicker';

function formatDateForAPI(dateObj: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function DailyLineWiseInputReportPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [lineFilter, setLineFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'v1' | 'v2' | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent, version: 'v1' | 'v2' = 'v1') => {
    e.preventDefault();
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setIsLoading(true);
    setLoadingType(version);
    setError('');

    try {
      const formattedDate = formatDateForAPI(selectedDate);
      
      const params = new URLSearchParams({ date: formattedDate });
      if (lineFilter.trim()) {
        params.append('line', lineFilter.trim());
      }

      const response = await fetch(`/api/hourly-report?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        sessionStorage.setItem('hourlyReportData', JSON.stringify(data));
        if (version === 'v2') {
          router.push('/hourly-preview-v2');
        } else {
          router.push('/hourly-preview');
        }
      } else {
        setError(data.message || 'Failed to fetch data');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingType(null);
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
            <TableCellsIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Daily Line Wise Input Report</h1>
            <p className="text-xs text-slate-500">Generate hourly production report from ERP</p>
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
          <h2 className="text-sm font-semibold text-slate-800">Search Report</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(date) => { setSelectedDate(date); setError(''); }}
              placeholder="Select date"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Line Number <span className="text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              placeholder="Leave empty for all lines"
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

          <div className="flex gap-2">
            <motion.button
              type="submit"
              disabled={isLoading || !selectedDate}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 h-10 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                isLoading || !selectedDate
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              {loadingType === 'v1' ? 'Generating...' : 'Report V1'}
            </motion.button>

            <motion.button
              type="button"
              onClick={(e) => handleSubmit(e, 'v2')}
              disabled={isLoading || !selectedDate}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 h-10 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                isLoading || !selectedDate
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-600 text-white hover:bg-slate-500'
              }`}
            >
              <TableCellsIcon className="w-4 h-4" />
              {loadingType === 'v2' ? 'Generating...' : 'Report V2'}
            </motion.button>
          </div>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg"
      >
        <p className="text-xs text-slate-600">
          Select a date and optionally filter by line number. V2 shows a simplified view.
        </p>
      </motion.div>
    </div>
  );
}
