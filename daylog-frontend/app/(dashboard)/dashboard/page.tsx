'use client';

import { useAuthStore } from '@/lib/store';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.username}!</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Teams</h2>
          <p className="text-gray-600 mb-4">Manage your teams and members</p>
          <a href="/teams" className="text-blue-500 hover:underline">
            View Teams →
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Activities</h2>
          <p className="text-gray-600 mb-4">Log and track daily activities</p>
          <a href="/activities" className="text-blue-500 hover:underline">
            View Activities →
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Planning Poker</h2>
          <p className="text-gray-600 mb-4">Estimate and vote on stories</p>
          <a href="/poker" className="text-blue-500 hover:underline">
            View Sessions →
          </a>
        </div>
      </div>
    </div>
  );
}
