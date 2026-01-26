'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { reportingAPI } from '@/lib/api';

interface Member {
  memberId: string;
  username: string;
  email: string;
  role: string;
  isLead: boolean;
  stats: {
    totalActivities: number;
    wfhDays: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    completionRate: string;
  };
  activities: any[];
}

interface ReportData {
  team: {
    id: string;
    name: string;
    wfhLimitPerMonth: number;
  };
  members: Member[];
  summary: {
    totalMembers: number;
    totalActivities: number;
    totalWfhDays: number;
    averageCompletionRate: string;
  };
}

export default function ActivityReportPage() {
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId');

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [filterMember, setFilterMember] = useState<string>('');
  const [sortBy, setSortBy] = useState<'activities' | 'completion' | 'wfh'>('activities');
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

  // Initialize with current month dates
  useEffect(() => {
    const now = new Date();
    setMonthPeriod(now.getMonth(), now.getFullYear());
  }, []);

  useEffect(() => {
    loadReport();
  }, [teamId, startDate, endDate]);

  const loadReport = async () => {
    if (!teamId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const response = await reportingAPI.getTeamActivityReport(teamId, {
        startDate,
        endDate,
      });
      setReport(response.data);
    } catch (error) {
      console.error('Failed to load report:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load activity report',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthLabel = () => {
    if (!startDate) return '';
    const date = new Date(startDate);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const toggleMemberExpand = (memberId: string) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'InProgress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Blocked': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return '✓';
      case 'InProgress': return '⟳';
      case 'Blocked': return '✕';
      default: return '○';
    }
  };

  const getWfhProgressColor = (wfhDays: number, limit: number) => {
    if (wfhDays > limit) return 'bg-gradient-to-r from-red-500 to-red-600';
    const percentage = (wfhDays / limit) * 100;
    if (percentage >= 90) return 'bg-gradient-to-r from-orange-400 to-orange-500';
    if (percentage >= 75) return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-purple-600 rounded-full animate-spin mb-6"></div>
        <p className="text-gray-500 font-bold text-lg">Loading activity report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Report Not Found</h2>
        <button onClick={() => window.location.href = '/reports'} className="text-purple-600 font-bold hover:underline">Go Back</button>
      </div>
    );
  }

  const filteredMembers = filterMember
    ? report.members.filter(m => m.memberId === filterMember)
    : report.members;

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case 'completion':
        return parseFloat(b.stats.completionRate) - parseFloat(a.stats.completionRate);
      case 'wfh':
        return b.stats.wfhDays - a.stats.wfhDays;
      case 'activities':
      default:
        return b.stats.totalActivities - a.stats.totalActivities;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Navigation & Header */}
        <div className="space-y-6">
          <Link href="/reports" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Reports
          </Link>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Activity Report</h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-500 font-medium">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    {report.team.name}
                  </span>
                  <span className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
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

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Members', value: report.summary.totalMembers, icon: '👥', color: 'blue' },
            { label: 'Total Activities', value: report.summary.totalActivities, icon: '📋', color: 'indigo' },
            { label: 'WFH Days Used', value: report.summary.totalWfhDays, icon: '🏠', color: 'purple' },
            { label: 'Avg Completion', value: `${report.summary.averageCompletionRate}%`, icon: '📈', color: 'emerald' },
          ].map((metric, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/50">
              <div className="flex justify-between items-start mb-4">
                <span className="text-4xl">{metric.icon}</span>
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">{metric.label}</div>
            </div>
          ))}
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-col sm:flex-row gap-4">
          {report.members.length > 1 && (
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
            >
              <option value="">All Members</option>
              {report.members.map(m => (
                <option key={m.memberId} value={m.memberId}>{m.username}</option>
              ))}
            </select>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm"
          >
            <option value="activities">Sort: Most Activities</option>
            <option value="completion">Sort: Highest Completion</option>
            <option value="wfh">Sort: Most WFH Days</option>
          </select>
        </div>

        {/* Team Members List */}
        <div className="space-y-6">
          {sortedMembers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold text-lg">No members found matching your criteria</p>
            </div>
          ) : (
            sortedMembers.map((member) => (
              <div key={member.memberId} className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden transition-transform hover:scale-[1.01] duration-300">
                <div
                  onClick={() => toggleMemberExpand(member.memberId)}
                  className="p-6 lg:p-8 cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                    {/* Member Profile */}
                    <div className="flex items-center gap-5 min-w-[240px]">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/20">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900">{member.username}</h3>
                        {member.isLead && <span className="inline-block mt-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">Team Lead</span>}
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <div className="text-2xl font-black text-gray-900">{member.stats.totalActivities}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase">Total Activities</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-gray-900">{member.stats.completionRate}%</div>
                        <div className="text-xs font-bold text-gray-400 uppercase">Completion Rate</div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase">WFH Usage</span>
                          <span className={`text-xs font-black ${member.stats.wfhDays > report.team.wfhLimitPerMonth ? 'text-red-500' : 'text-gray-900'}`}>
                            {member.stats.wfhDays} / {report.team.wfhLimitPerMonth} Days
                          </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getWfhProgressColor(member.stats.wfhDays, report.team.wfhLimitPerMonth)}`}
                            style={{ width: `${Math.min((member.stats.wfhDays / report.team.wfhLimitPerMonth) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 ${expandedMembers.has(member.memberId) ? 'rotate-180 bg-gray-200' : 'bg-gray-100'}`}>
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed View */}
                {expandedMembers.has(member.memberId) && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6 lg:p-8 animate-in slide-in-from-top-4 duration-300">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Breakdown Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                          <div className="text-3xl font-black text-emerald-500 mb-1">{member.stats.completedTasks}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase">Completed</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                          <div className="text-3xl font-black text-amber-500 mb-1">{member.stats.inProgressTasks}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase">In Progress</div>
                        </div>
                      </div>

                      {/* Activity Feed */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          Recent Activity
                          <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{member.activities.length}</span>
                        </h4>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {member.activities.length > 0 ? (
                            member.activities.map((activity) => (
                              <div key={activity.id} className="bg-white p-4 rounded-2xl border border-gray-100 relative group">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-bold text-gray-800 text-sm mb-1">{activity.subject}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-medium">
                                      <span>{new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                      {activity.isWfh && <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Home</span>}
                                      {activity.project && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{activity.project}</span>}
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-black uppercase ${getStatusColor(activity.status)}`}>
                                    {activity.status}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-400 font-bold text-center py-4">No recent activities logged.</p>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
