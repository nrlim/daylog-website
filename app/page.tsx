'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, authAPI } from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/lib/store';

interface TopPerformer {
  id: string;
  userId: string;
  rank: number;
  user: {
    username: string;
  };
}

export default function HomePage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loadingPerformers, setLoadingPerformers] = useState(true);

  // Fetch top performers on mount
  useEffect(() => {
    const fetchTopPerformers = async () => {
      try {
        setLoadingPerformers(true);
        const response = await api.get('/top-performers');
        setTopPerformers(response.data?.performers || response.data || []);
      } catch (error) {
        console.error('Failed to fetch top performers:', error);
      } finally {
        setLoadingPerformers(false);
      }
    };

    fetchTopPerformers();
  }, []);

  // Auto-focus username input when login modal opens
  useEffect(() => {
    if (showLoginModal) {
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 0);
    }
  }, [showLoginModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await authAPI.login(loginData);

      setUser(response.data.user);

      if (response.data.token) {
        typeof window !== 'undefined' && localStorage.setItem('token', response.data.token);
      }

      if (response.data.redmine_creds) {
        typeof window !== 'undefined' && localStorage.setItem('redmine_creds', response.data.redmine_creds);
      } else {
        if (typeof window !== 'undefined') {
          const fallbackCreds = btoa(`${loginData.username}:${loginData.password}`);
          localStorage.setItem('redmine_creds', fallbackCreds);
        }
      }

      setShowLoginModal(false);

      addNotification({
        type: 'success',
        title: 'Login Successful!',
        message: `Welcome back, ${response.data.user.username}!`,
        duration: 3000
      });

      router.push('/dashboard');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setLoginError(errorMsg);

      addNotification({
        type: 'error',
        title: 'Login Failed',
        message: errorMsg,
        duration: 5000
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-white to-gray-50 overflow-hidden font-sans flex flex-col">
      {/* Navigation Header */}
      <nav className="border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm flex-shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">DayLog</h1>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full mb-4">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Top Performers</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
              This Month&apos;s Winners
            </h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Recognizing excellence and outstanding contributions
            </p>
          </div>

          {/* Podium Section */}
          {loadingPerformers ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-3"></div>
              <p className="text-gray-500 font-medium">Loading...</p>
            </div>
          ) : topPerformers.length > 0 ? (
            <div className="relative max-w-4xl mx-auto">
              {/* Podium Grid - 3 Columns */}
              <div className="grid grid-cols-3 gap-4 items-end">
                {/* 2nd Place - Left */}
                {topPerformers[1] && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 p-0.5 shadow-lg">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-2xl font-black text-slate-600">{topPerformers[1].user.username.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-xs font-bold text-white">2</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 truncate max-w-full px-2">{topPerformers[1].user.username}</h3>
                    <p className="text-xs text-gray-500 font-medium mb-3">Silver</p>
                    <div className="w-full bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-xl p-6 shadow-lg border-t-2 border-slate-300">
                      <div className="text-center">
                        <div className="text-3xl font-black text-slate-600">2</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place - Center (Elevated) */}
                {topPerformers[0] && (
                  <div className="flex flex-col items-center -mt-6">
                    <div className="relative mb-3">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-xl">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-3xl font-black text-amber-600">{topPerformers[0].user.username.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-sm font-bold text-white">1</span>
                      </div>
                    </div>
                    <h3 className="text-base font-black text-gray-900 mb-1 truncate max-w-full px-2">{topPerformers[0].user.username}</h3>
                    <p className="text-xs text-amber-700 font-bold mb-3">Champion</p>
                    <div className="w-full bg-gradient-to-b from-amber-300 to-amber-400 rounded-t-xl p-8 shadow-xl border-t-2 border-amber-400">
                      <div className="text-center">
                        <div className="text-4xl font-black text-white drop-shadow">1</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place - Right */}
                {topPerformers[2] && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 p-0.5 shadow-lg">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-2xl font-black text-orange-600">{topPerformers[2].user.username.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-xs font-bold text-white">3</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1 truncate max-w-full px-2">{topPerformers[2].user.username}</h3>
                    <p className="text-xs text-gray-500 font-medium mb-3">Bronze</p>
                    <div className="w-full bg-gradient-to-b from-orange-200 to-orange-300 rounded-t-xl p-5 shadow-lg border-t-2 border-orange-300">
                      <div className="text-center">
                        <div className="text-3xl font-black text-orange-600">3</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Podium Base */}
              <div className="w-full">
                <div className="h-2 bg-gradient-to-b from-gray-300 to-gray-400 rounded-b-lg"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-900 text-lg font-bold mb-1">No Winners Yet</p>
              <p className="text-gray-500 text-sm">Check back soon to see this month&apos;s top performers</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/90 backdrop-blur-sm flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center">
          <p className="text-gray-500 text-xs font-medium">© 2026 DayLog</p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-xl font-black text-gray-900">Welcome Back</h2>
                <p className="text-sm text-gray-500 mt-0.5">Sign in to your account</p>
              </div>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError('');
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  <div>
                    <p className="text-red-800 text-sm font-bold">Login Failed</p>
                    <p className="text-red-600 text-sm">{loginError}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
