'use client';

import RedemptionApprovalPanel from '@/components/RedemptionApprovalPanel';
import { useAuthStore } from '@/lib/store';

export default function RedemptionApprovalsPage() {
  const { user } = useAuthStore();

  // If not admin, redirect them back
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900">Access Denied</h2>
          <p className="text-red-700 mt-2">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Redemption Approvals</h1>
        <p className="text-gray-600 mt-2">Review and approve user reward redemptions</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <RedemptionApprovalPanel />
      </div>

      {/* Info Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-3">✓ Approve</h3>
          <p className="text-green-800 text-sm">User can activate the reward and use it. Status changes to &quot;Approved&quot;.</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-3">✗ Reject</h3>
          <p className="text-red-800 text-sm">Decline the reward. User&apos;s points are automatically refunded.</p>
        </div>
      </div>
    </>
  );
}
