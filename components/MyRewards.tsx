'use client';

import { useState, useEffect } from 'react';
import { redemptionsAPI } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store';

interface RedemptionItem {
  id: string;
  status: string;
  isActivated: boolean;
  createdAt: string;
  expiresAt?: string;
  activatedAt?: string;
  reward: {
    id: string;
    name: string;
    description?: string;
    pointsCost: number;
    expiresAt?: string;
  };
}

export default function MyRewards() {
  const { user } = useAuthStore();
  const [redemptions, setRedemptions] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    fetchRedemptions();
  }, [user]);

  const fetchRedemptions = async () => {
    setLoading(true);
    try {
      const response = await redemptionsAPI.getRedemptions(true); // personal = true
      setRedemptions(response.data?.redemptions || []);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load your rewards',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateReward = async (redemptionId: string) => {
    setActivatingId(redemptionId);
    try {
      const response = await fetch(`/api/redemptions/${redemptionId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate reward');
      }

      const data = await response.json();
      
      // Update the redemption in local state
      setRedemptions((prev) =>
        prev.map((r) =>
          r.id === redemptionId
            ? {
                ...r,
                status: 'completed',
                isActivated: true,
                activatedAt: new Date().toISOString(),
              }
            : r
        )
      );

      addNotification({
        type: 'success',
        title: 'Reward Activated!',
        message: data.redemption?.reward?.name + ' has been activated successfully',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to activate reward',
      });
    } finally {
      setActivatingId(null);
    }
  };

  const isRewardExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getExpirationText = (expiresAt?: string, createdAt?: string) => {
    if (!expiresAt) return null;
    
    const expDate = new Date(expiresAt);
    const now = new Date();
    const isExpired = expDate < now;
    
    if (isExpired) {
      return { text: 'Expired', className: 'text-red-600' };
    }
    
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 1) {
      return { text: 'Expires today', className: 'text-red-500 font-semibold' };
    } else if (daysLeft <= 7) {
      return { text: `Expires in ${daysLeft} days`, className: 'text-orange-500' };
    } else {
      return { text: `Expires in ${daysLeft} days`, className: 'text-gray-500' };
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⏳' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '✓' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: '✗' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: '✓✓' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${config.bg} ${config.text}`}>
        {config.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-300 border-t-purple-600 mb-4"></div>
        <p className="text-gray-600 text-sm">Loading your rewards...</p>
      </div>
    );
  }

  if (redemptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium text-center">No rewards redeemed yet</p>
        <p className="text-gray-500 text-sm text-center mt-2">Start browsing and redeeming rewards from the Browse Rewards tab!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">My Redeemed Rewards</h3>
        <p className="text-xs text-gray-600 mt-0.5">Total: <span className="font-bold text-purple-600">{redemptions.length}</span> reward{redemptions.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Rewards List - Simple and Clean */}
      <div className="space-y-2">
        {redemptions.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-purple-300 transition-all duration-300"
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{item.reward.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold">{item.reward.pointsCost} pts</span>
                {item.status === 'pending' && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-semibold">Pending</span>
                )}
                {item.status === 'approved' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">Ready to Use</span>
                )}
                {item.status === 'rejected' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">Rejected</span>
                )}
                {item.status === 'completed' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">Activated</span>
                )}
                {isRewardExpired(item.expiresAt || item.reward.expiresAt) && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">EXPIRED</span>
                )}
              </div>
              {getExpirationText(item.expiresAt || item.reward.expiresAt) && (
                <p className={`text-xs mt-1 ${getExpirationText(item.expiresAt || item.reward.expiresAt)?.className}`}>
                  {getExpirationText(item.expiresAt || item.reward.expiresAt)?.text}
                </p>
              )}
            </div>

            {/* Action - Date or Activate Button */}
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(item.createdAt)}</p>
              
              {/* Show activate button only for approved rewards that are not expired */}
              {item.status === 'approved' && !isRewardExpired(item.expiresAt || item.reward.expiresAt) && !item.isActivated && (
                <button
                  onClick={() => handleActivateReward(item.id)}
                  disabled={activatingId === item.id}
                  className="text-xs px-3 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                  {activatingId === item.id ? 'Using...' : 'Use Now'}
                </button>
              )}
              
              {/* Disable button if expired */}
              {isRewardExpired(item.expiresAt || item.reward.expiresAt) && (
                <button
                  disabled
                  className="text-xs px-3 py-1 rounded bg-gray-100 text-gray-400 cursor-not-allowed font-semibold"
                >
                  Expired
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
