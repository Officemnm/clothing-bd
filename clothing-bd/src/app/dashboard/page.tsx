'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

interface Stats {
  users: { count: number };
  accessories: { count: number };
  closing: { count: number };
  po: { count: number };
  history: HistoryItem[];
  chart: { labels: string[]; closing: number[]; po: number[]; accessories: number[] };
  userUsage: UserUsage[];
}

interface HistoryItem {
  ref: string;
  user: string;
  date: string;
  display_date?: string;
  time: string;
  type: string;
  file_count?: number;
}

interface UserUsage {
  name: string;
  total: number;
}

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#64748b', '#0d9488'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
};

const pulseAnimation = {
  scale: [1, 1.02, 1],
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
};

interface UserData {
  username: string;
  role: string;
  phone?: string;
  photo?: string;
  email?: string;
  designation?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchUserData();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) { console.error('Failed to fetch stats:', error); }
    finally { setIsLoading(false); }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user', { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (data.success) setUserData(data.user);
    } catch (error) { console.error('Failed to fetch user:', error); }
  };

  const serviceChartData = useMemo(() => {
    if (!stats?.chart) return [];
    return stats.chart.labels.map((label, i) => ({
      name: label,
      Closing: stats.chart.closing[i] || 0,
      PO: stats.chart.po[i] || 0,
      Accessories: stats.chart.accessories[i] || 0,
    }));
  }, [stats]);

  const userPieData = useMemo(() => {
    if (!stats?.userUsage) return [];
    return stats.userUsage.slice(0, 5).map(u => ({ name: u.name, value: u.total }));
  }, [stats]);

  const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(0);
    try {
      if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      return new Date(dateStr);
    } catch { return new Date(0); }
  };

  const isSameDay = (d1: Date, d2: Date): boolean => 
    d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

  const filteredHistory = useMemo(() => {
    if (!stats?.history) return [];
    const sorted = [...stats.history].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (dateB.getTime() !== dateA.getTime()) return dateB.getTime() - dateA.getTime();
      return (b.time || '').localeCompare(a.time || '');
    });
    return sorted.filter((item) => {
      const matchesSearch = searchQuery === '' || 
        item.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.ref?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const itemDate = parseDate(item.date);
        if (dateFilter === 'today') matchesDate = isSameDay(itemDate, today);
        else if (dateFilter === 'week') {
          const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = itemDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = itemDate >= monthAgo;
        }
      }
      return matchesSearch && matchesType && matchesDate;
    });
  }, [stats, searchQuery, typeFilter, dateFilter]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Closing Report': return 'bg-gradient-to-r from-slate-700 to-slate-900 text-white';
      case 'PO Sheet': return 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white';
      case 'Accessories': return 'bg-gradient-to-r from-amber-600 to-orange-600 text-white';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-600"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <p className="text-lg font-semibold text-slate-700">Loading Dashboard</p>
            <p className="text-sm text-slate-400 mt-1">Please wait...</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const statCards = [
    { id: 'closing', label: 'Closing Reports', value: stats?.closing.count || 0, icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', gradient: 'from-emerald-600 to-teal-600', shadow: 'shadow-emerald-500/25' },
    { id: 'po', label: 'PO Sheets', value: stats?.po.count || 0, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', gradient: 'from-cyan-600 to-blue-600', shadow: 'shadow-cyan-500/25' },
    { id: 'accessories', label: 'Accessories', value: stats?.accessories.count || 0, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', gradient: 'from-amber-600 to-orange-600', shadow: 'shadow-amber-500/25' },
    { id: 'users', label: 'Active Users', value: stats?.users.count || 0, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', gradient: 'from-slate-700 to-slate-900', shadow: 'shadow-slate-500/25' },
  ];

  const quickActions = [
    { href: '/dashboard/closing-report', title: 'Closing Report', subtitle: 'Generate from ERP', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', gradient: 'from-emerald-600 to-teal-600', shadow: 'shadow-emerald-500/25' },
    { href: '/dashboard/accessories', title: 'Accessories', subtitle: 'Challan tracking', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', gradient: 'from-amber-600 to-orange-600', shadow: 'shadow-amber-500/25' },
    { href: '/dashboard/po-generator', title: 'PO Generator', subtitle: 'Process PDF files', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', gradient: 'from-cyan-600 to-blue-600', shadow: 'shadow-cyan-500/25' },
  ];

  const notifications = [
    { id: 1, title: 'New closing report generated', time: '2 min ago', type: 'success' },
    { id: 2, title: 'PO Sheet updated', time: '15 min ago', type: 'info' },
    { id: 3, title: 'Accessories data synced', time: '1 hour ago', type: 'info' },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Fixed Glass Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/50"
      >
        <div className="flex items-center justify-between gap-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent tracking-tight">
              Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-emerald-500 rounded-full"
              />
              <p className="text-sm text-slate-500">Real-time analytics overview</p>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative hidden sm:block"
            >
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={headerSearchQuery}
                onChange={(e) => setHeaderSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2.5 text-sm bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-400 transition-all"
              />
            </motion.div>

            {/* Notification Bell */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className="relative p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                >
                  3
                </motion.span>
              </motion.button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                      <h3 className="font-semibold text-slate-800">Notifications</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notif, index) => (
                        <motion.div
                          key={notif.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 mt-2 rounded-full ${notif.type === 'success' ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                            <div>
                              <p className="text-sm font-medium text-slate-700">{notif.title}</p>
                              <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Profile */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className="flex items-center gap-2 p-1.5 pr-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all"
              >
                {userData?.photo ? (
                  <img src={userData.photo} alt={userData.username} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    {userData?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </motion.button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                  >
                    <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                      <div className="flex items-center gap-4">
                        {userData?.photo ? (
                          <img src={userData.photo} alt={userData.username} className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-200" />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-200/50">
                            {userData?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-lg truncate">{userData?.username || 'User'}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {userData?.designation || (userData?.role === 'admin' ? 'Administrator' : 'User')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* User Details */}
                    <div className="p-4 space-y-3 bg-slate-50/50">
                      {userData?.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                          </div>
                          <span className="text-slate-600 truncate">{userData.email}</span>
                        </div>
                      )}
                      {userData?.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                          </div>
                          <span className="text-slate-600">{userData.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                        </div>
                        <span className="text-slate-600 capitalize">{userData?.role || 'User'}</span>
                      </div>
                    </div>
                    
                    <div className="p-2 border-t border-slate-100">
                      <button className="w-full flex items-center gap-3 p-3 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Settings
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 pt-6"
        onClick={() => { setShowNotifications(false); setShowProfile(false); }}
      >

      {/* Stats Cards */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-6 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full" />
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Overview</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`relative bg-white rounded-2xl border border-slate-100 p-5 overflow-hidden transition-all duration-300 shadow-lg ${card.shadow}`}
              >
                {/* Gradient Background Accent */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full blur-2xl`} />
                
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                    <motion.p
                      key={card.value}
                      initial={{ scale: 0.5, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="text-3xl font-bold text-slate-800 mt-2 tracking-tight"
                    >
                      {card.value}
                    </motion.p>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-xl flex items-center justify-center shadow-lg ${card.shadow}`}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </motion.div>
                </div>
                
                {/* Animated Line */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                  className={`h-1 bg-gradient-to-r ${card.gradient} rounded-full mt-4 opacity-60`}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

      {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-6 bg-gradient-to-b from-cyan-600 to-blue-600 rounded-full" />
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Link
                  href={action.href}
                  className={`relative flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 hover:shadow-xl transition-all duration-300 group overflow-hidden ${action.shadow}`}
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center shadow-lg ${action.shadow}`}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                    </svg>
                  </motion.div>
                  <div className="flex-1 relative z-10">
                    <p className="font-semibold text-slate-800 group-hover:text-slate-900">{action.title}</p>
                    <p className="text-sm text-slate-400">{action.subtitle}</p>
                  </div>
                  <motion.svg 
                    className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-all" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2}
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </motion.svg>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

      {/* Charts */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-6 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full" />
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Analytics</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(16, 185, 129, 0.12)' }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-lg shadow-emerald-100/50 transition-all duration-300"
            >
              <h3 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full"></span>
                Service Reports (Last 7 Days)
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serviceChartData}>
                    <defs>
                      <linearGradient id="closingGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255,255,255,0.98)', 
                        border: 'none', 
                        borderRadius: '16px', 
                        fontSize: '12px',
                        boxShadow: '0 20px 60px rgba(100, 116, 139, 0.2)'
                      }} 
                    />
                    <Area type="monotone" dataKey="Closing" stroke="#10b981" strokeWidth={2.5} fill="url(#closingGrad)" />
                    <Area type="monotone" dataKey="PO" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#poGrad)" />
                    <Area type="monotone" dataKey="Accessories" stroke="#f59e0b" strokeWidth={2.5} fill="url(#accGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs text-slate-500 font-medium">Closing</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-cyan-500" /><span className="text-xs text-slate-500 font-medium">PO</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs text-slate-500 font-medium">Accessories</span></div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(100, 116, 139, 0.12)' }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-lg shadow-slate-100/50 transition-all duration-300"
            >
              <h3 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full"></span>
                User Activity Distribution
              </h3>
              <div className="h-56">
                {userPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={userPieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={75} 
                        paddingAngle={5} 
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} 
                        labelLine={false}
                      >
                        {userPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.98)', 
                      border: 'none', 
                      borderRadius: '16px', 
                      fontSize: '12px',
                      boxShadow: '0 20px 60px rgba(100, 116, 139, 0.2)'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={30} 
                    formatter={(value) => <span className="text-xs text-slate-500 font-medium">{value}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
            )}
              </div>
            </motion.div>
          </div>
        </motion.div>

      {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-6 bg-gradient-to-b from-slate-600 to-slate-800 rounded-full" />
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Recent Activity</h2>
          </div>
          <motion.div
            whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(100, 116, 139, 0.1)' }}
            className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-lg shadow-slate-100/50 transition-all duration-300"
          >
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[150px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 placeholder:text-slate-400 transition-all"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 cursor-pointer text-slate-600 transition-all"
                >
                  <option value="all">All Types</option>
                  <option value="Closing Report">Closing Report</option>
                  <option value="PO Sheet">PO Sheet</option>
                  <option value="Accessories">Accessories</option>
                </select>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 cursor-pointer text-slate-600 transition-all"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-pink-50/30">
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-5">Date & Time</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-5">User</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-5">Type</th>
                    <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-5">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-sm text-slate-400">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center gap-3"
                        >
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                          </div>
                          <span className="font-medium text-slate-500">No records found</span>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.slice(0, 20).map((item, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-gradient-to-r hover:from-white hover:to-pink-50/20 transition-all duration-200"
                  >
                        <td className="py-4 px-5">
                          <p className="text-sm font-semibold text-slate-700">{item.time}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.display_date || item.date}</p>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-purple-200/50">
                              {item.user?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-sm text-slate-700 font-medium">{item.user}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm ${getTypeBadge(item.type)}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-sm text-slate-500 font-medium">
                          {item.ref || (item.file_count ? `${item.file_count} Files` : '-')}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredHistory.length > 20 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 text-center border-t border-slate-100 bg-gradient-to-r from-white to-pink-50/30"
              >
                <p className="text-xs text-slate-500 font-medium">Showing 20 of {filteredHistory.length} records</p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
