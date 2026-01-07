'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { reportingAPI, teamAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const router = useRouter();
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Allow admins and team leads to access reports
    // Backend will verify team lead status via TeamMember.isLead
    if (!user) {
      return;
    }

    // Allow access - backend will handle authorization
    loadUserTeams();
  }, [user, router, addNotification]);

  const loadUserTeams = async () => {
    try {
      const response = await teamAPI.getTeams();
      const teams = response.data.teams || [];
      setUserTeams(teams);
      if (teams.length > 0) {
        setSelectedTeam(teams[0].id);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load teams',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-gray-700 font-semibold">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Not Authenticated</h1>
        <p className="text-gray-600 mt-2">Please log in to access reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <span>📊</span> Team Reports
        </h1>
        <p className="text-blue-100 mt-2">Monitor team activities, productivity, and performance metrics</p>
      </div>

      {/* Team Selector */}
      {userTeams.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Team
          </label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {userTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Activity Report - Now includes WFH tracking */}
        <Link
          href={`/reports/activity?teamId=${selectedTeam}`}
          className="group bg-white rounded-lg shadow hover:shadow-lg hover:scale-105 transition-all p-6 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                Activity & Attendance
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                View activities, task status, and WFH usage in one place
              </p>
            </div>
            <div className="text-4xl group-hover:scale-110 transition-transform">📋</div>
          </div>
          <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm">
            View Report
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>

        {/* Productivity Report */}
        <Link
          href={`/reports/productivity?teamId=${selectedTeam}`}
          className="group bg-white rounded-lg shadow hover:shadow-lg hover:scale-105 transition-all p-6 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                Productivity Report
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Analyze team productivity and performance
              </p>
            </div>
            <div className="text-4xl group-hover:scale-110 transition-transform">📈</div>
          </div>
          <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm">
            View Report
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>

        {/* System-wide Report (Admin Only) */}
        <Link
          href="/reports/system"
          className="group bg-white rounded-lg shadow hover:shadow-lg hover:scale-105 transition-all p-6 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">
                System Report
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                View organization-wide statistics
              </p>
            </div>
            <div className="text-4xl group-hover:scale-110 transition-transform">🏢</div>
          </div>
          <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm">
            View Report
            <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </Link>


      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-gray-800">About These Reports</h3>
            <ul className="text-sm text-gray-700 mt-2 space-y-1 list-disc list-inside">
              <li><strong>Activity Report</strong> - Displays all member tasks including wfh usage with completion status</li>
              <li><strong>Productivity Report</strong> - Calculates completion rates and team performance metrics</li>
              <li><strong>System Report</strong> - Provides organization-wide overview of all teams</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
