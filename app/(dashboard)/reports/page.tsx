'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { teamAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const router = useRouter();
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <p className="text-gray-500 font-bold text-lg">Loading reports...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Not Authenticated</h2>
        <p className="text-gray-500">Please log in to access reports.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Reports & Analytics</h1>
            <p className="text-gray-500 font-medium mt-2 max-w-xl">
              Gain insights into team performance, productivity trends, and operational efficiency across your organization.
            </p>
          </div>

          {/* Enhanced Team Selector */}
          {userTeams.length > 1 && (
            <div className="relative group min-w-[280px]">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1 block">Viewing Data For</label>
              <div className="relative">
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all font-bold text-gray-900 shadow-lg shadow-gray-100/50 cursor-pointer"
                >
                  {userTeams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Activity & Attendance */}
          <Link href={`/reports/activity?teamId=${selectedTeam}`} className="group relative bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 hover:-translate-y-1">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500 w-full absolute top-0 left-0"></div>
            <div className="p-8">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                📋
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Activity Report</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-6">
                Comprehensive view of daily activities, task statuses, adherence to logs, and WFH tracking.
              </p>
              <div className="flex items-center text-blue-600 font-bold text-sm">
                View Report <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>
          </Link>

          {/* Productivity */}
          <Link href={`/reports/productivity?teamId=${selectedTeam}`} className="group relative bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-300 hover:-translate-y-1">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500 w-full absolute top-0 left-0"></div>
            <div className="p-8">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                📈
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">Productivity Report</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-6">
                Deep dive into task completion rates, efficiency scores, and individual performance metrics.
              </p>
              <div className="flex items-center text-amber-600 font-bold text-sm">
                View Analytics <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>
          </Link>

          {/* System Report (Admin Only) */}
          <Link href="/reports/system" className="group relative bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-indigo-900/10 transition-all duration-300 hover:-translate-y-1">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600 w-full absolute top-0 left-0"></div>
            <div className="p-8">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                🏢
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">System Report</h3>
              <p className="text-gray-500 font-medium leading-relaxed mb-6">
                High-level organization overview. Compare performance across different teams and departments.
              </p>
              <div className="flex items-center text-indigo-600 font-bold text-sm">
                View Overview <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </div>
          </Link>

        </div>

        {/* Info Box */}
        <div className="bg-gray-900 rounded-3xl p-8 relative overflow-hidden">
          {/* Abstract patterns */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-3 bg-white/10 rounded-2xl shrink-0">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Understanding Your Data</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-4xl">
                Our reports aggregate data from daily logs, project tracking, and WFH requests.
                <strong> Activity Reports</strong> help track day-to-day engagement, while
                <strong> Productivity Reports</strong> focus on efficiency and output quality.
                Use the <strong>System Report</strong> for macro-level decision making.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
