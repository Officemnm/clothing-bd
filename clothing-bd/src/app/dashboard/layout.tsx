'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  HomeIcon,
  DocumentTextIcon,
  CubeIcon,
  ChartBarIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  BellIcon,
  ScissorsIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  WrenchScrewdriverIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CubeIcon as CubeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UsersIcon as UsersIconSolid,
  ScissorsIcon as ScissorsIconSolid,
  ClockIcon as ClockIconSolid,
  DocumentDuplicateIcon as DocumentDuplicateIconSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
  PresentationChartLineIcon as PresentationChartLineIconSolid,
} from '@heroicons/react/24/solid';
import { useActivityTimeout } from '@/hooks/useActivityTimeout';
import { useERPCookieRefresh } from '@/hooks/useERPCookieRefresh';
import Logo from '@/components/Logo';

// Navigation items with better matching icons
const navItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Squares2X2Icon,
    iconSolid: HomeIconSolid,
    permission: null,
    gradient: 'from-teal-500 to-emerald-500'
  },
  { 
    name: 'PO Sheet', 
    href: '/dashboard/po-generator', 
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    permission: 'po_sheet',
    gradient: 'from-blue-500 to-cyan-500'
  },
  { 
    name: 'Accessories', 
    href: '/dashboard/accessories', 
    icon: WrenchScrewdriverIcon,
    iconSolid: WrenchScrewdriverIconSolid,
    permission: 'accessories',
    gradient: 'from-amber-500 to-orange-500'
  },
  { 
    name: 'Closing Report', 
    href: '/dashboard/closing-report', 
    icon: PresentationChartLineIcon,
    iconSolid: PresentationChartLineIconSolid,
    permission: 'closing',
    gradient: 'from-emerald-500 to-teal-500'
  },
  { 
    name: 'Sewing Closing', 
    href: '/dashboard/sewing-closing-report', 
    icon: ScissorsIcon,
    iconSolid: ScissorsIconSolid,
    permission: 'sewing_closing_report',
    gradient: 'from-rose-500 to-pink-500'
  },
  { 
    name: 'Hourly Report', 
    href: '/dashboard/daily-line-wise-input-report', 
    icon: ClockIcon,
    iconSolid: ClockIconSolid,
    permission: 'daily_line_wise_input_report',
    gradient: 'from-sky-500 to-blue-500'
  },
  { 
    name: 'Challan Report', 
    href: '/dashboard/challan-wise-input-report', 
    icon: DocumentDuplicateIcon,
    iconSolid: DocumentDuplicateIconSolid,
    permission: 'challan_wise_input_report',
    gradient: 'from-violet-500 to-purple-500'
  },
  { 
    name: 'Users', 
    href: '/dashboard/users', 
    icon: UsersIcon,
    iconSolid: UsersIconSolid,
    adminOnly: true, 
    permission: null,
    gradient: 'from-purple-500 to-indigo-500'
  },
];

// Animation variants
const sidebarVariants = {
  expanded: { width: 260, x: 0 },
  collapsed: { width: 0, x: -260 }
};

const navItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  hover: { scale: 1.02, x: 4 },
  tap: { scale: 0.98 }
};

const tooltipVariants = {
  hidden: { opacity: 0, x: -10, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1 }
};

const floatAnimation = {
  y: [0, -4, 0],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const }
};

interface UserData {
  username: string;
  role: string;
  phone: string;
  address: string;
  photo: string;
  email: string;
  designation: string;
  permissions: string[];
  last_login: string;
  created_at: string;
  firstName: string;
  lastName: string;
}

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  action?: string;
  actionBy: string;
  actionByRole: string;
  createdAt: string;
  read: boolean;
  bookingRef?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionKey, setSessionKey] = useState<string>(''); // Track current session
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    email: '',
    designation: '',
    photo: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [cropData, setCropData] = useState({ x: 0, y: 0, scale: 1 });
  const lastActivityRef = useRef(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // handleLogout must be defined before useActivityTimeout hook
  const handleLogout = useCallback(async () => {
    try { 
      // Clear client-side session cookie
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Clear session storage
      sessionStorage.clear();
      
      // Reset state
      setUser(null);
      setUserData(null);
      setSessionKey('');
      
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); 
    } 
    finally { 
      // Full page redirect to login
      window.location.href = '/login';
    }
  }, []);

  // Use the improved activity timeout hook with server sync
  const { resetTimeout } = useActivityTimeout({
    timeoutMs: 10 * 60 * 1000, // 10 minutes
    onTimeout: handleLogout,
    enabled: !loading && !!user,
    syncWithServer: true,
  });

  // Background ERP cookie refresh (every 4 minutes)
  useERPCookieRefresh({
    enabled: !loading && !!user,
    onRefreshSuccess: () => {
      console.log('[Dashboard] ERP cookie refreshed successfully');
    },
    onRefreshError: (error) => {
      console.warn('[Dashboard] ERP cookie refresh failed:', error.message);
    },
  });

  // Fetch notifications for admin
  const fetchNotifications = useCallback(async () => {
    if (userData?.role !== 'admin') return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch notifications:', err);
    }
  }, [userData?.role]);

  // Poll notifications every 30 seconds for admin
  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userData?.role, fetchNotifications]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[Dashboard] Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[Dashboard] Failed to mark all as read:', err);
    }
  };

  // Ref to track if fetch is in progress
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Skip if already fetching
    if (fetchingRef.current) {
      console.log('[Dashboard] Skipping duplicate fetch');
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const checkSession = async () => {
      fetchingRef.current = true;
      
      try {
        // Check if this is a fresh login
        const isNewLogin = sessionStorage.getItem('newLogin') === 'true';
        const loginUser = sessionStorage.getItem('loginUser');
        
        if (isNewLogin) {
          console.log('[Dashboard] New login detected for:', loginUser);
          // Clear the flag
          sessionStorage.removeItem('newLogin');
          sessionStorage.removeItem('loginUser');
          
          // Reset all user state for fresh start
          setUser(null);
          setUserData(null);
          setSessionKey('');
          setProfileForm({
            firstName: '',
            lastName: '',
            phone: '',
            address: '',
            email: '',
            designation: '',
            photo: '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
        }
        
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        
        console.log('[Dashboard] Fetching session at:', timestamp);
        
        const res = await fetch(`/api/auth/session?t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          signal: abortController.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        
        // Check if aborted
        if (abortController.signal.aborted) return;
        
        if (res.ok) {
          const data = await res.json();
          console.log('[Dashboard] Session response:', data);
          
          if (data.user) {
            const newUsername = data.user.username || data.user.name;
            
            // If username changed, reset all state (different user logged in)
            if (sessionKey && sessionKey !== newUsername) {
              console.log('[Dashboard] User changed from', sessionKey, 'to', newUsername, '- resetting state');
              setUser(null);
              setUserData(null);
              setProfileForm({
                firstName: '',
                lastName: '',
                phone: '',
                address: '',
                email: '',
                designation: '',
                photo: '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
            }
            
            // Update session key
            setSessionKey(newUsername);
            setUser(data.user);
            
            // Check if aborted before next request
            if (abortController.signal.aborted) return;
            
            const userRes = await fetch(`/api/user?t=${timestamp}`, {
              method: 'GET',
              cache: 'no-store',
              credentials: 'include',
              signal: abortController.signal,
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
              },
            });
            
            // Check if aborted
            if (abortController.signal.aborted) return;
            
            if (userRes.ok) {
              const userData = await userRes.json();
              console.log('[Dashboard] User data response:', userData.user?.username);
              setUserData(userData.user);
              setProfileForm(prev => ({
                ...prev,
                firstName: userData.user.firstName || '',
                lastName: userData.user.lastName || '',
                phone: userData.user.phone || '',
                email: userData.user.email || '',
                designation: userData.user.designation || '',
                photo: userData.user.photo || '',
              }));
            }
          } else {
            router.push('/login');
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[Dashboard] Request aborted');
          return;
        }
        console.error('[Dashboard] Session error:', err);
        router.push('/login');
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    };
    
    // Reset loading state for fresh check
    setLoading(true);
    checkSession();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [router, handleLogout]);

  useEffect(() => { 
    setMobileOpen(false);
  }, [pathname]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Photo must be less than 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImage(reader.result as string);
      setCropMode(true);
      setCropData({ x: 0, y: 0, scale: 1 });
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    if (!tempImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = document.createElement('img');
    img.onload = () => {
      const size = 200;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);
      
      // Create circular clip
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Calculate dimensions
      const scale = cropData.scale;
      const imgSize = Math.min(img.width, img.height);
      const srcSize = imgSize / scale;
      const offsetX = (img.width - imgSize) / 2 - (cropData.x * srcSize / size);
      const offsetY = (img.height - imgSize) / 2 - (cropData.y * srcSize / size);

      ctx.drawImage(
        img,
        offsetX + (imgSize - srcSize) / 2,
        offsetY + (imgSize - srcSize) / 2,
        srcSize,
        srcSize,
        0,
        0,
        size,
        size
      );

      const croppedImage = canvas.toDataURL('image/jpeg', 0.85);
      setProfileForm(prev => ({ ...prev, photo: croppedImage }));
      setCropMode(false);
      setTempImage(null);
    };
    img.src = tempImage;
  };

  const handleSaveProfile = async () => {
    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (profileForm.newPassword && !profileForm.currentPassword) {
      setMessage({ type: 'error', text: 'Enter current password' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone,
          email: profileForm.email,
          designation: profileForm.designation,
          photo: profileForm.photo,
          currentPassword: profileForm.currentPassword || undefined,
          newPassword: profileForm.newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setUserData(prev => prev ? {
          ...prev,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone,
          email: profileForm.email,
          designation: profileForm.designation,
          photo: profileForm.photo,
        } : null);
        setProfileForm(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        setEditMode(false);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <Logo size="xl" animate={true} />
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Loading Dashboard</p>
            <p className="text-xs text-slate-400 mt-1">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const userPermissions = userData?.permissions || [];
  
  // Filter nav items based on role and permissions
  const filteredNav = navItems.filter(item => {
    // Admin-only items
    if (item.adminOnly && !isAdmin) return false;
    // If no permission required or user is admin, show it
    if (!item.permission || isAdmin) return true;
    // Check if user has the required permission
    return userPermissions.includes(item.permission);
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Crop Modal */}
      <AnimatePresence>
        {cropMode && tempImage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[200] backdrop-blur-sm"
              onClick={() => { setCropMode(false); setTempImage(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[201] p-6 w-full max-w-sm"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Crop Photo</h3>
              
              <div className="relative w-56 h-56 mx-auto mb-4 rounded-full overflow-hidden border-4 border-slate-200 bg-slate-100">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${tempImage})`,
                    backgroundSize: `${100 * cropData.scale}%`,
                    backgroundPosition: `${50 + cropData.x}% ${50 + cropData.y}%`,
                  }}
                />
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Zoom</label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={cropData.scale}
                    onChange={(e) => setCropData(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Position X</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={cropData.x}
                      onChange={(e) => setCropData(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Position Y</label>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={cropData.y}
                      onChange={(e) => setCropData(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setCropMode(false); setTempImage(null); }}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCrop}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setProfileOpen(false); setEditMode(false); setMessage(null); }}
              className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-md bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => { setProfileOpen(false); setEditMode(false); setMessage(null); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors z-10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Message */}
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                        message.type === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {message.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile Picture & Name */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200">
                      {profileForm.photo || userData?.photo ? (
                        <Image
                          src={profileForm.photo || userData?.photo || ''}
                          alt="Profile"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <span className="text-xl font-semibold text-slate-400">
                            {(userData?.firstName?.charAt(0) || userData?.username?.charAt(0) || 'U').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    {editMode && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {userData?.firstName && userData?.lastName 
                        ? `${userData.firstName} ${userData.lastName}` 
                        : userData?.firstName || userData?.lastName || userData?.username}
                    </h3>
                    <p className="text-sm text-slate-500">@{userData?.username}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                      userData?.role === 'admin' 
                        ? 'bg-slate-800 text-white' 
                        : userData?.role === 'moderator'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {userData?.role === 'admin' ? 'Admin' : userData?.role === 'moderator' ? 'Moderator' : 'User'}
                    </span>
                  </div>
                </div>

                {editMode ? (
                  /* Edit Form - Minimalistic */
                  <div className="space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">First Name</label>
                        <input
                          type="text"
                          value={profileForm.firstName}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={profileForm.lastName}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors"
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors"
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors"
                        placeholder="email@example.com"
                      />
                    </div>

                    {/* Password Change */}
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-3">Change Password</p>
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={profileForm.currentPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors"
                          placeholder="Current password"
                        />
                        <input
                          type="password"
                          value={profileForm.newPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors"
                          placeholder="New password"
                        />
                        <input
                          type="password"
                          value={profileForm.confirmPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none transition-colors"
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => { setEditMode(false); setMessage(null); }}
                        className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode - Minimalistic */
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-0.5">Phone</p>
                      <p className="text-sm font-medium text-slate-700">{userData?.phone || '—'}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-0.5">Email</p>
                      <p className="text-sm font-medium text-slate-700">{userData?.email || '—'}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <p className="text-xs text-slate-400 mb-0.5">Designation</p>
                      <p className="text-sm font-medium text-slate-700">{userData?.designation || '—'}</p>
                    </div>

                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full mt-3 py-2.5 text-sm font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Header - Minimal */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-50 z-40 safe-area-inset">
        <div className="h-full flex items-center justify-between px-4 max-w-screen-xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-[18px] h-[18px] text-slate-600" />
          </motion.button>
          <div className="flex items-center gap-2">
            <motion.div animate={floatAnimation}>
              <Logo size="sm" animate={false} />
            </motion.div>
            <span className="font-bold text-slate-800 text-[13px]">Clothing BD</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setProfileOpen(true)}
            className="w-9 h-9 rounded-lg overflow-hidden ring-2 ring-slate-100"
            aria-label="Open profile"
          >
            {userData?.photo ? (
              <Image
                src={userData.photo}
                alt="Profile"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-xs font-semibold">
                {(userData?.firstName?.charAt(0) || userData?.username?.charAt(0) || 'U').toUpperCase()}
              </div>
            )}
          </motion.button>
        </div>
      </header>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar - Minimal */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="lg:hidden fixed top-0 left-0 h-full w-[280px] max-w-[80vw] bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Mobile Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <motion.div animate={floatAnimation}>
                  <Logo size="sm" animate={false} />
                </motion.div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-sm tracking-tight">Clothing BD</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">System</span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-md bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-slate-500" />
              </motion.button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 py-3 px-3 overflow-y-auto">
              <div className="space-y-0.5">
                {filteredNav.map((item, index) => {
                  const active = isActive(item.href);
                  const IconComponent = active ? item.iconSolid : item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.025 }}
                    >
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                          active 
                            ? 'bg-slate-900 text-white' 
                            : 'text-slate-500 hover:bg-slate-50 active:bg-slate-100'
                        }`}
                      >
                        <IconComponent className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-white' : ''}`} />
                        <span className="text-[13px] font-medium">{item.name}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            {/* Mobile Footer */}
            <div className="border-t border-slate-50 p-3 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 font-medium text-[13px]"
              >
                <ArrowRightOnRectangleIcon className="w-[18px] h-[18px]" />
                <span>Logout</span>
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Slide-in Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="hidden lg:flex fixed top-0 left-0 h-full w-[260px] bg-white z-50 flex-col border-r border-slate-100 shadow-2xl shadow-slate-200/50"
          >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-4 border-b border-slate-50">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <motion.div animate={floatAnimation}>
              <Logo size="sm" animate={false} />
            </motion.div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-800 text-sm tracking-tight truncate">Clothing BD</span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider">System</span>
            </div>
          </div>
          {/* Close button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-400" />
          </motion.button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto overflow-x-hidden">
          <motion.p 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3 mb-2 text-[9px] font-semibold text-slate-400 uppercase tracking-widest"
          >
            Menu
          </motion.p>
          <div className="space-y-0.5">
            {filteredNav.map((item, index) => {
              const active = isActive(item.href);
              const IconComponent = active ? item.iconSolid : item.icon;
              
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                      active 
                        ? 'bg-slate-900 text-white' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-white' : ''}`} />
                    <span className="text-[13px] font-medium">{item.name}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-slate-50 p-2.5">
          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
          >
            <ArrowRightOnRectangleIcon className="w-[18px] h-[18px]" />
            <span className="text-[13px] font-medium">Logout</span>
          </motion.button>
        </div>
      </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Top Bar - Minimal */}
      <motion.header
        initial={false}
        animate={{ marginLeft: 0 }}
        className="hidden lg:flex fixed top-0 right-0 left-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-50 z-30 items-center justify-between px-6"
      >
        <div className="flex items-center gap-3">
          {/* Modern Sidebar Toggle */}
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: '#f1f5f9' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="relative w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center transition-all group"
          >
            <div className="flex flex-col gap-[5px] items-center justify-center">
              <motion.span
                animate={sidebarOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-5 h-[2px] bg-slate-600 rounded-full block"
              />
              <motion.span
                animate={sidebarOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="w-5 h-[2px] bg-slate-500 rounded-full block"
              />
              <motion.span
                animate={sidebarOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-5 h-[2px] bg-slate-400 rounded-full block"
              />
            </div>
          </motion.button>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-slate-700 font-medium">Dashboard</span>
            {pathname !== '/dashboard' && (
              <>
                <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-500 capitalize">
                  {pathname.split('/').pop()?.replace(/-/g, ' ')}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Compact Search */}
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              className="w-44 pl-9 pr-3 py-2 text-[13px] bg-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 transition-all border-0"
            />
          </div>

          {/* Notification - Admin Only */}
          {userData?.role === 'admin' && (
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <BellIcon className="w-[18px] h-[18px] text-slate-500" />
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center" 
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {notificationOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center">
                            <BellIcon className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                            <p className="text-sm text-slate-400">No notifications</p>
                          </div>
                        ) : (
                          notifications.slice(0, 10).map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => !notif.read && markAsRead(notif.id)}
                              className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors ${
                                notif.read ? 'bg-white' : 'bg-amber-50/50'
                              } hover:bg-slate-50`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                                  notif.type === 'warning' ? 'bg-amber-500' :
                                  notif.type === 'error' ? 'bg-red-500' :
                                  notif.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-700">{notif.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(notif.createdAt).toLocaleString('en-BD', { 
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                                      })}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                      {notif.actionBy}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-slate-100" />

          {/* Profile Button - Minimal */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-medium text-slate-700">
                {userData?.firstName && userData?.lastName 
                  ? `${userData.firstName} ${userData.lastName}` 
                  : userData?.firstName || userData?.lastName || userData?.username}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{userData?.designation || userData?.role}</p>
            </div>
            <div className="w-9 h-9 rounded-lg overflow-hidden ring-2 ring-slate-100">
              {userData?.photo ? (
                <Image
                  src={userData.photo}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-xs font-semibold">
                  {(userData?.firstName?.charAt(0) || userData?.username?.charAt(0) || 'U').toUpperCase()}
                </div>
              )}
            </div>
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <motion.main
        initial={false}
        animate={{ marginLeft: 0 }}
        className="hidden lg:flex min-h-screen bg-slate-50/50 flex-col"
      >
        {/* Overlay to close sidebar when clicking outside */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/10 z-35 cursor-pointer"
            />
          )}
        </AnimatePresence>
        
        <div className="flex-1 pt-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 lg:p-6 max-w-[1536px] mx-auto"
          >
            {children}
          </motion.div>
        </div>
        
        {/* Footer - Minimal */}
        <footer className="border-t border-slate-100 bg-white py-3 px-6">
          <div className="flex items-center justify-between max-w-[1536px] mx-auto">
            <p className="text-xs text-slate-400">
              © 2026 <span className="font-medium text-slate-600">Clothing BD</span>
            </p>
            <p className="text-xs text-slate-400">
              by <span className="font-semibold text-slate-600">MEHEDI HASAN</span>
            </p>
          </div>
        </footer>
      </motion.main>

      {/* Mobile Main Content Area */}
      <main className="lg:hidden min-h-screen bg-slate-50/50 flex flex-col">
        <div className="flex-1 pt-16">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4"
          >
            {children}
          </motion.div>
        </div>
        
        {/* Footer - Mobile */}
        <footer className="border-t border-slate-100 bg-white py-3 px-4">
          <div className="text-center">
            <p className="text-[10px] text-slate-400">
              © 2026 Clothing BD • by <span className="font-semibold text-slate-600">MEHEDI HASAN</span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
