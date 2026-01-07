'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { reportingAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface TeamStats {
  teamId: string;
  teamName: string;
  memberCount: number;
  stats: {
    totalActivities: number;
    completedTasks: number;
    blockedTasks: number;
    wfhDays: number;
  };
}

interface SystemReportData {
  timestamp: string;
  systemStats: {
    totalTeams: number;
    totalMembers: number;
    totalActivities: number;
    totalWfhDays: number;
  };
  teams: TeamStats[];
}

export default function SystemReportPage() {
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const router = useRouter();
  
  const [report, setReport] = useState<SystemReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper function to format date to YYYY-MM-DD in local time (no timezone conversion)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setMonthPeriod = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month (day 0 of next month)
    const lastDay = new Date(year, month + 1, 0);
    
    // Format dates in local time to avoid timezone issues
    const startDateStr = formatLocalDate(firstDay);
    const endDateStr = formatLocalDate(lastDay);
    
    setStartDate(startDateStr);
    setEndDate(endDateStr);
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setMonthPeriod(11, selectedYear - 1);
    } else {
      setMonthPeriod(selectedMonth - 1, selectedYear);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setMonthPeriod(0, selectedYear + 1);
    } else {
      setMonthPeriod(selectedMonth + 1, selectedYear);
    }
  };

  const getCurrentMonthLabel = () => {
    if (!startDate) return '';
    const date = new Date(startDate);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'Only admins can access system reports',
      });
      router.push('/dashboard');
      return;
    }

    // Initialize with current month dates
    const now = new Date();
    setMonthPeriod(now.getMonth(), now.getFullYear());
  }, [user, router, addNotification]);

  useEffect(() => {
    if (startDate && endDate) {
      loadReport();
    }
  }, [startDate, endDate]);

  const loadReport = async () => {
    if (!startDate || !endDate) return;
    
    try {
      const response = await reportingAPI.getSystemReport({
        startDate,
        endDate,
      });
      setReport(response.data);
    } catch (error) {
      console.error('Failed to load system report:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load system report',
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
          <p className="text-gray-700 font-semibold">Loading system report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Report Not Found</h1>
        <p className="text-gray-600 mt-2">Unable to load the system report</p>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-2">Only administrators can access system reports</p>
      </div>
    );
  }

  const completionRate = report.systemStats.totalActivities > 0
    ? ((report.systemStats.totalActivities - 
        report.teams.reduce((sum, t) => sum + t.stats.blockedTasks, 0)) / 
        report.systemStats.totalActivities * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              System Report
            </h1>
            <p className="text-indigo-100 mt-2">Organization-wide activity and productivity overview | Period: <strong>{getCurrentMonthLabel()}</strong> ({startDate} to {endDate})</p>
          </div>
          <Link
            href="/reports"
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-semibold"
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Period/Month Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Month Selector */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Select Report Period</h3>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors font-semibold"
              >
                ← Previous
              </button>
              
              <div className="flex gap-4 items-center">
                <select
                  value={selectedMonth}
                  onChange={(e) => setMonthPeriod(parseInt(e.target.value), selectedYear)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
                
                <select
                  value={selectedYear}
                  onChange={(e) => setMonthPeriod(selectedMonth, parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold"
                >
                  {[2024, 2025, 2026, 2027].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={goToNextMonth}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg transition-colors font-semibold"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Or Select Custom Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    const now = new Date();
                    setMonthPeriod(now.getMonth(), now.getFullYear());
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  Reset to Current Month
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-indigo-700 font-medium">Total Teams</div>
              <div className="text-3xl font-bold text-indigo-600 mt-1">{report.systemStats.totalTeams}</div>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow p-6 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-amber-700 font-medium">Total Members</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">{report.systemStats.totalMembers}</div>
            </div>
            <div className="text-3xl">👤</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-indigo-700 font-medium">Total Activities</div>
              <div className="text-3xl font-bold text-indigo-600 mt-1">{report.systemStats.totalActivities}</div>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow p-6 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-amber-700 font-medium">WFH Days</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">{report.systemStats.totalWfhDays}</div>
            </div>
            <div className="text-3xl">🏠</div>
          </div>
        </div>
      </div>

      {/* Overall Metrics */}
      <div className="bg-gradient-to-br from-indigo-50 to-indigo-50 rounded-lg shadow-sm border border-indigo-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Overall Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
            <div className="text-sm text-gray-600 font-medium mb-1">Avg Team Size</div>
            <div className="text-3xl font-bold text-indigo-600">
              {report.systemStats.totalTeams > 0
                ? (report.systemStats.totalMembers / report.systemStats.totalTeams).toFixed(1)
                : 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">members per team</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-amber-100 shadow-sm">
            <div className="text-sm text-gray-600 font-medium mb-1">Avg Tasks per Member</div>
            <div className="text-3xl font-bold text-amber-600">
              {report.systemStats.totalMembers > 0
                ? (report.systemStats.totalActivities / report.systemStats.totalMembers).toFixed(1)
                : 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">tasks assigned</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
            <div className="text-sm text-gray-600 font-medium mb-1">Task Completion Rate</div>
            <div className="text-3xl font-bold text-indigo-600">{completionRate}%</div>
            <div className="text-xs text-gray-500 mt-1">overall completion</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-amber-100 shadow-sm">
            <div className="text-sm text-gray-600 font-medium mb-1">WFH Usage Rate</div>
            <div className="text-3xl font-bold text-amber-600">
              {report.systemStats.totalActivities > 0
                ? ((report.systemStats.totalWfhDays / report.systemStats.totalActivities) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">of total activities</div>
          </div>
        </div>
      </div>

      {/* Team Breakdown */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Team Breakdown</h2>
        <div className="grid grid-cols-1 gap-4">
          {report.teams
            .sort((a, b) => b.stats.totalActivities - a.stats.totalActivities)
            .map((team, idx) => {
              const teamCompletionRate =
                team.stats.totalActivities > 0
                  ? (((team.stats.totalActivities - team.stats.blockedTasks) /
                      team.stats.totalActivities) *
                      100).toFixed(1)
                  : '0';

              return (
                <Link
                  key={team.teamId}
                  href={`/reports/activity?teamId=${team.teamId}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-indigo-400 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-6">
                    {/* Team Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 hover:text-indigo-600 transition-colors">
                            {team.teamName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:grid grid-cols-4 gap-6 flex-1">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {team.stats.totalActivities}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">Activities</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">
                          {team.stats.completedTasks}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {teamCompletionRate}%
                        </div>
                        <div className="text-xs text-gray-600 font-medium">Completion</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">
                          {team.stats.wfhDays}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">WFH Days</div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg
                      className="w-5 h-5 text-gray-600 hidden md:block"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>

                  {/* Mobile Stats */}
                  <div className="md:hidden grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                    <div>
                      <div className="text-lg font-bold text-indigo-600">
                        {team.stats.totalActivities}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Activities</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-600">
                        {team.stats.completedTasks}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-indigo-600">
                        {teamCompletionRate}%
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Completion</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-amber-600">
                        {team.stats.wfhDays}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">WFH Days</div>
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-50 border border-indigo-200 rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">System Report Information</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          This system-wide report provides a comprehensive overview of all teams and their activities across your organization. 
          Click on any team card to view detailed activity reports for that specific team and monitor productivity metrics.
        </p>
      </div>
    </div>
  );
}
