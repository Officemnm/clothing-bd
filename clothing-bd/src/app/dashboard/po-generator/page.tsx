'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(e.dataTransfer.files);
      setError('');
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
        sessionStorage.setItem('poPreviewData', JSON.stringify(data.data));
        router.push('/po-preview');
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
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
              className="flex flex-col items-center gap-6"
            >
              {/* Modern Dots Loader */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-blue-500"
                    animate={{
                      y: [0, -12, 0],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-slate-500">Processing...</p>
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
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-200"
          >
            <DocumentTextIcon className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">PO Sheet Generator</h1>
            <p className="text-sm text-slate-500">Extract size-wise quantity data from Purchase Order PDFs</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
          {/* Upload Section */}
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Upload Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">Upload PDF Files</h2>
                <p className="text-sm text-slate-500 mt-1">Select one or multiple PO files to process</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                {/* Upload Area */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
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
                  <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-slate-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-base text-slate-600 font-medium mb-1">
                    {isDragging ? 'Drop your files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-slate-400">or click to browse</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="px-3 py-1 rounded bg-slate-200 text-xs font-medium text-slate-600">PDF</span>
                    <span className="px-3 py-1 rounded bg-slate-200 text-xs font-medium text-slate-600">Multiple files</span>
                  </div>
                </div>

                {/* Selected Files */}
                <AnimatePresence>
                  {files && files.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-semibold text-green-800">
                            {files.length} file{files.length > 1 ? 's' : ''} selected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(files).slice(0, 5).map((f, i) => (
                            <span key={i} className="px-3 py-1.5 rounded bg-white text-xs text-green-700 font-medium border border-green-200">
                              {f.name.length > 25 ? f.name.slice(0, 22) + '...' : f.name}
                            </span>
                          ))}
                          {files.length > 5 && (
                            <span className="px-3 py-1.5 rounded bg-green-600 text-xs text-white font-medium">
                              +{files.length - 5} more
                            </span>
                          )}
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
                      className="mt-4"
                    >
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-red-800">{error}</span>
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
                  className={`w-full h-12 mt-6 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    isLoading || !files
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate PO Sheet
                </motion.button>
              </form>
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">How it works</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { step: 1, title: 'Upload PDFs', desc: 'Select one or multiple PO files' },
                  { step: 2, title: 'Auto Processing', desc: 'System extracts data from files' },
                  { step: 3, title: 'View Results', desc: 'See merged size breakdown' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
