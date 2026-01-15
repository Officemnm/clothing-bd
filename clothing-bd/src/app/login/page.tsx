'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (data.success) {
        // Small delay to ensure cookie is properly set before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        // Use hard redirect to bypass Next.js router cache
        window.location.href = '/dashboard';
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
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.04), transparent 32%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.03), transparent 28%), #0b0d12',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Space Grotesk', 'Manrope', 'Sora', sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04), transparent 50%)',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(13,16,24,0.72)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
          borderRadius: '24px',
          padding: '40px 36px',
          backdropFilter: 'blur(10px)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '0 auto auto 0',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent 60%)',
            filter: 'blur(12px)',
          }}
        />

        <div style={{ marginBottom: '28px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f5f5f5, #dcdfe3)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b0d12" strokeWidth="2">
                <path d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5V9H4V7.5zM4 11h16v5.5A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5V11z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#d5d7dd', letterSpacing: '0.02em' }}>Clothing BD</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f7f7f8', letterSpacing: '-0.01em' }}>Secure Access</div>
            </div>
          </div>
          <h1 style={{ margin: '18px 0 6px', fontSize: '28px', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>Please sign in to continue</p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(127,29,29,0.18)',
              border: '1px solid rgba(248,113,113,0.35)',
              color: '#fca5a5',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#d1d5db',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              Username
            </label>
            <div
              style={{
                position: 'relative',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  fontSize: '15px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: '#f4f4f5',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                }}
                onFocus={(e) => {
                  const parent = e.target.parentElement as HTMLElement;
                  parent.style.border = '1px solid rgba(255,255,255,0.18)';
                  parent.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
                  parent.style.background = 'rgba(255,255,255,0.04)';
                }}
                onBlur={(e) => {
                  const parent = e.target.parentElement as HTMLElement;
                  parent.style.border = '1px solid rgba(255,255,255,0.08)';
                  parent.style.boxShadow = 'none';
                  parent.style.background = 'rgba(255,255,255,0.02)';
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" />
                </svg>
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: '#d1d5db',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              Password
            </label>
            <div
              style={{
                position: 'relative',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  fontSize: '15px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: '#f4f4f5',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                }}
                onFocus={(e) => {
                  const parent = e.target.parentElement as HTMLElement;
                  parent.style.border = '1px solid rgba(255,255,255,0.18)';
                  parent.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
                  parent.style.background = 'rgba(255,255,255,0.04)';
                }}
                onBlur={(e) => {
                  const parent = e.target.parentElement as HTMLElement;
                  parent.style.border = '1px solid rgba(255,255,255,0.08)';
                  parent.style.boxShadow = 'none';
                  parent.style.background = 'rgba(255,255,255,0.02)';
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 17a5 5 0 100-10 5 5 0 000 10z" />
                  <path d="M12 12v1.5" />
                  <path d="M12 8.5h.01" />
                </svg>
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.01em',
              color: '#0b0d12',
              background: 'linear-gradient(135deg, #f5f5f5, #dfe3e7)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.8 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 16px 32px rgba(0,0,0,0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseDown={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(1px) scale(0.995)';
              btn.style.boxShadow = '0 10px 20px rgba(0,0,0,0.28)';
            }}
            onMouseUp={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.transform = 'translateY(0) scale(1)';
              btn.style.boxShadow = '0 16px 32px rgba(0,0,0,0.35)';
            }}
          >
            {isLoading ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(11,13,18,0.25)',
                    borderTopColor: '#0b0d12',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Signing in</span>
              </>
            ) : (
              <>
                <span>Enter workspace</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 5l7 7-7 7" />
                  <path d="M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '26px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '12px',
            letterSpacing: '0.02em',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span style={{ fontWeight: 700, color: '#e5e7eb' }}>Clothing BD</span> • Premium Access Portal
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <style jsx global>{`
        body {
          margin: 0;
          background: #0b0d12;
          color: #e5e7eb;
          font-family: 'Space Grotesk', 'Manrope', 'Sora', sans-serif;
        }
      `}</style>
    </div>
  );
}
