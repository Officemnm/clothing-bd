'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

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
    <div className="max-w-2xl mx-auto">
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
              <p className="text-sm font-medium text-slate-600">Processing files...</p>
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
            <DocumentTextIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">PO Sheet Generator</h1>
            <p className="text-xs text-slate-500">Extract size-wise quantity from PO PDFs</p>
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
          <h2 className="text-sm font-semibold text-slate-800">Upload PDF Files</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-slate-400 bg-slate-50' 
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
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
            <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-100 flex items-center justify-center">
              <CloudArrowUpIcon className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-600 font-medium mb-0.5">
              {isDragging ? 'Drop files here' : 'Drag & drop files'}
            </p>
            <p className="text-xs text-slate-400">or click to browse</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-500">PDF</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-500">Multiple files</span>
            </div>
          </div>

          <AnimatePresence>
            {files && files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">
                      {files.length} file{files.length > 1 ? 's' : ''} selected
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(files).slice(0, 4).map((f, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-white text-xs text-slate-600 border border-slate-200">
                        {f.name.length > 20 ? f.name.slice(0, 17) + '...' : f.name}
                      </span>
                    ))}
                    {files.length > 4 && (
                      <span className="px-2 py-1 rounded bg-slate-200 text-xs text-slate-600">
                        +{files.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          <motion.button
            type="submit"
            disabled={isLoading || !files}
            whileTap={{ scale: 0.98 }}
            className={`w-full h-10 mt-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              isLoading || !files
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            <ArrowPathIcon className="w-4 h-4" />
            Generate PO Sheet
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
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { step: 1, title: 'Upload PDFs', desc: 'Select PO files' },
            { step: 2, title: 'Auto Process', desc: 'Data extraction' },
            { step: 3, title: 'View Result', desc: 'Size breakdown' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">{item.title}</p>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
