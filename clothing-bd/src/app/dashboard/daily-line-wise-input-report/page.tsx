'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TableCellsIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon,
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
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setIsLoading(true);
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
        router.push('/hourly-preview');
      } else {
        setError(data.message || 'Failed to fetch data. Please check the date format.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
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
                  className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-sky-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-1 rounded-full border-[3px] border-transparent border-b-sky-300"
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
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-200"
          >
            <TableCellsIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Daily Line Wise Input Report</h1>
            <p className="text-sm text-slate-500">Generate hourly production monitoring report from ERP</p>
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
          <p className="text-sm text-slate-500 mt-1">Enter date to generate the hourly production report</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(date) => { setSelectedDate(date); setError(''); }}
              placeholder="Select date"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Line Number <span className="text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              placeholder="Leave empty to see all lines"
              className="w-full h-12 px-4 text-base bg-white border-2 border-slate-200 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all placeholder:text-slate-400"
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
                  <p className="text-xs text-red-600 mt-0.5">Please verify the date format and try again</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={isLoading || !selectedDate}
            whileHover={!isLoading && selectedDate ? { scale: 1.01 } : {}}
            whileTap={!isLoading && selectedDate ? { scale: 0.99 } : {}}
            className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              isLoading || !selectedDate
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:shadow-lg hover:shadow-sky-200'
            }`}
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            Generate Report
          </motion.button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 p-4 bg-sky-50 border border-sky-100 rounded-xl"
      >
        <h3 className="text-sm font-medium text-sky-800 mb-2">How to use</h3>
        <p className="text-xs text-sky-600">
          Click on the date field to open the calendar and select a date. Leave line number empty to see all lines.
        </p>
      </motion.div>
    </div>
  );
}
