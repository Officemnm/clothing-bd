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

// Color palette - NO PURPLE - using teal, amber, blue, green, cyan
const CHART_COLORS = ['#14b8a6', '#f59e0b', '#3b82f6', '#22c55e', '#06b6d4'];

// Smooth spring animation
const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };

// Stagger children animation
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.4, ease: 'easeOut' as const }
  }
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

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 17) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const timestamp = Date.now();
      const results = await Promise.all([
        fetch(`/api/auth/session?t=${timestamp}`, { cache: 'no-store', credentials: 'include' }),
        fetch(`/api/stats?t=${timestamp}`, { cache: 'no-store', credentials: 'include' })
      ]);
      const userRes = results[0];
      const statsRes = results[1];
      if (userRes.ok) {
        const userData = await userRes.json();
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
    // Combine date and time into a single Date object for accurate sorting
    const getDateTime = (item: HistoryItem) => {
      // Try to combine date and time, fallback to just date
      if (item.date && item.time) {
        // Support both DD-MM-YYYY and YYYY-MM-DD
        let [d, m, y] = item.date.split('-');
        if (y.length === 4) { // YYYY-MM-DD
          [y, m, d] = [d, m, y];
        }
        // time: HH:MM:SS or HH:MM
        const t = (item.time || '00:00:00').split(':');
        const hour = parseInt(t[0] || '0', 10);
        const min = parseInt(t[1] || '0', 10);
        const sec = parseInt(t[2] || '0', 10);
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
      default: return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-[3px] border-slate-200 border-t-teal-500"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-3 h-3 bg-teal-500 rounded-full" />
            </motion.div>
          </div>
          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-slate-500 font-medium tracking-wide"
          >
            Loading your dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ============ ADMIN DASHBOARD ============
  if (isAdmin) {
    const statCards = [
      { 
        id: 'closing', 
        label: 'Closing Reports', 
        value: stats?.closing.count || 0, 
        icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 
        gradient: 'from-emerald-500 to-teal-500'
      },
      { 
        id: 'po', 
        label: 'PO Sheets', 
        value: stats?.po.count || 0, 
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', 
        gradient: 'from-blue-500 to-cyan-500'
      },
      { 
        id: 'accessories', 
        label: 'Accessories', 
        value: stats?.accessories.count || 0, 
        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', 
        gradient: 'from-amber-500 to-orange-500'
      },
      { 
        id: 'users', 
        label: 'Active Users', 
        value: stats?.users.count || 0, 
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', 
        gradient: 'from-cyan-500 to-teal-500'
      },
    ];

    return (
      <motion.div 
        variants={staggerContainer} 
        initial="hidden" 
        animate="visible" 
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="flex items-start justify-between">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full mb-3"
            >
              <motion.span 
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 bg-teal-500 rounded-full"
              />
              <span className="text-[10px] font-semibold text-teal-600 tracking-wide uppercase">Admin Panel</span>
            </motion.div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">{greeting}, {username}</h1>
            <p className="text-sm text-slate-500 mt-1">Here&apos;s what&apos;s happening with your system today.</p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-right hidden md:block"
          >
            <p className="text-2xl font-light text-slate-700">{currentTime}</p>
            <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </motion.div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <motion.div 
              key={card.id} 
              variants={scaleIn}
              whileHover={{ 
                y: -4, 
                transition: springTransition 
              }}
              whileTap={{ scale: 0.98 }}
              className="relative bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm overflow-hidden group cursor-pointer"
            >
              <motion.div 
                className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-[0.06] rounded-full`}
                whileHover={{ scale: 1.5, opacity: 0.1 }}
                transition={{ duration: 0.4 }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-slate-400 font-medium">Total</motion.div>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={card.value}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-2xl font-semibold text-slate-800"
                  >
                    {card.value.toLocaleString()}
                  </motion.p>
                </AnimatePresence>
                <p className="text-xs text-slate-500 mt-1 font-medium">{card.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeInUp}>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(serviceConfig).map(([key, service]) => (
              <motion.div key={key} variants={slideInLeft} whileHover={{ x: 3, transition: springTransition }}>
                <Link href={service.href} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200/80 hover:border-teal-200 hover:shadow-md transition-all duration-300 group shadow-sm">
                  <motion.div 
                    whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-sm`}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={service.icon} />
                    </svg>
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 group-hover:text-teal-600 transition-colors truncate">{service.title}</p>
                    <p className="text-xs text-slate-400 truncate">{service.subtitle}</p>
                  </div>
                  <motion.svg animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </motion.svg>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Activity Overview</h3>
                <p className="text-xs text-slate-400 mt-0.5">Last 7 days performance</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-500">Closing</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-slate-500">PO</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-slate-500">Accessories</span></div>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serviceChartData}>
                  <defs>
                    <linearGradient id="closingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                    <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', padding: '10px 14px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Closing" stroke="#22c55e" strokeWidth={2} fill="url(#closingGrad)" />
                  <Area type="monotone" dataKey="PO" stroke="#3b82f6" strokeWidth={2} fill="url(#poGrad)" />
                  <Area type="monotone" dataKey="Accessories" stroke="#f59e0b" strokeWidth={2} fill="url(#accGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">User Distribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">Top contributors</p>
              </div>
            </div>
            <div className="h-56">
              {userPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={userPieData} cx="50%" cy="45%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {userPieData.map((_, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (<div className="h-full flex items-center justify-center text-slate-400 text-xs">No data available</div>)}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {userPieData.slice(0, 4).map((user, i) => (
                <div key={user.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-[10px] text-slate-500 truncate max-w-[70px]">{user.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Activity Table */}
        <motion.div variants={fadeInUp}>
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
                  <p className="text-xs text-slate-400 mt-0.5">All user activities across services</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 w-40" />
                  </div>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer">
                    <option value="all">All Types</option><option value="Closing Report">Closing Report</option><option value="PO Sheet">PO Sheet</option><option value="Accessories">Accessories</option>
                  </select>
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer">
                    <option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Time</th>
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">User</th>
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Service</th>
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Reference</th>
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence>
                    {filteredHistory.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">No records found</span>
                        </motion.div>
                      </td></tr>
                    ) : (
                      filteredHistory.slice(0, 15).map((item, index) => (
                        <motion.tr key={`${item.date}-${item.time}-${index}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ delay: index * 0.02 }} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5"><p className="text-xs font-medium text-slate-700">{item.time}</p><p className="text-[10px] text-slate-400">{item.display_date || item.date}</p></td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm">{item.user?.charAt(0).toUpperCase() || '?'}</div>
                              <span className="text-xs text-slate-700 font-medium">{item.user}</span>
                            </div>
                          </td>
                          <td className="py-3 px-5"><span className={`inline-flex px-2.5 py-1 text-[10px] font-medium rounded-full ${getTypeBadge(item.type)}`}>{item.type}</span></td>
                          <td className="py-3 px-5 text-xs text-slate-500 font-medium">{item.ref || (item.file_count ? `${item.file_count} Files` : '—')}</td>
                          <td className="py-3 px-5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                              item.status === 'failed' 
                                ? 'bg-red-50 text-red-600 ring-1 ring-red-200' 
                                : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                            }`}>
                              {item.status === 'failed' ? (
                                <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Failed</>
                              ) : (
                                <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Success</>
                              )}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {filteredHistory.length > 15 && (<div className="p-3 text-center border-t border-slate-50 bg-slate-50/30"><p className="text-[10px] text-slate-400">Showing 15 of {filteredHistory.length} records</p></div>)}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ============ USER DASHBOARD ============
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Simple Header - Matching Admin Style */}
      <motion.div variants={fadeInUp} className="flex items-start justify-between">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 rounded-full mb-3"
          >
            <motion.span 
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-1.5 bg-teal-500 rounded-full"
            />
            <span className="text-[11px] font-medium text-teal-600 tracking-wide uppercase">{greeting}</span>
          </motion.div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Welcome back, {username}</h1>
          <p className="text-sm text-slate-500 mt-1">Your personalized workspace is ready.</p>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-right hidden md:block"
        >
          <p className="text-2xl font-light text-slate-700">{currentTime}</p>
          <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </motion.div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div 
          variants={scaleIn}
          whileHover={{ y: -4, transition: springTransition }}
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 font-medium">Today</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p 
              key={myTodayCount}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl font-semibold text-slate-800"
            >
              {myTodayCount}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-slate-500 mt-1">Today&apos;s Reports</p>
        </motion.div>

        <motion.div 
          variants={scaleIn}
          whileHover={{ y: -4, transition: springTransition }}
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 font-medium">All Time</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p 
              key={myTotalReports}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl font-semibold text-slate-800"
            >
              {myTotalReports}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-slate-500 mt-1">Total Reports</p>
        </motion.div>

        <motion.div 
          variants={scaleIn}
          whileHover={{ y: -4, transition: springTransition }}
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 font-medium">Available</span>
          </div>
          <p className="text-2xl font-semibold text-slate-800">{allowedServices.length}</p>
          <p className="text-xs text-slate-500 mt-1">Services</p>
        </motion.div>

        <motion.div 
          variants={scaleIn}
          whileHover={{ y: -4, transition: springTransition }}
          className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-slate-400 font-medium">Last 7 Days</span>
          </div>
          <p className="text-2xl font-semibold text-slate-800">{myActivityData.reduce((sum, item) => sum + item.value, 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Weekly Activities</p>
        </motion.div>
      </motion.div>

      {/* Services */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Your Services</h2>
          <span className="text-xs text-slate-400">{allowedServices.length} available</span>
        </div>
        
        {allowedServices.length === 0 ? (
          <motion.div variants={scaleIn} className="bg-white rounded-xl p-10 text-center border border-slate-200/80 shadow-sm">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </motion.div>
            <h3 className="text-lg font-semibold text-slate-700">No Services Assigned</h3>
            <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">Please contact your administrator to get access to services.</p>
          </motion.div>
        ) : (
          <div className={`grid gap-4 ${allowedServices.length === 1 ? 'grid-cols-1 max-w-md' : allowedServices.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {allowedServices.map((permission, index) => {
              const service = serviceConfig[permission];
              if (!service) return null;
              return (
                <motion.div key={permission} variants={scaleIn} custom={index} whileHover={{ y: -4, transition: springTransition }} whileTap={{ scale: 0.98 }}>
                  <Link href={service.href} className="block p-5 bg-white rounded-xl border border-slate-200/80 hover:border-teal-200 hover:shadow-md transition-all duration-300 group shadow-sm">
                    <div className="flex items-start gap-4">
                      <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }} className={`w-11 h-11 rounded-lg bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={service.icon} /></svg>
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">{service.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{service.subtitle}</p>
                      </div>
                      <motion.svg animate={{ x: [0, 3, 0] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></motion.svg>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Charts - Same as Admin */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Activity Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days performance</p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-500">Closing</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-slate-500">PO</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[10px] text-slate-500">Accessories</span></div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serviceChartData}>
                <defs>
                  <linearGradient id="userClosingGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                  <linearGradient id="userPoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="userAccGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', padding: '10px 14px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="Closing" stroke="#22c55e" strokeWidth={2} fill="url(#userClosingGrad)" />
                <Area type="monotone" dataKey="PO" stroke="#3b82f6" strokeWidth={2} fill="url(#userPoGrad)" />
                <Area type="monotone" dataKey="Accessories" stroke="#f59e0b" strokeWidth={2} fill="url(#userAccGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Your Activity</h3>
              <p className="text-xs text-slate-400 mt-0.5">Work by service type</p>
            </div>
          </div>
          <div className="h-56">
            {myActivityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={myActivityData} cx="50%" cy="45%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {myActivityData.map((_, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No activity data yet</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {myActivityData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                <span className="text-[10px] text-slate-500 truncate max-w-[70px]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent Activity Table */}
      <motion.div variants={fadeInUp}>
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Your Recent Activity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Track your work history</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer">
                  <option value="all">All Types</option>
                  {allowedServices.map(p => (<option key={p} value={permissionLabels[p] || p}>{permissionLabels[p] || p}</option>))}
                </select>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer">
                  <option value="all">All Time</option><option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Time</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Service</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Reference</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan={4} className="py-12 text-center">
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2">
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        </motion.div>
                        <span className="text-xs text-slate-400 font-medium">No activity yet. Start using your services!</span>
                      </motion.div>
                    </td></tr>
                  ) : (
                    filteredHistory.slice(0, 10).map((item, index) => (
                      <motion.tr key={`${item.date}-${item.time}-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: index * 0.03 }} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-5"><p className="text-xs font-medium text-slate-700">{item.time}</p><p className="text-[10px] text-slate-400">{item.display_date || item.date}</p></td>
                        <td className="py-3 px-5"><span className={`inline-flex px-2.5 py-1 text-[10px] font-medium rounded-full ${getTypeBadge(item.type)}`}>{item.type}</span></td>
                        <td className="py-3 px-5 text-xs text-slate-500 font-medium">{item.ref || (item.file_count ? `${item.file_count} Files` : '—')}</td>
                        <td className="py-3 px-5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            item.status === 'failed' 
                              ? 'bg-red-50 text-red-600 ring-1 ring-red-200' 
                              : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                          }`}>
                            {item.status === 'failed' ? (
                              <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Failed</>
                            ) : (
                              <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Success</>
                            )}
                          </span>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {filteredHistory.length > 10 && (<div className="p-3 text-center border-t border-slate-50 bg-slate-50/30"><p className="text-[10px] text-slate-400">Showing 10 of {filteredHistory.length} records</p></div>)}
        </div>
      </motion.div>
    </motion.div>
  );
}
