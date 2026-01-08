'use client';

import { useState, useEffect } from 'react';
import { rewardsAPI, redemptionsAPI } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';

interface Reward {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  quantity: number;
  expiresAt?: string;
}

interface BrowseRewardsProps {
  userPoints: number;
  onRedemptionSuccess?: () => void;
}

export default function BrowseRewards({ userPoints, onRedemptionSuccess }: BrowseRewardsProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const { addNotification } = useNotificationStore();

  const isRewardExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getExpirationInfo = (expiresAt?: string) => {
    if (!expiresAt) return null;
    
    const expDate = new Date(expiresAt);
    const now = new Date();
    const isExpired = expDate < now;
    
    if (isExpired) {
      return { text: '⏰ Expired', color: 'red' };
    }
    
    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 1) {
      return { text: '⏰ Expires today', color: 'red' };
    } else if (daysLeft <= 7) {
      return { text: `⏰ Expires in ${daysLeft} days`, color: 'orange' };
    } else {
      return { text: `⏰ Expires in ${daysLeft} days`, color: 'gray' };
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const response = await rewardsAPI.getRewards();
      setRewards(response.data?.rewards || []);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load rewards',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (reward: Reward) => {
    if (isRewardExpired(reward.expiresAt)) {
      addNotification({
        type: 'error',
        title: 'Reward Expired',
        message: `This reward has expired and can no longer be redeemed`,
      });
      return;
    }

    if (userPoints < reward.pointsCost) {
      addNotification({
        type: 'warning',
        title: 'Insufficient Points',
        message: `You need ${reward.pointsCost} points but have ${userPoints}`,
      });
      return;
    }

    setRedeeming(reward.id);
    try {
      await redemptionsAPI.redeemReward(reward.id);
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Redeemed "${reward.name}" for ${reward.pointsCost} points!`,
      });
      fetchRewards();
      onRedemptionSuccess?.();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'Failed to redeem reward',
      });
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-300 border-t-blue-600 mb-4"></div>
        <p className="text-gray-600 text-sm">Loading available rewards...</p>
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium text-center">No rewards available</p>
        <p className="text-gray-500 text-sm text-center mt-2">Check back later for new rewards!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Available Rewards</h3>
        <p className="text-xs text-gray-600 mt-0.5">Points: <span className="font-bold text-green-600">{userPoints}</span></p>
      </div>

      {/* Rewards List - Simple and Compact */}
      <div className="space-y-2">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-green-300 transition-all duration-300"
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{reward.name}</h3>
              {reward.description && (
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{reward.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold">{reward.pointsCost} pts</span>
                {reward.quantity > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">{reward.quantity} left</span>
                )}
                {reward.expiresAt && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    isRewardExpired(reward.expiresAt)
                      ? 'bg-red-50 text-red-700'
                      : getExpirationInfo(reward.expiresAt)?.color === 'orange'
                      ? 'bg-orange-50 text-orange-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    {isRewardExpired(reward.expiresAt) ? 'Expired' : getExpirationInfo(reward.expiresAt)?.text}
                  </span>
                )}
              </div>
            </div>

            {/* Button */}
            <button
              onClick={() => handleRedeemReward(reward)}
              disabled={redeeming === reward.id || userPoints < reward.pointsCost || isRewardExpired(reward.expiresAt)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-300 whitespace-nowrap ${
                userPoints >= reward.pointsCost && !isRewardExpired(reward.expiresAt)
                  ? 'bg-green-500 hover:bg-green-600 text-white active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              } ${redeeming === reward.id ? 'opacity-75' : ''}`}
              title={isRewardExpired(reward.expiresAt) ? 'This reward has expired' : ''}
            >
              {redeeming === reward.id ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Pending...
                </span>
              ) : userPoints >= reward.pointsCost ? (
                'Redeem'
              ) : (
                'No Pts'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
