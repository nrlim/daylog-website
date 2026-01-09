'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, teamAPI } from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import ProfileDrawer from '@/components/ProfileDrawer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState<any[]>([]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-12">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">D</span>
                </div>
                DayLog
              </Link>
              <div className="hidden md:flex items-center gap-8">
                <Link
                  href="/dashboard"
                  className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                >
                  Dashboard
                </Link>
                <Link
                  href="/redmine"
                  className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                >
                  Agile
                </Link>
                <Link
                  href="/rewards"
                  className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                >
                  Rewards
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link
                      href="/reports"
                      className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                    >
                      Reports
                    </Link>
                    <Link
                      href="/teams"
                      className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                    >
                      Teams
                    </Link>
                    <Link
                      href="/users"
                      className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                    >
                      Users
                    </Link>
                  </>
                )}
                {/* Show Teams and Reports link for admins and team leads */}
                {user && user.role !== 'admin' && userTeams.some((t: any) => t.members?.some((m: any) => m.userId === user.id && m.isLead)) && (
                  <>
                    <Link
                      href="/teams"
                      className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                    >
                      Teams
                    </Link>
                    <Link
                      href="/reports"
                      className="text-blue-100 hover:text-white transition-colors font-semibold text-sm"
                    >
                      Reports
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <ProfileDrawer />
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
