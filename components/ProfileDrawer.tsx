'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI, pointsAPI } from '@/lib/api';
import MyRewards from './MyRewards';

export default function ProfileDrawer() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'rewards'>('info');

  // Fetch user points
  const fetchUserPoints = async () => {
    if (!user?.id) return;
    setLoadingPoints(true);
    try {
      const response = await pointsAPI.getUserPoints(user.id);
      setUserPoints(response.data?.points || 0);
    } catch (error) {
      console.error('Failed to fetch user points:', error);
    } finally {
      setLoadingPoints(false);
    }
  };

  // Fetch points when drawer opens or user changes
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserPoints();
    }
  }, [isOpen, user?.id]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      setUser(null);
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      try {
        await authAPI.logout();
      } catch (err) {
        // Continue even if logout API fails
      }
      
      setIsOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      setUser(null);
      setIsOpen(false);
      router.push('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Profile Button - Hamburger Menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/10 transition-all duration-200 rounded-lg"
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        <svg 
          className="w-6 h-6 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Full-Size Sidebar Drawer */}
      <div
        className={`fixed right-0 top-0 h-screen w-full sm:w-96 bg-white shadow-2xl z-50 transition-all duration-500 transform flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Tab Navigation with Close Button */}
        <div className="px-2 py-3 border-b border-gray-200 flex-shrink-0 overflow-x-auto flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setProfileTab('info')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                profileTab === 'info'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setProfileTab('rewards')}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                profileTab === 'rewards'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              My Rewards
            </button>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 rounded-lg flex-shrink-0"
            aria-label="Close profile menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Content - Full Height */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-7 py-6">
            {/* Profile Info Tab */}
            {profileTab === 'info' && (
              <div>
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0 ring-4 ring-blue-100">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{user?.username}</h3>
                    <p className="text-sm text-gray-600 break-words">{user?.email}</p>
                    <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mt-2 capitalize">
                      {user?.role}
                    </span>
                  </div>
                </div>
                
                {/* Points Card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                      <span className="text-xs font-semibold text-gray-600 uppercase">Points</span>
                    </div>
                    <span className="text-3xl font-bold text-amber-600">{loadingPoints ? '-' : userPoints}</span>
                  </div>
                </div>
              </div>
            )}

            {/* My Rewards Tab */}
            {profileTab === 'rewards' && <MyRewards />}
          </div>
        </div>

        {/* Logout Button - Fixed at Bottom */}
        <div className="px-7 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </>
  );
}
