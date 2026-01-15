'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface POMetadata {
  buyer: string;
  booking: string;
  style: string;
  season: string;
  dept: string;
  item: string;
}

interface ColorTable {
  color: string;
  sizes: string[];
  rows: {
    poNo: string;
    quantities: number[];
    total: number;
  }[];
  actualQty: number[];
  orderQty3Percent: number[];
  actualTotal: number;
  orderTotal: number;
}

interface POResult {
  metadata: POMetadata;
  tables: ColorTable[];
  grandTotal: number;
  fileCount: number;
}

export default function POGeneratorPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<POResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      setError('');
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files);
      setError('');
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Please select at least one PDF file');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch('/api/po', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || 'Failed to process files');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFiles(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePreview = () => {
    if (result) {
      sessionStorage.setItem('poPreviewData', JSON.stringify(result));
      router.push('/po-preview');
    }
  };

  const truncateText = (text: string, maxLength: number = 25) => {
    if (!text || text === 'N/A') return text;
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-6xl mx-auto"
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">PO Sheet Generator</h1>
            <p className="text-sm text-slate-500">Extract size-wise quantity data from Purchase Order PDFs</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-lg"
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <form onSubmit={handleSubmit}>
                  {/* Upload Area */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload PDF Files
                    </label>
                    <motion.div
                      whileHover={{ borderColor: '#94a3b8' }}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                        isDragging 
                          ? 'border-slate-400 bg-slate-50' 
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <motion.div
                        animate={isDragging ? { scale: 1.05, y: -3 } : { scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          {isDragging ? 'Drop files here' : 'Click to browse or drag & drop'}
                        </p>
                        <p className="text-xs text-slate-400">PDF files only • Multiple files supported</p>
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Selected Files */}
                  <AnimatePresence>
                    {files && files.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5"
                      >
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-emerald-800">
                              {files.length} file{files.length > 1 ? 's' : ''} selected
                            </span>
                          </div>
                          <div className="text-xs text-emerald-700 pl-8">
                            {Array.from(files).slice(0, 3).map(f => f.name).join(', ')}
                            {files.length > 3 && ` +${files.length - 3} more`}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5"
                      >
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                          <span className="text-sm text-red-700">{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isLoading || !files}
                    whileHover={!isLoading && files ? { scale: 1.01 } : {}}
                    whileTap={!isLoading && files ? { scale: 0.99 } : {}}
                    className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                      isLoading || !files
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-800 text-white hover:bg-slate-700 shadow-sm'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full"
                        />
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Process Files
                      </>
                    )}
                  </motion.button>
                </form>
              </div>

              {/* Info Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload Purchase Order PDF files to extract size-wise quantity breakdown. 
                    The system will automatically merge multiple PO files for the same order.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Success Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-sm"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Processing Complete</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {result.fileCount} files
                      </span>
                      <span>•</span>
                      <span>{result.tables.length} colors</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{result.grandTotal.toLocaleString()} pcs</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    New Upload
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePreview}
                    className="px-4 py-2.5 rounded-lg bg-slate-800 text-sm font-medium text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Preview
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Order Information */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border border-slate-200 rounded-xl p-5 mb-5 shadow-sm"
            >
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Order Information
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Buyer', value: result.metadata.buyer },
                  { label: 'Booking No', value: result.metadata.booking },
                  { label: 'Style', value: truncateText(result.metadata.style, 20) },
                  { label: 'Season', value: result.metadata.season },
                  { label: 'Dept', value: result.metadata.dept },
                  { label: 'Item', value: result.metadata.item },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="bg-slate-50 rounded-lg p-3"
                  >
                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">{item.label}</div>
                    <div className={`text-sm font-medium truncate ${item.value === 'N/A' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Color Tables */}
            {result.tables.map((table, tableIdx) => (
              <motion.div
                key={tableIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + tableIdx * 0.1 }}
                className="bg-white border border-slate-200 rounded-xl mb-4 shadow-sm overflow-hidden"
              >
                {/* Table Header */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                      {tableIdx + 1}
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-slate-700">{table.color}</h5>
                      <p className="text-xs text-slate-400 mt-0.5">{table.rows.length} PO(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-slate-500">
                      Actual: <span className="font-semibold text-slate-700">{table.actualTotal.toLocaleString()}</span>
                    </div>
                    <div className="text-slate-500">
                      Order: <span className="font-semibold text-slate-700">{table.orderTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">PO No</th>
                        {table.sizes.map((size, idx) => (
                          <th key={idx} className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wide min-w-[60px]">{size}</th>
                        ))}
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {table.rows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-700">{row.poNo}</td>
                          {row.quantities.map((qty, qtyIdx) => (
                            <td key={qtyIdx} className={`px-3 py-3 text-center ${qty === 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                              {qty === 0 ? '-' : qty.toLocaleString()}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right font-medium text-slate-700">{row.total.toLocaleString()}</td>
                        </tr>
                      ))}
                      {/* Actual Qty Row */}
                      <tr className="bg-slate-50 font-semibold">
                        <td className="px-4 py-3 text-slate-700">Actual Qty</td>
                        {table.actualQty.map((qty, idx) => (
                          <td key={idx} className="px-3 py-3 text-center text-slate-700">{qty.toLocaleString()}</td>
                        ))}
                        <td className="px-4 py-3 text-right text-slate-700">{table.actualTotal.toLocaleString()}</td>
                      </tr>
                      {/* Order Qty +3% Row */}
                      <tr className="bg-emerald-50 font-semibold">
                        <td className="px-4 py-3 text-emerald-700">Order Qty (+3%)</td>
                        {table.orderQty3Percent.map((qty, idx) => (
                          <td key={idx} className="px-3 py-3 text-center text-emerald-700">{qty.toLocaleString()}</td>
                        ))}
                        <td className="px-4 py-3 text-right text-emerald-700">{table.orderTotal.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}

            {/* Grand Total */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-800 rounded-xl p-5 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Grand Total (All Colors)</p>
                  <p className="text-xs text-slate-500 mt-0.5">{result.tables.length} color variations</p>
                </div>
              </div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="text-right"
              >
                <span className="text-2xl font-bold text-white">{result.grandTotal.toLocaleString()}</span>
                <span className="text-sm text-slate-400 ml-2">pcs</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
