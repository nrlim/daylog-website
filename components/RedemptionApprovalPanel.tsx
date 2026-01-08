'use client';

import { useState, useEffect } from 'react';
import { useNotificationStore } from '@/lib/store';

interface Redemption {
  id: string;
  status: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  reward: {
    id: string;
    name: string;
    pointsCost: number;
  };
}

export default function RedemptionApprovalPanel() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/redemptions');
      if (!response.ok) {
        throw new Error('Failed to fetch redemptions');
      }
      const data = await response.json();
      setRedemptions(data.redemptions || []);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load redemptions',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (redemptionId: string) => {
    setProcessingId(redemptionId);
    try {
      const response = await fetch(`/api/redemptions/${redemptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve redemption');
      }

      addNotification({
        type: 'success',
        title: 'Approved!',
        message: 'Redemption approved successfully',
      });

      fetchRedemptions();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to approve redemption',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (redemptionId: string) => {
    if (!confirm('Reject this redemption? Points will be refunded to the user.')) return;

    setProcessingId(redemptionId);
    try {
      const response = await fetch(`/api/redemptions/${redemptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject redemption');
      }

      addNotification({
        type: 'success',
        title: 'Rejected!',
        message: 'Redemption rejected and points refunded',
      });

      fetchRedemptions();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to reject redemption',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '⏳ Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: '✓ Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '✗ Rejected' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: '✓✓ Completed' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingRedemptions = redemptions.filter((r) => r.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-600">
          {pendingRedemptions.length} pending action{pendingRedemptions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {redemptions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">✓ All rewards are automatically approved</p>
          <p className="text-gray-400 text-sm mt-1">Members can use redeemed rewards immediately</p>
        </div>
      ) : (
        <div className="space-y-3">
          {redemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{redemption.reward.name}</h3>
                    {getStatusBadge(redemption.status)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    User: <span className="font-medium">{redemption.user.username}</span>
                    {redemption.user.email && (
                      <span className="text-gray-500"> ({redemption.user.email})</span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-amber-600 font-medium">
                      💰 {redemption.reward.pointsCost} points
                    </span>
                    <span className="text-gray-500">{formatDate(redemption.createdAt)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {redemption.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(redemption.id)}
                      disabled={processingId === redemption.id}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {processingId === redemption.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(redemption.id)}
                      disabled={processingId === redemption.id}
                      className="px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {processingId === redemption.id ? 'Processing...' : 'Reject'}
                    </button>
                  </div>
                )}

                {/* View-Only for Other Statuses */}
                {redemption.status !== 'pending' && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-500">Status: {redemption.status}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">
            {redemptions.filter((r) => r.status === 'completed').length}
          </p>
          <p className="text-xs text-blue-600 mt-1">Activated</p>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            {redemptions.length}
          </p>
          <p className="text-xs text-green-600 mt-1">Total Rewards</p>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">0</p>
          <p className="text-xs text-gray-600 mt-1">Pending</p>
        </div>
      </div>
    </div>
  );
}
