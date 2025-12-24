'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getMe();
        setUser(response.data.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, setUser]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link href="/dashboard" className="flex items-center text-gray-900 hover:text-blue-500">
                Dashboard
              </Link>
              <Link href="/teams" className="flex items-center text-gray-900 hover:text-blue-500">
                Teams
              </Link>
              <Link href="/activities" className="flex items-center text-gray-900 hover:text-blue-500">
                Activities
              </Link>
              <Link href="/poker" className="flex items-center text-gray-900 hover:text-blue-500">
                Planning Poker
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
