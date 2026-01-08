'use client';

import MyRewards from '@/components/MyRewards';

export default function MyRewardsPage() {
  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Rewards</h1>
        <p className="text-gray-600 mt-2">View and activate your redeemed rewards</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <MyRewards />
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h3 className="font-semibold text-purple-900 mb-3">How to Use Your Rewards</h3>
        <ol className="text-purple-800 space-y-2 text-sm list-decimal list-inside">
          <li><strong>Pending</strong> ⏳ - Waiting for admin approval</li>
          <li><strong>Approved</strong> ✓ - Ready to use! Click &quot;Use Now&quot;</li>
          <li><strong>Activated</strong> ✓✓ - Quota added to your account</li>
          <li><strong>Use in Activities</strong> - Create WFH activities to consume quota</li>
        </ol>
      </div>
    </>
  );
}
