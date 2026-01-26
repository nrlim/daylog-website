'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { pointsAPI } from '@/lib/api';
import ManageRewards from '@/components/ManageRewards';
import ManagePointsPanel from '@/components/ManagePointsPanel';
import RedemptionApprovalPanel from '@/components/RedemptionApprovalPanel';
import BrowseRewards from '@/components/BrowseRewards';
import MyRewards from '@/components/MyRewards';

export default function RewardsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'browse' | 'my-rewards' | 'manage' | 'points' | 'approvals'>('browse');
  const [userPoints, setUserPoints] = useState<number>(0);

  // Fetch user points on component mount
  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!user?.id) return;
      try {
        const response = await pointsAPI.getUserPoints(user.id);
        setUserPoints(response.data?.points || 0);
      } catch (error) {
        console.error('Failed to fetch user points:', error);
      }
    };

    fetchUserPoints();
  }, [user?.id]);

  const handleRedemptionSuccess = () => {
    // Refresh points after redemption
    if (user?.id) {
      pointsAPI.getUserPoints(user.id)
        .then(response => setUserPoints(response.data?.points || 0))
        .catch(err => console.error('Failed to refresh points:', err));
    }
  };

  const tabs = [
    { id: 'browse', label: 'Browse Rewards', role: 'all' },
    { id: 'my-rewards', label: 'My Rewards', role: 'all' },
    { id: 'manage', label: 'Manage Rewards', role: 'admin' },
    { id: 'points', label: 'Manage Points', role: 'admin' },
    { id: 'approvals', label: 'Approvals', role: 'admin' },
  ];

  const visibleTabs = tabs.filter(tab => tab.role === 'all' || user?.role === 'admin');

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Rewards Marketplace</h1>
            <p className="text-gray-500 mt-1 font-medium">Redeem your hard-earned points for exclusive perks</p>
          </div>

          <div className="bg-white px-6 py-3 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Your Balance</p>
              <p className="text-2xl font-black text-gray-900 leading-none">{userPoints.toLocaleString()} <span className="text-sm font-bold text-gray-400">pts</span></p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 p-1 bg-gray-200/50 rounded-xl w-full md:w-fit">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm scale-100'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'browse' && (
            <BrowseRewards userPoints={userPoints} onRedemptionSuccess={handleRedemptionSuccess} />
          )}
          {activeTab === 'my-rewards' && <MyRewards />}
          {activeTab === 'manage' && user?.role === 'admin' && <ManageRewards />}
          {activeTab === 'points' && user?.role === 'admin' && (
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
              <ManagePointsPanel />
            </div>
          )}
          {activeTab === 'approvals' && user?.role === 'admin' && (
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
              <h2 className="text-2xl font-black text-gray-900 mb-6">Redemption Approvals</h2>
              <RedemptionApprovalPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
