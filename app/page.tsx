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
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Navigation Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">DL</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide">DayLog</h1>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
          >
            Login
          </button>
        </div>
      </div>

      {/* Main Content - Non-Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="w-full h-full flex flex-col items-center justify-center px-6">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Team Performance <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Dashboard</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Track team activities, manage tasks, and celebrate top performers every month
            </p>
          </div>

          {/* Top Performers Section */}
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-white mb-2">🌟 Top Performers This Month</h3>
            <p className="text-slate-400">Celebrating our team's best contributors</p>
          </div>

          {loadingPerformers ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-purple-500"></div>
            </div>
          ) : topPerformers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
              {topPerformers.map((performer) => (
                <div
                  key={performer.id}
                  className={`relative group overflow-hidden rounded-2xl bg-gradient-to-br ${getRankColor(performer.rank)} p-1`}
                >
                  {/* Animated border effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform -skew-x-12" />
                  
                  <div className="relative bg-slate-800 rounded-xl p-8 flex flex-col items-center justify-center h-full">
                    <div className="text-6xl mb-4">{getMedalEmoji(performer.rank)}</div>
                    
                    <div className="text-center">
                      <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">
                        {performer.rank === 1 && 'Top Performer'}
                        {performer.rank === 2 && 'Second Place'}
                        {performer.rank === 3 && 'Third Place'}
                      </p>
                      <h4 className="text-2xl font-bold text-white mb-2">
                        {performer.user.username}
                      </h4>
                      <p className="text-slate-500">Outstanding contribution</p>
                    </div>

                    {/* Rank badge */}
                    <div className={`absolute top-4 right-4 w-12 h-12 rounded-full bg-gradient-to-br ${getRankColor(performer.rank)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{performer.rank}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-slate-700 max-w-2xl">
              <p className="text-slate-400 text-lg">No top performers set yet</p>
              <p className="text-slate-500 mt-2">Admin will configure top performers soon</p>
            </div>
          )}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Username
                </label>
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
