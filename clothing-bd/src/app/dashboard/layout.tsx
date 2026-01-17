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
  CameraIcon,
  PhoneIcon,
  MapPinIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CubeIcon as CubeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UsersIcon as UsersIconSolid,
} from '@heroicons/react/24/solid';
import { useActivityTimeout } from '@/hooks/useActivityTimeout';
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-slate-200 border-t-teal-500 rounded-full"
          />
          <span className="text-sm text-slate-500 font-medium">Loading...</span>
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
              className="fixed inset-0 bg-black/50 z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => { setProfileOpen(false); setEditMode(false); setMessage(null); }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors z-10"
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
                          ? 'bg-green-50 text-green-600 border border-green-200' 
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                    >
                      {message.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile Picture */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-3">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 ring-4 ring-slate-50">
                      {profileForm.photo || userData?.photo ? (
                        <Image
                          src={profileForm.photo || userData?.photo || ''}
                          alt="Profile"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        /* Professional human silhouette icon */
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                          <svg className="w-16 h-16 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    {editMode && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-500 shadow-lg flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
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
                  <h3 className="text-xl font-bold text-slate-800">{userData?.username}</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                    userData?.role === 'admin' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {userData?.role === 'admin' ? 'Administrator' : 'User'}
                  </span>
                </div>

                {editMode ? (
                  /* Edit Form - Simplified */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-slate-200 bg-white focus:border-teal-500 focus:ring-0 transition-colors"
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-slate-200 bg-white focus:border-teal-500 focus:ring-0 transition-colors"
                        placeholder="Your address"
                      />
                    </div>

                    {/* Password Change */}
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <p className="text-sm font-medium text-slate-700 mb-3">Change Password</p>
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={profileForm.currentPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-slate-200 bg-white focus:border-teal-500 focus:ring-0 transition-colors"
                          placeholder="Current password"
                        />
                        <input
                          type="password"
                          value={profileForm.newPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-slate-200 bg-white focus:border-teal-500 focus:ring-0 transition-colors"
                          placeholder="New password"
                        />
                        <input
                          type="password"
                          value={profileForm.confirmPassword}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm rounded-lg border-2 border-slate-200 bg-white focus:border-teal-500 focus:ring-0 transition-colors"
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3">
                      <button
                        onClick={() => { setEditMode(false); setMessage(null); }}
                        className="flex-1 py-2.5 text-sm font-medium rounded-lg border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode - Simplified */
                  <div className="space-y-3">
                    {/* Mobile */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Mobile</p>
                        <p className="text-sm font-medium text-slate-700">{userData?.phone || '—'}</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">Address</p>
                        <p className="text-sm font-medium text-slate-700">{userData?.address || '—'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full mt-4 py-2.5 text-sm font-medium rounded-lg bg-teal-500 text-white hover:bg-teal-600 transition-colors"
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
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-b border-slate-200/60 z-40 flex items-center justify-between px-4 shadow-sm">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
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
          className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-teal-100"
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
            <div className="w-full h-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </motion.button>
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

      {/* Mobile Sidebar - Light Theme */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="lg:hidden fixed top-0 left-0 h-full w-[280px] bg-white shadow-2xl z-50 flex flex-col border-r border-slate-200"
          >
            {/* Mobile Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                >
                  <Logo size="sm" animate={false} />
                </motion.div>
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-bold text-slate-800 text-base"
                >
                  Clothing BD
                </motion.span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-600" />
              </motion.button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 py-5 px-4 overflow-y-auto">
              <p className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu</p>
              <div className="space-y-1.5">
                {filteredNav.map((item, index) => {
                  const active = isActive(item.href);
                  const IconComponent = active ? item.iconSolid : item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                          active 
                            ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg` 
                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`} />
                        <span className="text-sm font-semibold">{item.name}</span>
                        {active && (
                          <motion.div
                            layoutId="mobileActiveIndicator"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80"
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            {/* Mobile Logout */}
            <div className="border-t border-slate-100 p-4">
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="text-sm font-semibold">Logout</span>
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Premium Modern Theme */}
      <motion.aside
        initial={false}
        animate={sidebarOpen ? 'expanded' : 'collapsed'}
        variants={sidebarVariants}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex fixed top-0 left-0 h-full bg-white z-40 flex-col border-r border-slate-200/60 shadow-sm"
      >
        {/* Logo Section */}
        <div className="h-[72px] flex items-center px-3 border-b border-slate-100 gap-2">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <Logo size="sm" animate={false} />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-slate-800 text-sm leading-tight truncate">Clothing BD</span>
                  <span className="text-[10px] text-slate-400 font-medium">Dashboard</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex-1 flex justify-center"
              >
                <Logo size="sm" animate={false} />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'rgb(241 245 249)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 hover:bg-slate-100"
          >
            <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }}>
              <ChevronLeftIcon className="w-4 h-4 text-slate-500" />
            </motion.div>
          </motion.button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 py-5 px-3 overflow-y-auto">
          {sidebarOpen && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
            >
              Navigation
            </motion.p>
          )}
          <div className="space-y-1.5">
            {filteredNav.map((item, index) => {
              const active = isActive(item.href);
              const IconComponent = active ? item.iconSolid : item.icon;
              
              return (
                <div key={item.href} className="relative group">
                  <Link href={item.href}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                        active 
                          ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg` 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 flex-shrink-0 ${sidebarOpen ? '' : 'mx-auto'} ${active ? 'text-white' : ''}`} />
                      {sidebarOpen && (
                        <motion.span 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm font-semibold whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      )}
                      {sidebarOpen && active && (
                        <motion.div
                          layoutId="desktopActiveIndicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80"
                        />
                      )}
                    </motion.div>
                  </Link>

                  {/* Enhanced Tooltip for collapsed state */}
                  {!sidebarOpen && (
                    <motion.div 
                      variants={tooltipVariants}
                      initial="hidden"
                      whileHover="visible"
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50"
                    >
                      {item.name}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 rotate-45" />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Settings & Logout Section */}
        <div className="border-t border-slate-100 p-3 space-y-1.5">
          {sidebarOpen && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
            >
              Account
            </motion.p>
          )}
          <motion.button
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-200 ${
              sidebarOpen ? '' : 'justify-center'
            }`}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-semibold">Logout</span>}
          </motion.button>
        </div>
      </motion.aside>

      {/* Desktop Top Bar */}
      <motion.header
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 280 : 80 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden lg:flex fixed top-0 right-0 left-0 h-[72px] bg-white/80 backdrop-blur-xl border-b border-slate-100/80 z-30 items-center justify-between px-6"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-72 pl-11 pr-4 py-2.5 text-sm bg-slate-50/80 border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 placeholder:text-slate-400 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Button */}
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <BellIcon className="w-5 h-5 text-slate-600" />
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"
            />
          </motion.button>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-200" />

          {/* Profile Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-700">{userData?.username}</p>
              <p className="text-xs text-slate-400">{userData?.designation || userData?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-slate-100">
              {userData?.photo ? (
                <Image
                  src={userData.photo}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold">
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
        className="min-h-screen bg-slate-50/50 flex flex-col"
      >
        <div className="pt-[72px] lg:pt-[72px] flex-1">
          <div className="p-6 lg:p-8 pt-20 lg:pt-8">
            {children}
          </div>
        </div>
        
        {/* Footer Credit */}
        <footer className="border-t border-slate-200 bg-gradient-to-r from-slate-100 to-slate-50 py-5 px-6 text-center shadow-inner">
          <p className="text-sm text-slate-600">
            Developed by <span className="font-bold text-teal-600">MEHEDI HASAN</span> © 2026
          </p>
          <p className="text-xs text-slate-500 mt-1">
            All rights reserved. Developer reserves the right to modify any part of this system.
          </p>
        </footer>
      </motion.main>
    </div>
  );
}
