'use client';

import { motion } from 'framer-motion';
import { TableCellsIcon } from '@heroicons/react/24/outline';

export default function DailyLineWiseInputReportPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
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
            <p className="text-sm text-slate-500">Generate and view daily line-wise input reports.</p>
          </div>
        </div>
      </motion.div>

      {/* Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center h-64"
      >
        <h2 className="text-xl font-semibold text-slate-700">Feature Under Development</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          This page is currently being built. Please check back later for the full report functionality.
        </p>
      </motion.div>
    </div>
  );
}
