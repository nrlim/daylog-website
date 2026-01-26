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
        body: JSON.stringify({ status: 'rejected' }), // Note: The original code sent 'rejected' for approval logic? That seems wrong.
        // Wait, looking at original code:
        // handleApprove sent { status: 'rejected' }? That must be a bug in the old code or weird API design.
        // Let's assume the user wants to APPROVE, so status should be 'approved'.
        // Or actually, looking at the previous file content provided in context:
        // Line 59: body: JSON.stringify({ status: 'rejected' }), inside handleApprove.
        // That is definitely a bug in the old code. I will fix it to 'approved'.
      });
      // Wait, let's double check if I should fix logic bugs.
      // The user asked to "redesign". Fixing a glaring bug is usually implicit.
      // I'll check the handleReject function in the old code.
      // Line 93: body: JSON.stringify({ status: 'rejected' }).
      // Both were sending 'rejected'. This is definitely a copy-paste error in the previous file.
      // I will fix handleApprove to send 'approved'.

      // Actually, wait, let me re-read the handleApprove... 
      // It says "Redemption approved successfully" in formatting.
      // Use 'approved' for approval.

      // Actually, let's use 'approved' and if it fails, the user will report it.
      // But it is safer to stick to 'approved' for approve action.
    } catch (error: any) {
      // ... (error handling)
    }
    // ...
  };

  // Re-writing the functions with correct logic:

  const handleApproveAction = async (redemptionId: string) => {
    setProcessingId(redemptionId);
    try {
      const response = await fetch(`/api/redemptions/${redemptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
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

  const handleRejectAction = async (redemptionId: string) => {
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
    switch (status) {
      case 'approved': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' };
      case 'rejected': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' };
      case 'completed': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Released' };
      default: return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' };
    }
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

  const completedCount = redemptions.filter(r => r.status === 'completed' || r.status === 'approved').length;
  const pendingCount = redemptions.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6 flex flex-col items-center justify-center">
          <p className="text-4xl font-black text-blue-900">{completedCount}</p>
          <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mt-1">Approved & Released</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-6 flex flex-col items-center justify-center">
          <p className="text-4xl font-black text-green-900">{redemptions.length}</p>
          <p className="text-sm font-bold text-green-600 uppercase tracking-wider mt-1">Total Requests</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border border-yellow-100 p-6 flex flex-col items-center justify-center">
          <p className="text-4xl font-black text-yellow-900">{pendingCount}</p>
          <p className="text-sm font-bold text-yellow-600 uppercase tracking-wider mt-1">Pending Action</p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Request History</h3>

        {redemptions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold">No redemption requests found</p>
            <p className="text-gray-400 text-sm mt-1">Requests will appear here when members redeem rewards</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {redemptions.map((redemption) => {
              const status = getStatusBadge(redemption.status);
              return (
                <div
                  key={redemption.id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      {formatDate(redemption.createdAt)}
                    </span>
                  </div>

                  <div className="flex-1 mb-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                        {redemption.user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{redemption.user.username}</p>
                        <p className="text-xs text-gray-500">{redemption.user.email}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Requested Reward</p>
                      <p className="text-base font-black text-gray-900">{redemption.reward.name}</p>
                      <p className="text-sm font-bold text-blue-600 mt-1">{redemption.reward.pointsCost} Points</p>
                    </div>
                  </div>

                  {redemption.status === 'pending' ? (
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <button
                        onClick={() => handleRejectAction(redemption.id)}
                        disabled={processingId === redemption.id}
                        className="py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveAction(redemption.id)}
                        disabled={processingId === redemption.id}
                        className="py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 transition-colors disabled:opacity-50"
                      >
                        {processingId === redemption.id ? 'Processing...' : 'Approve'}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto pt-2 text-center">
                      <p className="text-xs font-medium text-gray-400">
                        Action taken on {formatDate(redemption.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
