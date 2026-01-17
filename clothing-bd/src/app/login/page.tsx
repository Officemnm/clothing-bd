'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, LockClosedIcon, ArrowRightIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Logo from '@/components/Logo';

// Inner component that uses useSearchParams
function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [inactiveMessage, setInactiveMessage] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user was logged out due to inactivity
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'inactive') {
      setInactiveMessage('নিষ্ক্রিয়তার কারণে আপনাকে স্বয়ংক্রিয়ভাবে লগআউট করা হয়েছে। অনুগ্রহ করে আবার লগইন করুন।');
      // Clear the URL parameter
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First, clear any existing session cookie via document.cookie - multiple formats for safety
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'session=; max-age=0; path=/;';
      
      // Call logout API and WAIT for response to ensure cookie is cleared
      const logoutRes = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      
      // Wait for logout to complete
      await logoutRes.json();
      console.log('[Login] Logout completed, cookie should be cleared');
      
      // Clear cookie again after logout response
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Delay to ensure cookie is fully cleared
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Now login with fresh credentials
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('[Login] Success for user:', data.user?.username);
        
        // Store new login flag in sessionStorage so dashboard knows to refresh
        sessionStorage.setItem('newLogin', 'true');
        sessionStorage.setItem('loginUser', data.user?.username || '');
        
        // Clear any cached data
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Longer delay to ensure new cookie is set
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Force full page reload with cache bypass
        window.location.href = '/dashboard?fresh=' + Date.now();
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.3, 0.5, 0.3], 
            scale: [1, 1.1, 1],
            x: [0, 20, 0],
            y: [0, -10, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-teal-300/60 to-emerald-200/40 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.3, 0.5, 0.3], 
            scale: [1, 1.2, 1],
            x: [0, -15, 0],
            y: [0, 15, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-cyan-300/50 to-teal-200/40 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-emerald-200/30 to-cyan-100/30 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2314b8a6\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"
        />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 rounded-[26px] blur-lg opacity-30" />
        
        <div className="relative bg-white rounded-3xl shadow-2xl shadow-teal-200/50 border border-white/80 p-10 overflow-hidden">
          {/* Subtle inner gradient */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-teal-50 to-transparent rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-50 to-transparent rounded-full blur-2xl pointer-events-none" />
          
          {/* Logo & Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-10 relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
              className="inline-flex items-center justify-center mb-6"
            >
              <Logo size="xl" animate={true} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-teal-700 to-emerald-700 bg-clip-text text-transparent tracking-tight mb-2"
              style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
            >
              CLOTHING BD LTD.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-slate-500 text-sm font-medium"
            >
              Sign in to your workspace
            </motion.p>
          </motion.div>

          {/* Inactivity Message */}
          <AnimatePresence mode="wait">
            {inactiveMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <ClockIcon className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-amber-700 text-sm font-medium">{inactiveMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {/* Username Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
                Username
              </label>
              <div className="relative">
                <motion.div
                  animate={{
                    scale: focusedField === 'username' ? 1.02 : 1,
                    boxShadow: focusedField === 'username'
                      ? '0 8px 30px rgba(20, 184, 166, 0.15)'
                      : '0 2px 10px rgba(0, 0, 0, 0.05)',
                  }}
                  transition={{ duration: 0.2 }}
                  className={`relative overflow-hidden rounded-xl bg-white border-2 transition-colors ${
                    focusedField === 'username' ? 'border-teal-400' : 'border-slate-200'
                  }`}
                >
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    focusedField === 'username' ? 'text-teal-500' : 'text-slate-400'
                  }`}>
                    <UserIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your username"
                    required
                    autoComplete="off"
                    className="w-full py-4 pl-12 pr-4 text-slate-700 bg-transparent text-[15px] font-medium placeholder:text-slate-400 focus:outline-none"
                    style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
                Password
              </label>
              <div className="relative">
                <motion.div
                  animate={{
                    scale: focusedField === 'password' ? 1.02 : 1,
                    boxShadow: focusedField === 'password'
                      ? '0 8px 30px rgba(20, 184, 166, 0.15)'
                      : '0 2px 10px rgba(0, 0, 0, 0.05)',
                  }}
                  transition={{ duration: 0.2 }}
                  className={`relative overflow-hidden rounded-xl bg-white border-2 transition-colors ${
                    focusedField === 'password' ? 'border-teal-400' : 'border-slate-200'
                  }`}
                >
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    focusedField === 'password' ? 'text-teal-500' : 'text-slate-400'
                  }`}>
                    <LockClosedIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    required
                    className="w-full py-4 pl-12 pr-4 text-slate-700 bg-transparent text-[15px] font-medium placeholder:text-slate-400 focus:outline-none"
                    style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="pt-3"
            >
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02, boxShadow: '0 15px 40px rgba(20, 184, 166, 0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full py-4 px-6 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 text-white text-[15px] font-semibold rounded-xl shadow-xl shadow-teal-300/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden group"
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 relative z-10"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>Signing in...</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="submit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 relative z-10"
                    >
                      <span>Sign in</span>
                      <ArrowRightIcon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-6 border-t border-slate-100 text-center relative z-10"
          >
            <p className="text-slate-400 text-xs font-medium mb-1">
              <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent font-bold">CLOTHING BD LTD.</span>
            </p>
            <p className="text-slate-400 text-[10px]">
              System developed by <span className="font-semibold text-slate-500">MEHEDI HASAN</span>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50">
        <div className="animate-pulse">
          <Logo size="xl" />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
