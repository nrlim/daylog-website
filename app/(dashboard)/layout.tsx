'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { authAPI, teamAPI } from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import ProfileDrawer from '@/components/ProfileDrawer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState<any[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if current page should be fullscreen (hide sidebar/header)
  const isFullscreenPage = pathname?.startsWith('/redmine');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in localStorage before calling getMe
        const token = typeof window !== 'undefined' && localStorage.getItem('token');

        if (!token) {
          throw new Error('No token found');
        }

        setIsAuthenticated(true);

        const response = await authAPI.getMe();
        setUser(response.data.user);

        // Fetch user teams
        try {
          const teamsResponse = await teamAPI.getTeams();
          setUserTeams(teamsResponse.data.teams || []);
        } catch (err) {
          console.error('Failed to load teams:', err);
          setUserTeams([]);
        }
      } catch (error) {
        setIsAuthenticated(false);
        addNotification({
          type: 'error',
          title: 'Authentication Error',
          message: 'Please login again',
        });
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, setUser, addNotification]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-gray-700 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex font-sans text-gray-900">

      {/* Sidebar Navigation - Hidden on Fullscreen Pages */}
      {!isFullscreenPage && (
        <aside className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 hidden lg:flex flex-col z-50">

          {/* Logo Area */}
          <div className="p-8 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-gray-200">
              D
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900">DayLog</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-6 space-y-1 mt-6 overflow-y-auto">
            <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Platform</p>

            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100/50">
              <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Dashboard
            </Link>

            <Link href="/activities" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Activities
            </Link>

            <Link href="/redmine" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Agile Board
            </Link>

            <Link href="/rewards" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Rewards
            </Link>

            {(user?.role === 'admin' || (userTeams.some((t: any) => t.members?.some((m: any) => m.userId === user?.id && m.isLead)))) && (
              <>
                <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Management</p>

                <Link href="/teams" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  Teams
                </Link>

                <Link href="/reports" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Reports
                </Link>
              </>
            )}

            {user?.role === 'admin' && (
              <Link href="/users" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Users
              </Link>
            )}
          </nav>

        </aside>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen ${!isFullscreenPage ? 'lg:ml-72' : ''}`}>

        {/* Top Header - Hidden on Fullscreen Pages */}
        {!isFullscreenPage && (
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-6 flex items-center justify-between lg:justify-end">
            <div className="lg:hidden text-xl font-black text-gray-900">DayLog</div>

            <div className="flex items-center gap-4">
              {/* Place ProfileDrawer in the header */}
              <div className="relative">
                <ProfileDrawer />
              </div>
            </div>
          </header>
        )}

        {/* Page Content */}
        <main className="flex-1 p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
