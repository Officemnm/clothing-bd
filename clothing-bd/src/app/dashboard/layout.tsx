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
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  BellIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CubeIcon as CubeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UsersIcon as UsersIconSolid,
  DocumentChartBarIcon as DocumentChartBarIconSolid,
  TableCellsIcon as TableCellsIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
} from '@heroicons/react/24/solid';
import { useActivityTimeout } from '@/hooks/useActivityTimeout';
import { useERPCookieRefresh } from '@/hooks/useERPCookieRefresh';
import Logo from '@/components/Logo';

// Navigation items with Heroicons
const navItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: HomeIcon,
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
    icon: CubeIcon,
    iconSolid: CubeIconSolid,
    permission: 'accessories',
    gradient: 'from-amber-500 to-orange-500'
  },
  { 
    name: 'Closing Report', 
    href: '/dashboard/closing-report', 
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    permission: 'closing',
    gradient: 'from-emerald-500 to-teal-500'
  },
  { 
    name: 'Sewing Closing Report', 
    href: '/dashboard/sewing-closing-report', 
    icon: DocumentChartBarIcon,
    iconSolid: DocumentChartBarIconSolid,
    permission: 'sewing_closing_report',
    gradient: 'from-rose-500 to-pink-500'
  },
  { 
    name: 'Daily Line Wise Input Report', 
    href: '/dashboard/daily-line-wise-input-report', 
    icon: TableCellsIcon,
    iconSolid: TableCellsIconSolid,
    permission: 'daily_line_wise_input_report',
    gradient: 'from-sky-500 to-blue-500'
  },
  { 
    name: 'Challan Wise Input Report', 
    href: '/dashboard/challan-wise-input-report', 
    icon: ClipboardDocumentListIcon,
    iconSolid: ClipboardDocumentListIconSolid,
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
  expanded: { width: 280 },
  collapsed: { width: 80 }
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
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-slate-200 border-t-teal-500 rounded-full"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </motion.div>
          </div>
          <div className="text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-semibold text-slate-700"
            >
              Loading Dashboard
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-xs text-slate-400 mt-1"
            >
              Please wait...
            </motion.p>
          </div>
        </motion.div>
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-md bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => { setProfileOpen(false); setEditMode(false); setMessage(null); }}
                className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-500 transition-colors z-10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header Background */}
              <div className="h-20 bg-gradient-to-br from-teal-500 to-emerald-500 relative" />

              {/* Content */}
              <div className="px-6 pb-6 -mt-10">
                {/* Message */}
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                        message.type === 'success' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {message.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile Picture */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 ring-4 ring-white shadow-lg">
                      {profileForm.photo || userData?.photo ? (
                        <Image
                          src={profileForm.photo || userData?.photo || ''}
                          alt="Profile"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                          <svg className="w-12 h-12 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    {editMode && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-teal-500 shadow-lg flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  
                  {/* Name and Role */}
                  <h3 className="text-lg font-bold text-slate-800">{userData?.username}</h3>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                    userData?.role === 'admin' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {userData?.role === 'admin' && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    {userData?.role === 'admin' ? 'Administrator' : 'User'}
                  </span>
                </div>

                {editMode ? (
                  /* Edit Form - Simplified */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Mobile Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-400 focus:shadow-[0_0_0_2px_rgba(20,184,166,0.1)] focus:outline-none transition-all"
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Address</label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-400 focus:shadow-[0_0_0_2px_rgba(20,184,166,0.1)] focus:outline-none transition-all"
                        placeholder="Your address"
                      />
                    </div>

                    {/* Password Change */}
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <p className="text-sm font-medium text-slate-600 mb-3">Change Password</p>
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={profileForm.currentPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-400 focus:shadow-[0_0_0_2px_rgba(20,184,166,0.1)] focus:outline-none transition-all"
                          placeholder="Current password"
                        />
                        <input
                          type="password"
                          value={profileForm.newPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-400 focus:shadow-[0_0_0_2px_rgba(20,184,166,0.1)] focus:outline-none transition-all"
                          placeholder="New password"
                        />
                        <input
                          type="password"
                          value={profileForm.confirmPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-400 focus:shadow-[0_0_0_2px_rgba(20,184,166,0.1)] focus:outline-none transition-all"
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={() => { setEditMode(false); setMessage(null); }}
                        className="flex-1 py-3 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 py-3 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-all disabled:opacity-50 shadow-md shadow-teal-500/20"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode - Simplified */
                  <div className="space-y-3">
                    {/* Mobile */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                      <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Mobile</p>
                        <p className="text-sm font-medium text-slate-700">{userData?.phone || '—'}</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                      <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Address</p>
                        <p className="text-sm font-medium text-slate-700">{userData?.address || '—'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full mt-4 py-3 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-all shadow-md shadow-teal-500/20"
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

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-[64px] bg-white/95 backdrop-blur-xl border-b border-slate-100 z-40 safe-area-inset">
        <div className="h-full flex items-center justify-between px-4 max-w-screen-xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-5 h-5 text-slate-600" />
          </motion.button>
          <div className="flex items-center gap-2">
            <Logo size="sm" animate={false} />
            <span className="font-bold text-slate-800 text-sm">Clothing BD</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setProfileOpen(true)}
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-slate-100"
            aria-label="Open profile"
          >
            {userData?.photo ? (
              <Image
                src={userData.photo}
                alt="Profile"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
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
            className="lg:hidden fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar - Clean Modern Design */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="lg:hidden fixed top-0 left-0 h-full w-[300px] max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Mobile Header */}
            <div className="h-[68px] flex items-center justify-between px-5 border-b border-slate-100/80 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Logo size="sm" animate={false} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-[15px] leading-tight">Clothing BD</span>
                  <span className="text-[10px] text-slate-400 font-medium">Management System</span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 py-5 px-4 overflow-y-auto">
              <div className="space-y-1">
                {filteredNav.map((item, index) => {
                  const active = isActive(item.href);
                  const IconComponent = active ? item.iconSolid : item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                          active 
                            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25' 
                            : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            {/* Mobile Footer */}
            <div className="border-t border-slate-100 p-4 flex-shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-50 transition-all duration-200 font-medium text-sm"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Clean Modern Design */}
      <motion.aside
        initial={false}
        animate={sidebarOpen ? 'expanded' : 'collapsed'}
        variants={sidebarVariants}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex fixed top-0 left-0 h-full bg-white z-40 flex-col border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        {/* Logo Section */}
        <div className="h-[68px] flex items-center px-4 border-b border-slate-100">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <Logo size="sm" animate={false} />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-800 text-sm leading-tight truncate">Clothing BD</span>
                  <span className="text-[10px] text-slate-400">Management System</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex justify-center"
              >
                <Logo size="sm" animate={false} />
              </motion.div>
            )}
          </AnimatePresence>
          {sidebarOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ml-2"
            >
              <ChevronLeftIcon className="w-4 h-4 text-slate-400" />
            </motion.button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto overflow-x-hidden">
          {sidebarOpen && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 mb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
            >
              Menu
            </motion.p>
          )}
          <div className="space-y-1">
            {filteredNav.map((item, index) => {
              const active = isActive(item.href);
              const IconComponent = active ? item.iconSolid : item.icon;
              
              return (
                <div key={item.href} className="relative group">
                  <Link href={item.href}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      whileHover={{ x: sidebarOpen ? 2 : 0 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all duration-200 ${
                        active 
                          ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                      {sidebarOpen && (
                        <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                          {item.name}
                        </span>
                      )}
                    </motion.div>
                  </Link>

                  {/* Tooltip for collapsed state */}
                  {!sidebarOpen && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                      {item.name}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section - Collapse Toggle & Logout */}
        <div className="border-t border-slate-100 p-3">
          {/* Expand/Collapse Button - Only when collapsed */}
          {!sidebarOpen && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.05, backgroundColor: '#f1f5f9' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarOpen(true)}
              className="w-full flex justify-center py-2.5 rounded-xl text-slate-500 transition-all duration-200 mb-2"
            >
              <ChevronLeftIcon className="w-5 h-5 rotate-180" />
            </motion.button>
          )}
          
          {/* Logout Button */}
          <div className="relative group">
            <motion.button
              whileHover={{ scale: sidebarOpen ? 1.01 : 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center'} py-3 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all duration-200`}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
            </motion.button>
            
            {/* Tooltip for collapsed state */}
            {!sidebarOpen && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                Logout
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 rotate-45" />
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Desktop Top Bar */}
      <motion.header
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 280 : 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex fixed top-0 right-0 left-0 h-[68px] bg-white/95 backdrop-blur-xl border-b border-slate-100 z-30 items-center justify-between px-8"
      >
        <div className="flex items-center gap-6">
          {/* Page title */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Dashboard</span>
            {pathname !== '/dashboard' && (
              <>
                <ChevronLeftIcon className="w-3 h-3 text-slate-300 rotate-180" />
                <span className="text-slate-700 font-medium capitalize">
                  {pathname.split('/').pop()?.replace(/-/g, ' ')}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors">
              <MagnifyingGlassIcon className="w-[18px] h-[18px] text-slate-400 group-focus-within:text-teal-500" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="w-56 pl-11 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl focus:outline-none focus:bg-white focus:shadow-[0_0_0_2px_rgba(20,184,166,0.15)] placeholder:text-slate-400 transition-all duration-200 border-0"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-white/80 rounded border border-slate-200/50">
              ⌘K
            </kbd>
          </div>

          {/* Notification Button */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <BellIcon className="w-5 h-5 text-slate-500" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </motion.button>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-200" />

          {/* Profile Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-all"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{userData?.username}</p>
              <p className="text-[11px] text-slate-400 capitalize">{userData?.designation || userData?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-slate-100">
              {userData?.photo ? (
                <Image
                  src={userData.photo}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 280 : 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex min-h-screen bg-slate-50 flex-col"
      >
        <div className="flex-1 pt-[68px]">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>
        
        {/* Footer Credit - Desktop */}
        <footer className="border-t border-slate-100 bg-white py-4 px-6">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <p className="text-sm text-slate-500">
              © 2026 <span className="font-medium text-slate-700">Clothing BD</span>
            </p>
            <p className="text-sm text-slate-500">
              Developed by <span className="font-semibold text-teal-600">MEHEDI HASAN</span>
            </p>
          </div>
        </footer>
      </motion.main>

      {/* Mobile Main Content Area */}
      <main className="lg:hidden min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 pt-[64px]">
          <div className="p-4 sm:p-5">
            {children}
          </div>
        </div>
        
        {/* Footer Credit - Mobile */}
        <footer className="border-t border-slate-100 bg-white py-4 px-4">
          <div className="text-center space-y-1">
            <p className="text-xs text-slate-500">
              © 2026 <span className="font-medium text-slate-700">Clothing BD</span>
            </p>
            <p className="text-xs text-slate-400">
              by <span className="font-semibold text-teal-600">MEHEDI HASAN</span>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
