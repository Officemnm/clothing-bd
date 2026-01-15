'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
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

const COLORS = ['#78716c', '#a8a29e', '#d6d3d1', '#e7e5e4', '#f5f5f4'];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchStats();
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
      case 'Closing Report': return 'bg-stone-700 text-white';
      case 'PO Sheet': return 'bg-stone-500 text-white';
      case 'Accessories': return 'bg-stone-300 text-stone-800';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { id: 'closing', label: 'Closing Reports', value: stats?.closing.count || 0, icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'po', label: 'PO Sheets', value: stats?.po.count || 0, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'accessories', label: 'Accessories', value: stats?.accessories.count || 0, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'users', label: 'Active Users', value: stats?.users.count || 0, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Dashboard</h1>
          <p className="text-sm text-stone-500">Real-time overview</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-800 rounded-lg hover:bg-stone-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.id} className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md hover:border-stone-300 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-bold text-stone-800 mt-1">{card.value}</p>
              </div>
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={card.icon} /></svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/closing-report" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all group">
          <div className="w-11 h-11 bg-stone-800 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div><p className="font-medium text-stone-800">Closing Report</p><p className="text-sm text-stone-400">Generate from ERP</p></div>
        </Link>
        <Link href="/dashboard/accessories" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all group">
          <div className="w-11 h-11 bg-stone-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <div><p className="font-medium text-stone-800">Accessories</p><p className="text-sm text-stone-400">Challan tracking</p></div>
        </Link>
        <Link href="/dashboard/po-generator" className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all group">
          <div className="w-11 h-11 bg-stone-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div><p className="font-medium text-stone-800">PO Generator</p><p className="text-sm text-stone-400">Process PDF files</p></div>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">Service Reports (Last 7 Days)</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="Closing" fill="#44403c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PO" fill="#78716c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Accessories" fill="#a8a29e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-5 mt-3">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-stone-700" /><span className="text-xs text-stone-500">Closing</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-stone-500" /><span className="text-xs text-stone-500">PO</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-stone-400" /><span className="text-xs text-stone-500">Accessories</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-4">User Activity</h2>
          <div className="h-52">
            {userPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={userPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} labelLine={false}>
                    {userPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={30} formatter={(value) => <span className="text-xs text-stone-500">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 text-sm">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-stone-700">Recent Activity</h2>
            <div className="flex flex-wrap gap-2">
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 w-36 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-400" />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none cursor-pointer text-stone-600">
                <option value="all">All Types</option>
                <option value="Closing Report">Closing Report</option>
                <option value="PO Sheet">PO Sheet</option>
                <option value="Accessories">Accessories</option>
              </select>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none cursor-pointer text-stone-600">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50">
                <th className="text-left text-xs font-medium text-stone-500 uppercase py-2.5 px-4">Date & Time</th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase py-2.5 px-4">User</th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase py-2.5 px-4">Type</th>
                <th className="text-left text-xs font-medium text-stone-500 uppercase py-2.5 px-4">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredHistory.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-sm text-stone-400">No records found</td></tr>
              ) : (
                filteredHistory.slice(0, 20).map((item, index) => (
                  <tr key={index} className="hover:bg-stone-50">
                    <td className="py-2.5 px-4"><p className="text-sm font-medium text-stone-700">{item.time}</p><p className="text-xs text-stone-400">{item.display_date || item.date}</p></td>
                    <td className="py-2.5 px-4 text-sm text-stone-600">{item.user}</td>
                    <td className="py-2.5 px-4"><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getTypeBadge(item.type)}`}>{item.type}</span></td>
                    <td className="py-2.5 px-4 text-sm text-stone-500">{item.ref || (item.file_count ? `${item.file_count} Files` : '-')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredHistory.length > 20 && (
          <div className="p-3 text-center border-t border-stone-100"><p className="text-xs text-stone-400">Showing 20 of {filteredHistory.length} records</p></div>
        )}
      </div>
    </div>
  );
}
