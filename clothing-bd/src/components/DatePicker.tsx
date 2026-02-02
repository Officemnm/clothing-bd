'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({ value, onChange, placeholder = 'Select date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(viewDate);

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const selectDate = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(selected);
    setIsOpen(false);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    return (
      day === value.getDate() &&
      viewDate.getMonth() === value.getMonth() &&
      viewDate.getFullYear() === value.getFullYear()
    );
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return placeholder;
    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTHS[date.getMonth()].slice(0, 3);
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const calendarDays = [];
  for (let i = 0; i < startingDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 bg-white border rounded-lg flex items-center justify-between cursor-pointer transition-all duration-200 ${
          isOpen 
            ? 'border-neutral-900 ring-1 ring-neutral-900' 
            : 'border-neutral-300 hover:border-neutral-400'
        }`}
        whileTap={{ scale: 0.995 }}
      >
        <span className={`text-sm ${value ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
          {formatDisplayDate(value)}
        </span>
        <motion.svg 
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-neutral-500" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-lg border border-neutral-200 shadow-lg z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100">
              <motion.button
                type="button"
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
                whileTap={{ scale: 0.92 }}
                onClick={prevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-md"
              >
                <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
              <span className="text-sm font-semibold text-neutral-800">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <motion.button
                type="button"
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
                whileTap={{ scale: 0.92 }}
                onClick={nextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-md"
              >
                <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 px-2 pt-2">
              {DAYS.map((day, i) => (
                <div key={i} className="text-center text-[11px] font-medium text-neutral-400 py-1.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5 p-2">
              {calendarDays.map((day, index) => (
                <div key={index} className="aspect-square flex items-center justify-center">
                  {day && (
                    <motion.button
                      type="button"
                      whileHover={{ backgroundColor: isSelected(day) ? undefined : 'rgba(0,0,0,0.04)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => selectDate(day)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                        isSelected(day)
                          ? 'bg-neutral-900 text-white'
                          : isToday(day)
                          ? 'text-neutral-900 ring-1 ring-neutral-300'
                          : 'text-neutral-700'
                      }`}
                    >
                      {day}
                    </motion.button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 px-2 pb-2">
              <motion.button
                type="button"
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const today = new Date();
                  onChange(today);
                  setViewDate(today);
                  setIsOpen(false);
                }}
                className="flex-1 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 rounded-md transition-colors"
              >
                Today
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  onChange(yesterday);
                  setViewDate(yesterday);
                  setIsOpen(false);
                }}
                className="flex-1 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-50 rounded-md transition-colors"
              >
                Yesterday
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
