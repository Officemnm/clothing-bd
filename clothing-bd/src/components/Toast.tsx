'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose, 
  duration = 4000 
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const typeStyles = {
    info: {
      bg: 'bg-slate-800',
      border: 'border-slate-700',
      icon: InformationCircleIcon,
      iconColor: 'text-slate-300',
    },
    success: {
      bg: 'bg-emerald-800',
      border: 'border-emerald-700',
      icon: CheckCircleIcon,
      iconColor: 'text-emerald-300',
    },
    warning: {
      bg: 'bg-amber-800',
      border: 'border-amber-700',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-amber-300',
    },
    error: {
      bg: 'bg-red-800',
      border: 'border-red-700',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-red-300',
    },
  };

  const style = typeStyles[type];
  const Icon = style.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${style.bg} ${style.border} border rounded-xl shadow-2xl shadow-black/20 px-4 py-3 flex items-center gap-3 max-w-[90vw] sm:max-w-md`}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 ${style.iconColor}`} />
          <span className="text-white text-sm font-medium flex-1">{message}</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-4 h-4 text-white/70" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
