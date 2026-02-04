'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  ChartBarIcon,
  DocumentTextIcon,
  CubeIcon,
  UsersIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  ChartBarIcon as ChartBarIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CubeIcon as CubeIconSolid,
  UsersIcon as UsersIconSolid,
} from '@heroicons/react/24/solid';

interface Stats {
  users: { count: number };
  accessories: { count: number };
  closing: { count: number };
  po: { count: number };
  challan: { count: number };
  hourly: { count: number };
  sewingClosing: { count: number };
  history: HistoryItem[];
  chart: { 
    labels: string[]; 
    closing: number[]; 
    po: number[]; 
    accessories: number[];
    challan: number[];
    hourly: number[];
    sewingClosing: number[];
  };
  userUsage: UserUsage[];
}

interface HistoryItem {
  ref: string;
  user: string;
  date: string;
  display_date?: string;
  time: string;
  type: string;
  iso_time?: string;
  file_count?: number;
  status?: 'success' | 'failed';
}

interface UserUsage {
  name: string;
  total: number;
}

interface UserInfo {
  username: string;
  name: string;
  role: string;
  permissions?: string[];
}

// Color palette - modern, minimal tones
const CHART_COLORS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e', '#6366f1'];

// Modern animation variants
const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };

// Page entrance animation
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 }
  }
};

// Stagger children animation
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.02 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
  }
};

const slideIn = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
  }
};

// Floating animation for decorative elements
const floatAnimation = {
  y: [0, -8, 0],
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

// Permission labels
const permissionLabels: Record<string, string> = {
  'closing': 'Closing Report',
  'po_sheet': 'PO Sheet',
  'accessories': 'Accessories',
};

// Service configs - NO PURPLE
const serviceConfig: Record<string, { 
  href: string; title: string; subtitle: string; icon: string; 
  gradient: string; bgGradient: string; iconBg: string;
}> = {
  'closing': {
    href: '/dashboard/closing-report',
    title: 'Closing Report',
    subtitle: 'Generate closing reports from ERP data',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-50/80 to-teal-50/80',
    iconBg: 'bg-emerald-500',
  },
  'po_sheet': {
    href: '/dashboard/po-generator',
    title: 'PO Generator',
    subtitle: 'Process and generate PO sheets',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    gradient: 'from-blue-500 to-cyan-600',
    bgGradient: 'from-blue-50/80 to-cyan-50/80',
    iconBg: 'bg-blue-500',
  },
  'accessories': {
    href: '/dashboard/accessories',
    title: 'Accessories',
    subtitle: 'Track and manage challans',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-50/80 to-orange-50/80',
    iconBg: 'bg-amber-500',
  },
  'sewing_closing_report': {
    href: '/dashboard/sewing-closing-report',
    title: 'Sewing Closing Report',
    subtitle: 'Sewing input & output report',
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
    gradient: 'from-rose-500 to-pink-600',
    bgGradient: 'from-rose-50/80 to-pink-50/80',
    iconBg: 'bg-rose-500',
  },
  'daily_line_wise_input_report': {
    href: '/dashboard/daily-line-wise-input-report',
    title: 'Daily Line Wise Input',
    subtitle: 'Hourly production monitoring report',
    icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    gradient: 'from-sky-500 to-blue-600',
    bgGradient: 'from-sky-50/80 to-blue-50/80',
    iconBg: 'bg-sky-500',
  },
  'challan_wise_input_report': {
    href: '/dashboard/challan-wise-input-report',
    title: 'Challan Wise Input',
    subtitle: 'Challan wise production report',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-50/80 to-purple-50/80',
    iconBg: 'bg-violet-500',
  },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [sessionKey, setSessionKey] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      // Use Bangladesh timezone (Asia/Dhaka) - get 24-hour format
      const now = new Date();
      const bdTimeStr = now.toLocaleString('en-US', { 
        timeZone: 'Asia/Dhaka', 
        hour: 'numeric', 
        hour12: false 
      });
      const bdHour = parseInt(bdTimeStr) || 0;
      
      if (bdHour >= 5 && bdHour < 12) setGreeting('Good Morning');
      else if (bdHour >= 12 && bdHour < 17) setGreeting('Good Afternoon');
      else if (bdHour >= 17 && bdHour < 21) setGreeting('Good Evening');
      else setGreeting('Good Night');
      
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'Asia/Dhaka'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Check for new login - reset state if needed
    const isNewLogin = sessionStorage.getItem('newLogin') === 'true';
    const loginUser = sessionStorage.getItem('loginUser') || '';
    
    if (isNewLogin) {
      console.log('[DashboardPage] New login detected for user:', loginUser);
      // Reset all state for new session
      setUserInfo(null);
      setStats(null);
      setSessionKey('');
      // Clear the flag immediately after reading
      sessionStorage.removeItem('newLogin');
      // Set the expected user
      if (loginUser) {
        setSessionKey(loginUser);
      }
    }
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const timestamp = Date.now();
      const results = await Promise.all([
        fetch(`/api/auth/session?t=${timestamp}`, { 
          cache: 'no-store', 
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
        }),
        fetch(`/api/stats?t=${timestamp}`, { 
          cache: 'no-store', 
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
        })
      ]);
      const userRes = results[0];
      const statsRes = results[1];
      if (userRes.ok) {
        const userData = await userRes.json();
        const newUsername = userData.user?.username || userData.user?.name;
        
        // If username changed, reset stats
        if (sessionKey && sessionKey !== newUsername) {
          console.log('[DashboardPage] User changed from', sessionKey, 'to', newUsername, '- resetting stats');
          setStats(null);
          // Clear cached login user
          sessionStorage.removeItem('loginUser');
        }
        
        setSessionKey(newUsername || '');
        setUserInfo(userData.user);
      }
      const data = await statsRes.json();
      if (data.success) setStats(data.data);
    } catch (error) { 
      console.error('Failed to fetch data:', error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const isAdmin = userInfo?.role === 'admin';
  const userPermissions = userInfo?.permissions || [];
  const username = userInfo?.username || userInfo?.name || 'User';

  const allowedServices = useMemo(() => {
    if (isAdmin) return Object.keys(serviceConfig);
    return userPermissions.filter(p => serviceConfig[p]);
  }, [isAdmin, userPermissions]);

  const serviceChartData = useMemo(() => {
    if (!stats?.chart) return [];
    return stats.chart.labels.map((label, i) => ({
      name: label,
      Closing: stats.chart.closing[i] || 0,
      PO: stats.chart.po[i] || 0,
      Accessories: stats.chart.accessories[i] || 0,
      Challan: stats.chart.challan?.[i] || 0,
      Hourly: stats.chart.hourly?.[i] || 0,
      SewingClosing: stats.chart.sewingClosing?.[i] || 0,
    }));
  }, [stats]);

  const userPieData = useMemo(() => {
    if (!stats?.userUsage) return [];
    return stats.userUsage.slice(0, 5).map(u => ({ name: u.name, value: u.total }));
  }, [stats]);

  const parseDate = useCallback((dateStr: string): Date => {
    if (!dateStr) return new Date(0);
    try {
      if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(dateStr);
    } catch { return new Date(0); }
  }, []);

  const myActivityData = useMemo(() => {
    if (!stats?.history || !username) return [];
    const myHistory = stats.history.filter(h => h.user?.toLowerCase() === username.toLowerCase());
    const typeCount: Record<string, number> = {};
    myHistory.forEach(h => { typeCount[h.type || 'Other'] = (typeCount[h.type || 'Other'] || 0) + 1; });
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [stats, username]);

  const myTodayCount = useMemo(() => {
    if (!stats?.history || !username) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return stats.history.filter(h => {
      if (h.user?.toLowerCase() !== username.toLowerCase()) return false;
      const itemDate = parseDate(h.date);
      return itemDate >= today;
    }).length;
  }, [stats, username, parseDate]);

  // Total reports count for the user (all time)
  const myTotalReports = useMemo(() => {
    if (!stats?.history || !username) return 0;
    return stats.history.filter(h => h.user?.toLowerCase() === username.toLowerCase()).length;
  }, [stats, username]);

  const filteredHistory = useMemo(() => {
    if (!stats?.history) return [];
    const historyToFilter = isAdmin ? stats.history : stats.history.filter(h => h.user?.toLowerCase() === username.toLowerCase());
    
    // Use iso_time for accurate sorting (newest first)
    const getDateTime = (item: HistoryItem) => {
      // Prefer iso_time if available (most accurate)
      if (item.iso_time) {
        return new Date(item.iso_time);
      }
      // Fallback: combine date and time
      if (item.date && item.time) {
        // Support both DD-MM-YYYY and YYYY-MM-DD
        let [d, m, y] = item.date.split('-');
        if (y && y.length === 4) { // YYYY-MM-DD format
          [y, m, d] = [d, m, y];
        }
        // Handle 12-hour time format (e.g., "02:30:15 PM")
        const timeStr = item.time || '00:00:00';
        const isPM = timeStr.toLowerCase().includes('pm');
        const isAM = timeStr.toLowerCase().includes('am');
        const timeParts = timeStr.replace(/[ap]m/gi, '').trim().split(':');
        let hour = parseInt(timeParts[0] || '0', 10);
        const min = parseInt(timeParts[1] || '0', 10);
        const sec = parseInt(timeParts[2] || '0', 10);
        
        if (isPM && hour !== 12) hour += 12;
        if (isAM && hour === 12) hour = 0;
        
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), hour, min, sec);
      }
      return parseDate(item.date);
    };
    
    const sorted = [...historyToFilter].sort((a, b) => getDateTime(b).getTime() - getDateTime(a).getTime());
    return sorted.filter((item) => {
      const matchesSearch = searchQuery === '' || 
        item.user?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.ref?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const itemDate = parseDate(item.date);
        if (dateFilter === 'today') {
          matchesDate = itemDate.toDateString() === today.toDateString();
        } else if (dateFilter === 'week') { 
          const weekAgo = new Date(today); 
          weekAgo.setDate(weekAgo.getDate() - 7); 
          matchesDate = itemDate >= weekAgo; 
        } else if (dateFilter === 'month') { 
          const monthAgo = new Date(today); 
          monthAgo.setMonth(monthAgo.getMonth() - 1); 
          matchesDate = itemDate >= monthAgo; 
        }
      }
      return matchesSearch && matchesType && matchesDate;
    });
  }, [stats, searchQuery, typeFilter, dateFilter, isAdmin, username, parseDate]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Closing Report': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      case 'PO Sheet': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'Accessories': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
      case 'Challan Report': return 'bg-violet-50 text-violet-700 ring-1 ring-violet-200';
      case 'Hourly Report': return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
      case 'Sewing Closing Report': return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
      default: return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
    }
  };

  const getStatusBadge = (status?: 'success' | 'failed') => {
    if (status === 'failed') {
      return 'bg-red-50 text-red-600 ring-1 ring-red-200';
    }
    return 'bg-green-50 text-green-600 ring-1 ring-green-200';
  };

  // Loading State - Modern minimal loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Animated Logo/Icon */}
          <div className="relative">
            {/* Outer ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center"
            >
              {/* Animated bars */}
              <div className="flex items-end gap-1 h-8">
                <motion.div
                  animate={{ height: ['40%', '100%', '40%'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                  className="w-2 bg-slate-300 rounded-full"
                  style={{ height: '40%' }}
                />
                <motion.div
                  animate={{ height: ['60%', '30%', '60%'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                  className="w-2 bg-slate-400 rounded-full"
                  style={{ height: '60%' }}
                />
                <motion.div
                  animate={{ height: ['30%', '80%', '30%'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                  className="w-2 bg-slate-500 rounded-full"
                  style={{ height: '30%' }}
                />
                <motion.div
                  animate={{ height: ['70%', '40%', '70%'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.45 }}
                  className="w-2 bg-slate-600 rounded-full"
                  style={{ height: '70%' }}
                />
              </div>
            </motion.div>
            
            {/* Progress dots */}
            <motion.div 
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1"
            >
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                className="w-1.5 h-1.5 bg-slate-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                className="w-1.5 h-1.5 bg-slate-400 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                className="w-1.5 h-1.5 bg-slate-400 rounded-full"
              />
            </motion.div>
          </div>
          
          {/* Text */}
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <p className="text-sm font-medium text-slate-600">Loading Dashboard</p>
            <motion.p 
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-xs text-slate-400 mt-1"
            >
              Please wait...
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ============ ADMIN DASHBOARD ============
  if (isAdmin) {
    // Key metrics - simplified to 4 main stats with glass morphism
    const keyMetrics = [
      { id: 'total', label: 'Total Reports', value: (stats?.closing.count || 0) + (stats?.po.count || 0) + (stats?.accessories.count || 0) + (stats?.challan?.count || 0) + (stats?.hourly?.count || 0) + (stats?.sewingClosing?.count || 0), iconType: 'chart', accent: '#64748b' },
      { id: 'today', label: 'Today', value: stats?.history?.filter(h => { const today = new Date(); today.setHours(0,0,0,0); const d = h.date?.split('-'); if(!d || d.length !== 3) return false; const itemDate = new Date(parseInt(d[2]), parseInt(d[1])-1, parseInt(d[0])); return itemDate >= today; }).length || 0, iconType: 'calendar', accent: '#10b981' },
      { id: 'users', label: 'Active Users', value: stats?.users.count || 0, iconType: 'users', accent: '#3b82f6' },
      { id: 'success', label: 'Success Rate', value: stats?.history ? Math.round((stats.history.filter(h => h.status !== 'failed').length / Math.max(stats.history.length, 1)) * 100) : 100, suffix: '%', iconType: 'check', accent: '#22c55e' },
    ];

    // Service breakdown for horizontal scroll section
    const serviceBreakdown = [
      { id: 'closing', label: 'Closing', value: stats?.closing.count || 0, color: '#10b981' },
      { id: 'po', label: 'PO Sheet', value: stats?.po.count || 0, color: '#3b82f6' },
      { id: 'accessories', label: 'Accessories', value: stats?.accessories.count || 0, color: '#f59e0b' },
      { id: 'challan', label: 'Challan', value: stats?.challan?.count || 0, color: '#8b5cf6' },
      { id: 'hourly', label: 'Hourly', value: stats?.hourly?.count || 0, color: '#0ea5e9' },
      { id: 'sewing', label: 'Sewing', value: stats?.sewingClosing?.count || 0, color: '#f43f5e' },
    ];

    return (
      <motion.div 
        variants={pageVariants} 
        initial="hidden" 
        animate="visible" 
        className="space-y-6 pb-8"
      >
        {/* Minimal Header */}
        <motion.header variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1"
            >
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </motion.p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {greeting}, <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">{username}</span>
            </h1>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <motion.div 
              animate={floatAnimation}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium shadow-lg shadow-slate-900/20"
            >
              {currentTime}
            </motion.div>
          </motion.div>
        </motion.header>

        {/* Key Metrics */}
        <motion.div variants={staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {keyMetrics.map((metric) => (
            <motion.div
              key={metric.id}
              variants={scaleIn}
              whileHover={{ y: -2, transition: springTransition }}
              className="bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  {metric.iconType === 'chart' && (
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  )}
                  {metric.iconType === 'calendar' && (
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  )}
                  {metric.iconType === 'users' && (
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  )}
                  {metric.iconType === 'check' && (
                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{metric.label}</p>
              </div>
              <motion.p 
                key={metric.value}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xl font-semibold text-slate-800 tabular-nums"
              >
                {metric.value.toLocaleString()}{metric.suffix || ''}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>

        {/* Service Breakdown */}
        <motion.div variants={fadeInUp}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Reports by Service</h2>
            <span className="text-[10px] text-slate-400">All time</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {serviceBreakdown.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -2 }}
                className="bg-white rounded-lg p-3 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-default"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: service.color }} />
                  <p className="text-[10px] text-slate-500 font-medium truncate">{service.label}</p>
                </div>
                <motion.p 
                  key={service.value}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-semibold text-slate-800 tabular-nums"
                >
                  {service.value.toLocaleString()}
                </motion.p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.section variants={fadeInUp}>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {allowedServices.map((key, i) => {
              const service = serviceConfig[key];
              if (!service) return null;
              return (
                <motion.div 
                  key={key} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ x: 2 }}
                >
                  <Link 
                    href={service.href} 
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={service.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-700 truncate">{service.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{service.subtitle}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Charts */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <motion.div 
            variants={scaleIn}
            className="lg:col-span-3 bg-white rounded-xl p-4 border border-slate-100"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Activity Trend</h3>
                <p className="text-[10px] text-slate-400">Last 7 days by service</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] text-slate-500">Closing</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[9px] text-slate-500">PO</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[9px] text-slate-500">Accessories</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /><span className="text-[9px] text-slate-500">Challan</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /><span className="text-[9px] text-slate-500">Hourly</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[9px] text-slate-500">Sewing</span></div>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serviceChartData}>
                  <defs>
                    <linearGradient id="closingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                    <linearGradient id="challanGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                    <linearGradient id="sewingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '11px', color: 'white', padding: '10px 14px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}
                  />
                  <Area type="monotone" dataKey="Closing" stroke="#10b981" strokeWidth={2} fill="url(#closingGrad)" />
                  <Area type="monotone" dataKey="PO" stroke="#3b82f6" strokeWidth={2} fill="url(#poGrad)" />
                  <Area type="monotone" dataKey="Accessories" stroke="#f59e0b" strokeWidth={2} fill="url(#accGrad)" />
                  <Area type="monotone" dataKey="Challan" stroke="#8b5cf6" strokeWidth={2} fill="url(#challanGrad)" />
                  <Area type="monotone" dataKey="Hourly" stroke="#0ea5e9" strokeWidth={2} fill="url(#hourlyGrad)" />
                  <Area type="monotone" dataKey="SewingClosing" stroke="#f43f5e" strokeWidth={2} fill="url(#sewingGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={scaleIn} className="lg:col-span-2 bg-white rounded-xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Contributors</h3>
            <div className="h-40">
              {userPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {userPieData.map((_, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '11px', color: 'white' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<div className="h-full flex items-center justify-center text-slate-400 text-xs">No data available</div>)}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              {userPieData.slice(0, 4).map((user, i) => (
                <motion.div 
                  key={user.name} 
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-[10px] text-slate-600 font-medium truncate max-w-[60px]">{user.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Recent Activity */}
        <motion.section variants={fadeInUp}>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="p-3 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-36 pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all" 
                  />
                </div>
                <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value)} 
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="Closing Report">Closing</option>
                  <option value="PO Sheet">PO</option>
                  <option value="Accessories">Accessories</option>
                </select>
                <select 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)} 
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Week</option>
                </select>
              </div>
            </div>
            
            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-slate-50">
              <AnimatePresence>
                {filteredHistory.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
                    <p className="text-xs text-slate-400">No records found</p>
                  </motion.div>
                ) : (
                  filteredHistory.slice(0, 8).map((item, index) => (
                    <motion.div 
                      key={`mobile-${item.date}-${item.time}-${index}`} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {item.user?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-800 truncate">{item.user}</span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${
                              item.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {item.status === 'failed' ? 'Failed' : 'OK'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.type} • {item.time}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Time</th>
                    <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">User</th>
                    <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Service</th>
                    <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Reference</th>
                    <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence>
                    {filteredHistory.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-xs text-slate-400">No records found</td></tr>
                    ) : (
                      filteredHistory.slice(0, 12).map((item, index) => (
                        <motion.tr 
                          key={`${item.date}-${item.time}-${index}`} 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          transition={{ delay: index * 0.02 }} 
                          className="hover:bg-slate-50/50"
                        >
                          <td className="py-2.5 px-4">
                            <p className="text-xs text-slate-700 font-medium">{item.time}</p>
                            <p className="text-[10px] text-slate-400">{item.display_date || item.date}</p>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center text-white text-[10px] font-medium">
                                {item.user?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span className="text-xs text-slate-700">{item.user}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${getTypeBadge(item.type)}`}>{item.type}</span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-500">{item.ref || '—'}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${
                              item.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {item.status === 'failed' ? 'Failed' : 'Success'}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredHistory.length > 12 && (
                <div className="py-2 text-center border-t border-slate-50">
                  <p className="text-[10px] text-slate-400">Showing 12 of {filteredHistory.length}</p>
                </div>
              )}
            </div>
          </div>
        </motion.section>
      </motion.div>
    );
  }

  // ============ USER DASHBOARD ============
  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible" className="space-y-5">
      {/* Minimal Header */}
      <motion.header variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Welcome back, {username}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{greeting} — Your workspace is ready.</p>
        </div>
        <motion.div animate={floatAnimation} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium">
          {currentTime}
        </motion.div>
      </motion.header>

      {/* User Stats Row */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div variants={scaleIn} whileHover={{ y: -2 }} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Today</p>
          </div>
          <p className="text-xl font-semibold text-slate-800 tabular-nums">{myTodayCount}</p>
        </motion.div>
        <motion.div variants={scaleIn} whileHover={{ y: -2 }} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Total</p>
          </div>
          <p className="text-xl font-semibold text-slate-800 tabular-nums">{myTotalReports}</p>
        </motion.div>
        <motion.div variants={scaleIn} whileHover={{ y: -2 }} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Services</p>
          </div>
          <p className="text-xl font-semibold text-slate-800 tabular-nums">{allowedServices.length}</p>
        </motion.div>
        <motion.div variants={scaleIn} whileHover={{ y: -2 }} className="bg-white rounded-xl p-4 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Weekly</p>
          </div>
          <p className="text-xl font-semibold text-slate-800 tabular-nums">{myActivityData.reduce((sum, item) => sum + item.value, 0)}</p>
        </motion.div>
      </motion.div>

      {/* Your Services - Clean Cards */}
      <motion.section variants={fadeInUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Your Services</h2>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{allowedServices.length} available</span>
        </div>
        
        {allowedServices.length === 0 ? (
          <motion.div variants={scaleIn} className="bg-white rounded-xl p-10 text-center border border-slate-100">
            <motion.div animate={floatAnimation} className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </motion.div>
            <h3 className="text-base font-semibold text-slate-700">No Services Assigned</h3>
            <p className="text-xs text-slate-400 mt-1">Contact your administrator for access.</p>
          </motion.div>
        ) : (
          <div className={`grid gap-3 ${allowedServices.length === 1 ? 'grid-cols-1 max-w-md' : allowedServices.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {allowedServices.map((permission, index) => {
              const service = serviceConfig[permission];
              if (!service) return null;
              return (
                <motion.div key={permission} variants={scaleIn} custom={index} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
                  <Link href={service.href} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors">
                      <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={service.icon} /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-medium text-slate-700 truncate">{service.title}</h3>
                      <p className="text-[10px] text-slate-400 truncate">{service.subtitle}</p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Charts - Minimal Design */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div variants={scaleIn} className="lg:col-span-3 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Activity Overview</h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-400">Closing</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-slate-400">PO</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-slate-400">Others</span></div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serviceChartData}>
                <defs>
                  <linearGradient id="userClosingG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="userPoG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="userAccG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '11px', color: 'white' }} />
                <Area type="monotone" dataKey="Closing" stroke="#10b981" strokeWidth={2} fill="url(#userClosingG)" />
                <Area type="monotone" dataKey="PO" stroke="#3b82f6" strokeWidth={2} fill="url(#userPoG)" />
                <Area type="monotone" dataKey="Accessories" stroke="#f59e0b" strokeWidth={2} fill="url(#userAccG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={scaleIn} className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Your Activity</h3>
          <div className="h-44">
            {myActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={myActivityData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {myActivityData.map((_, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', fontSize: '11px', color: 'white' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No activity yet</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {myActivityData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-[10px] text-slate-500 truncate max-w-[60px]">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Recent Activity - Clean Table */}
      <motion.section variants={fadeInUp}>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700">Your Recent Activity</h3>
            <div className="flex gap-2">
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)} 
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {allowedServices.map(p => (<option key={p} value={permissionLabels[p] || p}>{permissionLabels[p] || p}</option>))}
              </select>
              <select 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)} 
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Week</option>
              </select>
            </div>
          </div>
          
          {/* Mobile View */}
          <div className="sm:hidden divide-y divide-slate-50">
            <AnimatePresence>
              {filteredHistory.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
                  <p className="text-xs text-slate-400">No activity yet</p>
                </motion.div>
              ) : (
                filteredHistory.slice(0, 8).map((item, index) => (
                  <motion.div 
                    key={`user-mobile-${item.date}-${item.time}-${index}`} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getTypeBadge(item.type)}`}>{item.type}</span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${
                            item.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {item.status === 'failed' ? 'Failed' : 'OK'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-1">{item.ref || '—'}</p>
                        <p className="text-[10px] text-slate-400">{item.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Time</th>
                  <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Service</th>
                  <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Reference</th>
                  <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-xs text-slate-400">No activity yet. Start using services!</td></tr>
                  ) : (
                    filteredHistory.slice(0, 10).map((item, index) => (
                      <motion.tr 
                        key={`${item.date}-${item.time}-${index}`} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ delay: index * 0.02 }} 
                        className="hover:bg-slate-50/50"
                      >
                        <td className="py-2.5 px-4">
                          <p className="text-xs text-slate-700 font-medium">{item.time}</p>
                          <p className="text-[10px] text-slate-400">{item.display_date || item.date}</p>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${getTypeBadge(item.type)}`}>{item.type}</span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-500">{item.ref || '—'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${
                            item.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {item.status === 'failed' ? 'Failed' : 'Success'}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredHistory.length > 10 && (
              <div className="py-2 text-center border-t border-slate-50">
                <p className="text-[10px] text-slate-400">Showing 10 of {filteredHistory.length}</p>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
