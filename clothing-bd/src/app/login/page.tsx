'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { UserIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Logo from '@/components/Logo';
import Toast from '@/components/Toast';

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'info' | 'success' | 'warning' | 'error' }>({ visible: false, message: '', type: 'info' });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'inactive') {
      showToast('Session expired due to inactivity. Please sign in again.', 'warning');
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'session=; max-age=0; path=/;';
      
      const logoutRes = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      await logoutRes.json();
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
        sessionStorage.setItem('newLogin', 'true');
        sessionStorage.setItem('loginUser', data.user?.username || '');
        
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
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

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 17 }
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white p-4 relative overflow-hidden">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={hideToast}
      />

      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-slate-200/50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-slate-200/40 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[380px] relative z-10"
      >
        <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Logo & Header */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-center mb-6"
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center justify-center mb-4"
              >
                <Logo size="xl" animate={true} />
              </motion.div>
              
              <motion.h1
                variants={itemVariants}
                className="text-xl font-bold text-slate-800 tracking-tight"
              >
                CLOTHING BD LTD.
              </motion.h1>
              
              <motion.p
                variants={itemVariants}
                className="text-slate-400 text-sm mt-1"
              >
                Sign in to continue
              </motion.p>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div 
                    initial={{ x: 0 }}
                    animate={{ x: [0, -3, 3, -3, 3, 0] }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Username */}
              <motion.div variants={itemVariants}>
                <div className={`flex items-center bg-slate-50/50 rounded-xl transition-all duration-300 ${
                  focusedField === 'username' 
                    ? 'bg-white shadow-[0_0_0_2px_rgba(20,184,166,0.15)] border border-teal-400' 
                    : 'border border-slate-200/80 hover:border-slate-300'
                }`}>
                  <span className={`pl-4 transition-colors duration-200 ${focusedField === 'username' ? 'text-teal-500' : 'text-slate-400'}`}>
                    <UserIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Username"
                    required
                    autoComplete="off"
                    className="w-full py-3.5 px-3 text-slate-800 bg-transparent text-sm font-medium placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants}>
                <div className={`flex items-center bg-slate-50/50 rounded-xl transition-all duration-300 ${
                  focusedField === 'password' 
                    ? 'bg-white shadow-[0_0_0_2px_rgba(20,184,166,0.15)] border border-teal-400' 
                    : 'border border-slate-200/80 hover:border-slate-300'
                }`}>
                  <span className={`pl-4 transition-colors duration-200 ${focusedField === 'password' ? 'text-teal-500' : 'text-slate-400'}`}>
                    <LockClosedIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Password"
                    required
                    className="w-full py-3.5 px-3 text-slate-800 bg-transparent text-sm font-medium placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div variants={itemVariants} className="pt-3">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:from-teal-600 hover:to-teal-700"
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        <span>Signing in...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="submit"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <span>Sign in</span>
                        <ArrowRightIcon className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </motion.form>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 pt-4 border-t border-slate-100 text-center"
            >
              <p className="text-slate-400 text-[10px]">
                Developed by <span className="font-semibold text-slate-500">MEHEDI HASAN</span>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50">
        <Logo size="xl" animate={true} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
