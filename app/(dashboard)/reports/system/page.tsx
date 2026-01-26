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

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setMonthPeriod = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDateStr = formatLocalDate(firstDay);
    const endDateStr = formatLocalDate(lastDay);
    setStartDate(startDateStr);
    setEndDate(endDateStr);
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) setMonthPeriod(11, selectedYear - 1);
    else setMonthPeriod(selectedMonth - 1, selectedYear);
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) setMonthPeriod(0, selectedYear + 1);
    else setMonthPeriod(selectedMonth + 1, selectedYear);
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
      const response = await reportingAPI.getSystemReport({ startDate, endDate });
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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
        <p className="text-gray-500 font-bold text-lg">Aggregating system data...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Report Not Found</h2>
        <button onClick={() => window.location.href = '/reports'} className="text-indigo-600 font-bold hover:underline">Go Back</button>
      </div>
    );
  }

  const completionRate = report.systemStats.totalActivities > 0
    ? ((report.systemStats.totalActivities -
      report.teams.reduce((sum, t) => sum + t.stats.blockedTasks, 0)) /
      report.systemStats.totalActivities * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Navigation & Header */}
        <div className="space-y-6">
          <Link href="/reports" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Reports
          </Link>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">System Report</h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-500 font-medium">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Organization Overview
                  </span>
                  <span className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {getCurrentMonthLabel()}
                  </span>
                </div>
              </div>

              {/* Compact Controls */}
              <div className="flex gap-3 bg-gray-50 p-2 rounded-2xl">
                <button onClick={goToPreviousMonth} className="px-4 py-2 hover:bg-white hover:shadow-sm rounded-xl transition-all font-bold text-gray-500 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setMonthPeriod(parseInt(e.target.value), selectedYear)}
                    className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
                  >
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setMonthPeriod(selectedMonth, parseInt(e.target.value))}
                    className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button onClick={goToNextMonth} className="px-4 py-2 hover:bg-white hover:shadow-sm rounded-xl transition-all font-bold text-gray-500 hover:text-gray-900">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">👥</div>
              </div>
              <div className="text-4xl font-black text-gray-900 mb-1">{report.systemStats.totalTeams}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Teams</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">👤</div>
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">Total</span>
              </div>
              <div className="text-4xl font-black text-gray-900 mb-1">{report.systemStats.totalMembers}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Members</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-2xl">📋</div>
                <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded">{completionRate}% Done</span>
              </div>
              <div className="text-4xl font-black text-gray-900 mb-1">{report.systemStats.totalActivities}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Activities</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">🏠</div>
              </div>
              <div className="text-4xl font-black text-gray-900 mb-1">{report.systemStats.totalWfhDays}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">WFH Days Used</div>
            </div>
          </div>
        </div>

        {/* Detailed Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Performance Breakdown */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
              Team Breakdown
            </h2>

            <div className="space-y-4">
              {report.teams
                .sort((a, b) => b.stats.totalActivities - a.stats.totalActivities)
                .map((team, idx) => {
                  const teamRate = team.stats.totalActivities > 0
                    ? ((team.stats.totalActivities - team.stats.blockedTasks) / team.stats.totalActivities * 100).toFixed(0)
                    : '0';
                  return (
                    <Link
                      key={team.teamId}
                      href={`/reports/activity?teamId=${team.teamId}`}
                      className="group flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-bold group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{team.teamName}</h3>
                          <p className="text-xs font-medium text-gray-500">{team.memberCount} Members</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-black text-gray-900">{team.stats.totalActivities}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">Tasks</div>
                        </div>
                        <div className="text-right w-16">
                          <div className={`font-black ${parseInt(teamRate) > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{teamRate}%</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">Rate</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* Metrics Overview Card */}
          <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-6">Metrics Summary</h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 font-medium">Avg Team Size</span>
                    <span className="text-2xl font-bold">
                      {(report.systemStats.totalMembers / Math.max(1, report.systemStats.totalTeams)).toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/2 rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 font-medium">Avg Tasks / Member</span>
                    <span className="text-2xl font-bold">
                      {(report.systemStats.totalActivities / Math.max(1, report.systemStats.totalMembers)).toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-3/4 rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-400 font-medium">WFH Utilization</span>
                    <span className="text-2xl font-bold">
                      {((report.systemStats.totalWfhDays / report.systemStats.totalActivities) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-1/4 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm text-gray-300 leading-relaxed">
                  <span className="text-blue-400 font-bold">Insight:</span> The organization is maintaining a healthy task completion rate of <span className="text-white font-bold">{completionRate}%</span>.
                  Review individual team reports to identify bottlenecks.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
