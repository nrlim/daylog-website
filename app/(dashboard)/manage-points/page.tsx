'use client';

import ManagePointsPanel from '@/components/ManagePointsPanel';
import { useAuthStore } from '@/lib/store';

export default function ManagePointsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">Manage Member Points</h1>
        <p className="text-gray-600 mt-2">Award or adjust points for team members</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <ManagePointsPanel />
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">About Points Management</h3>
        <ul className="text-blue-800 space-y-2 text-sm">
          <li>✓ Award points to individual team members</li>
          <li>✓ Deduct points for penalties or corrections</li>
          <li>✓ Points immediately reflect in member accounts</li>
          <li>✓ All transactions are recorded in the system</li>
        </ul>
      </div>
    </>
  );
}
