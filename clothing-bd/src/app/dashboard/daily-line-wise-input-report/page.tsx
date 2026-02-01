'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TableCellsIcon, 
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// ============ Types ============
interface LineData {
  lineNo: string;
  input: number;
}

interface FloorData {
  floorName: string;
  lines: LineData[];
  subtotal: number;
}

interface ReportResult {
  success: boolean;
  date: string;
  floors: FloorData[];
  grandTotal: number;
  targetLine?: string;
  message?: string;
}

// ============ Helper Functions ============
function getTodayFormatted(): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = months[today.getMonth()];
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function DailyLineWiseInputReportPage() {
  const [date, setDate] = useState(getTodayFormatted());
  const [lineFilter, setLineFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const params = new URLSearchParams({ date });
      if (lineFilter.trim()) {
        params.append('line', lineFilter.trim());
      }

      const response = await fetch(`/api/hourly-report?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'রিপোর্ট আনতে সমস্যা হয়েছে');
      }

      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [date, lineFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4 mb-3">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-200"
          >
            <TableCellsIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Daily Line Wise Input Report</h1>
            <p className="text-sm text-slate-500">লাইন অনুযায়ী দৈনিক ইনপুট রিপোর্ট</p>
          </div>
        </div>
      </motion.div>

      {/* Search Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6"
      >
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          {/* Date Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <CalendarDaysIcon className="w-4 h-4 inline mr-1" />
              তারিখ
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="DD-MMM-YYYY (যেমন: 28-Jan-2026)"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-slate-800"
            />
          </div>

          {/* Line Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <MagnifyingGlassIcon className="w-4 h-4 inline mr-1" />
              লাইন নম্বর (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              placeholder="সব দেখতে ফাঁকা রাখুন"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-slate-800"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-lg hover:from-sky-600 hover:to-blue-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  লোড হচ্ছে...
                </>
              ) : (
                <>
                  <ChartBarIcon className="w-5 h-5" />
                  রিপোর্ট দেখুন
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3"
          >
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">ত্রুটি</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Results */}
      <AnimatePresence>
        {reportData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            {/* Report Header */}
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    📅 তারিখ: {reportData.date}
                  </h2>
                  {reportData.targetLine && (
                    <p className="text-sky-100 text-sm">
                      🔍 ফিল্টার: Line {reportData.targetLine}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{reportData.grandTotal.toLocaleString()}</div>
                  <div className="text-sky-100 text-sm">মোট ইনপুট</div>
                </div>
              </div>
            </div>

            {/* No Data Message */}
            {!reportData.success && reportData.message && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <p className="text-amber-800 font-medium">{reportData.message}</p>
              </div>
            )}

            {/* Floor Cards */}
            {reportData.success && reportData.floors.map((floor, floorIndex) => (
              <motion.div
                key={floor.floorName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: floorIndex * 0.1 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Floor Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BuildingOffice2Icon className="w-5 h-5 text-slate-500" />
                    <h3 className="font-semibold text-slate-800">{floor.floorName}</h3>
                  </div>
                  <div className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-medium">
                    সাবটোটাল: {floor.subtotal.toLocaleString()}
                  </div>
                </div>

                {/* Lines Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 text-sm font-medium text-slate-600">লাইন নম্বর</th>
                        <th className="text-right px-4 py-2.5 text-sm font-medium text-slate-600">ইনপুট</th>
                      </tr>
                    </thead>
                    <tbody>
                      {floor.lines.map((line, lineIndex) => (
                        <tr 
                          key={line.lineNo}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            lineIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <td className="px-4 py-2.5 text-slate-700 font-medium">
                            Line {line.lineNo}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-semibold ${
                              line.input > 0 ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              {line.input.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}

            {/* Grand Total Card */}
            {reportData.success && reportData.floors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-emerald-100 text-sm">
                        {reportData.targetLine 
                          ? `Line ${reportData.targetLine} এর মোট` 
                          : 'সকল লাইনের গ্র্যান্ড টোটাল'}
                      </div>
                      <div className="text-2xl font-bold">{reportData.grandTotal.toLocaleString()} pcs</div>
                    </div>
                  </div>
                  <div className="text-5xl">🔥</div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial State - No Report Yet */}
      {!reportData && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center"
        >
          <TableCellsIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">রিপোর্ট দেখতে তারিখ দিন</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            উপরের ফর্মে তারিখ দিয়ে &quot;রিপোর্ট দেখুন&quot; বাটনে ক্লিক করুন। 
            নির্দিষ্ট লাইনের ডাটা দেখতে লাইন নম্বর দিতে পারেন।
          </p>
        </motion.div>
      )}
    </div>
  );
}
