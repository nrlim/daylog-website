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

  const getExpirationText = (expiresAt?: string) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' };
      case 'rejected': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' };
      case 'completed': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Activated' };
      default: return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold">Loading your rewards...</p>
      </div>
    );
  }

  if (redemptions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No rewards redeemed yet</h3>
        <p className="text-gray-500">Go to Browse Rewards to redeem your first item!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">My Collection</h3>
        <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-xs">
          {redemptions.length} Items
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {redemptions.map((item) => {
          const status = getStatusConfig(item.status);
          const expInfo = getExpirationText(item.expiresAt || item.reward.expiresAt);
          const isExpired = isRewardExpired(item.expiresAt || item.reward.expiresAt);

          return (
            <div
              key={item.id}
              className="group bg-white rounded-3xl shadow-lg shadow-gray-100 border border-gray-100 overflow-hidden hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Card Header with Status */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                <span className="text-xs font-bold text-gray-400">
                  {formatDate(item.createdAt)}
                </span>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="text-lg font-black text-gray-900 leading-tight mb-2 group-hover:text-purple-600 transition-colors">
                    {item.reward.name}
                  </h3>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-bold text-gray-500">{item.reward.pointsCost} pts</span>
                  </div>

                  {expInfo && (
                    <p className={`text-xs font-bold flex items-center gap-1 ${isExpired ? 'text-red-500' :
                        expInfo.color === 'orange' ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {expInfo.text}
                    </p>
                  )}
                </div>

                {/* Action */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  {item.status === 'approved' && !isExpired && !item.isActivated ? (
                    <button
                      onClick={() => handleActivateReward(item.id)}
                      disabled={activatingId === item.id}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md shadow-purple-200 transition-all flex items-center justify-center gap-2"
                    >
                      {activatingId === item.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Activating...
                        </>
                      ) : 'Use Now'}
                    </button>
                  ) : item.status === 'completed' || item.isActivated ? (
                    <div className="w-full py-2.5 bg-green-50 text-green-700 border border-green-100 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Redeemed
                    </div>
                  ) : isExpired ? (
                    <div className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-xl font-bold text-sm text-center">
                      Expired
                    </div>
                  ) : (
                    <div className="w-full py-2.5 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-xl font-bold text-sm text-center">
                      Waiting Approval
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
