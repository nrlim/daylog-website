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
      return { text: 'Expired', color: 'red' };
    }

    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 1) {
      return { text: 'Expires today', color: 'red' };
    } else if (daysLeft <= 7) {
      return { text: `Expires in ${daysLeft} days`, color: 'orange' };
    } else {
      return { text: `Expires in ${daysLeft} days`, color: 'gray' };
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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold">Loading rewards marketplace...</p>
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No rewards available</h3>
        <p className="text-gray-500">Check back later for new items to redeem!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="group bg-white rounded-3xl shadow-lg shadow-gray-100 border border-gray-100 overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
          >
            {/* Card Header / Icon Area */}
            <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <svg className="w-12 h-12 text-white/90 drop-shadow-md transform group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
              </svg>
              {reward.quantity === 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                  OUT OF STOCK
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex-1">
                {reward.expiresAt && (
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isRewardExpired(reward.expiresAt) ? 'text-red-500' : 'text-orange-500'
                    }`}>
                    {isRewardExpired(reward.expiresAt) ? 'Expired' : getExpirationInfo(reward.expiresAt)?.text}
                  </div>
                )}

                <h3 className="text-lg font-black text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                  {reward.name}
                </h3>

                {reward.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-4">
                    {reward.description}
                  </p>
                )}
              </div>

              {/* Price & Action */}
              <div className="pt-4 border-t border-gray-100 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black text-gray-900">
                    {reward.pointsCost} <span className="text-xs font-bold text-gray-400 align-top">PTS</span>
                  </span>
                  {reward.quantity > 0 && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {reward.quantity} LEFT
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleRedeemReward(reward)}
                  disabled={redeeming === reward.id || userPoints < reward.pointsCost || isRewardExpired(reward.expiresAt) || reward.quantity === 0}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${redeeming === reward.id
                      ? 'bg-gray-100 text-gray-400 cursor-wait'
                      : userPoints >= reward.pointsCost && !isRewardExpired(reward.expiresAt) && reward.quantity !== 0
                        ? 'bg-gray-900 text-white hover:bg-black hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {redeeming === reward.id ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Redeeming...
                    </>
                  ) : isRewardExpired(reward.expiresAt) ? (
                    'Expired'
                  ) : reward.quantity === 0 ? (
                    'Out of Stock'
                  ) : userPoints < reward.pointsCost ? (
                    `Need ${reward.pointsCost - userPoints} more pts`
                  ) : (
                    'Redeem Reward'
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
