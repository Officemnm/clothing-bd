'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'PO Sheet', href: '/dashboard/po-generator', icon: '📋' },
  { name: 'Accessories', href: '/dashboard/accessories', icon: '📦' },
  { name: 'Closing Report', href: '/dashboard/closing-report', icon: '📈' },
  { name: 'User Management', href: '/dashboard/users', icon: '👥', adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Activity timeout - 10 minutes
  useEffect(() => {
    const TIMEOUT = 10 * 60 * 1000;
    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    const checkActivity = () => {
      if (Date.now() - lastActivityRef.current > TIMEOUT) handleLogout();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    const interval = setInterval(checkActivity, 60000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } 
    finally { router.push('/login'); }
  };

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    if (expanded) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  // Close on route change
  useEffect(() => { setExpanded(false); }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-400 border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full bg-white border-r border-stone-200 z-50 flex flex-col transition-all duration-200 ${
          expanded ? 'w-52' : 'w-16'
        }`}
      >
        {/* Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-14 flex items-center justify-center border-b border-stone-100 hover:bg-stone-50 transition-colors"
        >
          <span className="text-xl">{expanded ? '✕' : '☰'}</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 mx-2 my-1 px-3 h-10 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-stone-800 text-white' 
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
                title={!expanded ? item.name : undefined}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {expanded && <span className="text-sm font-medium truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-stone-100 p-2">
          <div className={`flex items-center gap-2 p-2 ${expanded ? '' : 'justify-center'}`}>
            <div className="w-8 h-8 bg-stone-700 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800 truncate">{user?.name}</p>
                <p className="text-xs text-stone-500 capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
              expanded ? '' : 'justify-center'
            }`}
            title="Logout"
          >
            <span>🚪</span>
            {expanded && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-200 ${expanded ? 'ml-52' : 'ml-16'}`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
