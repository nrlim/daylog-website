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
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 outline-none focus:ring-2 focus:ring-gray-200"
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform">
          {(user as any)?.profilePicture ? (
            <img
              src={(user as any).profilePicture}
              alt={user?.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user?.username?.charAt(0).toUpperCase()
          )}
        </div>
        <div className="text-left hidden md:block">
          <p className="text-xs font-bold text-gray-900 leading-none">{user?.username}</p>
          <p className="text-[10px] text-gray-500 font-medium leading-none mt-1 group-hover:text-purple-600 transition-colors">View Profile</p>
        </div>
        <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] z-[90] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Side Drawer */}
      <div
        className={`fixed right-0 top-0 h-screen w-full sm:w-[400px] bg-white shadow-2xl z-[100] transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col border-l border-gray-100 overflow-x-hidden ${isOpen ? 'translate-x-0 visible opacity-100' : 'translate-x-full invisible opacity-0'
          }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
          <h2 className="text-lg font-black text-gray-900">My Account</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="relative z-10 p-2 -mr-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 pb-0 flex gap-6 border-b border-gray-100 text-sm font-bold text-gray-500 flex-shrink-0">
          <button
            onClick={() => setProfileTab('info')}
            className={`pb-3 border-b-2 transition-colors ${profileTab === 'info' ? 'text-gray-900 border-gray-900' : 'border-transparent hover:text-gray-700'}`}
          >
            Profile Info
          </button>
          <button
            onClick={() => setProfileTab('rewards')}
            className={`pb-3 border-b-2 transition-colors ${profileTab === 'rewards' ? 'text-purple-600 border-purple-600' : 'border-transparent hover:text-gray-700'}`}
          >
            My Rewards
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          {profileTab === 'info' && (
            <div className="space-y-8">
              {/* User Info Block */}
              <div className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-gray-100 p-1 mb-4">
                  {(user as any)?.profilePicture ? (
                    <img src={(user as any).profilePicture} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-3xl font-black">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-gray-900">{user?.username}</h3>
                <p className="text-sm text-gray-500 font-medium">{user?.email}</p>
                <div className="mt-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wide">
                    {user?.role}
                  </span>
                </div>
              </div>

              {/* Points Card */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Available Points</div>
                  <div className="text-3xl font-black text-gray-900">{loadingPoints ? '...' : userPoints}</div>
                </div>
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </div>
              </div>
            </div>
          )}

          {profileTab === 'rewards' && (
            <div className="animate-fade-in">
              <MyRewards />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-3.5 px-4 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoggingOut ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
                <span>Signing out...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
