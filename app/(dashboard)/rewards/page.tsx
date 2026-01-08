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

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Rewards</h1>
        <p className="text-gray-600 mt-2">Manage your rewards and redemptions</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 mb-8 overflow-x-auto">
        {user?.role === 'admin' ? (
          <>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'browse'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Browse Rewards
            </button>
            <button
              onClick={() => setActiveTab('my-rewards')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'my-rewards'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              My Rewards
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'manage'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Manage Rewards
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'points'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Manage Points
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'approvals'
                  ? 'text-amber-600 border-amber-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Approvals
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'browse'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Browse Rewards
            </button>
            <button
              onClick={() => setActiveTab('my-rewards')}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
                activeTab === 'my-rewards'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              My Rewards
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'browse' && (
          <BrowseRewards userPoints={userPoints} onRedemptionSuccess={handleRedemptionSuccess} />
        )}
        {activeTab === 'my-rewards' && <MyRewards />}
        {activeTab === 'manage' && user?.role === 'admin' && <ManageRewards />}
        {activeTab === 'points' && user?.role === 'admin' && (
          <ManagePointsPanel />
        )}
        {activeTab === 'approvals' && user?.role === 'admin' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Redemption Approvals</h2>
            <RedemptionApprovalPanel />
          </div>
        )}
      </div>
    </>
  );
}
