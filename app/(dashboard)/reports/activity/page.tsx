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
      case 'Done':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'InProgress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Blocked':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done':
        return '✓';
      case 'InProgress':
        return '⟳';
      case 'Blocked':
        return '✕';
      default:
        return '○';
    }
  };

  const getWfhStatusColor = (wfhDays: number, limit: number) => {
    if (wfhDays > limit) return 'bg-red-50 border-red-200';
    const percentage = (wfhDays / limit) * 100;
    if (percentage >= 90) return 'bg-orange-50 border-orange-200';
    if (percentage >= 75) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getWfhStatusTextColor = (wfhDays: number, limit: number) => {
    if (wfhDays > limit) return 'text-red-700';
    const percentage = (wfhDays / limit) * 100;
    if (percentage >= 90) return 'text-orange-700';
    if (percentage >= 75) return 'text-yellow-700';
    return 'text-green-700';
  };
  
  const getWfhProgressColor = (wfhDays: number, limit: number) => {
    if (wfhDays > limit) return 'bg-red-500';
    const percentage = (wfhDays / limit) * 100;
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-gray-700 font-semibold">Loading activity report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Report Not Found</h1>
        <p className="text-gray-600 mt-2">Unable to load the activity report</p>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <span>📊</span> Activity & Attendance Report
            </h1>
            <p className="text-indigo-100 mt-2">
              Team: <strong>{report.team.name}</strong> | Period: <strong>{getCurrentMonthLabel()}</strong> ({startDate} to {endDate}) | WFH Limit: <strong>{report.team.wfhLimitPerMonth} days/month</strong>
            </p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-indigo-700 font-medium">Total Members</div>
              <div className="text-3xl font-bold text-indigo-600 mt-1">{report.summary.totalMembers}</div>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow p-6 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-amber-700 font-medium">Total Activities</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">{report.summary.totalActivities}</div>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-700 font-medium">Total WFH Days Used</div>
              <div className="text-3xl font-bold text-slate-600 mt-1">{report.summary.totalWfhDays}</div>
            </div>
            <div className="text-3xl">🏠</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow p-6 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-indigo-700 font-medium">Team WFH Quota</div>
              <div className="text-3xl font-bold text-indigo-600 mt-1">{report.team.wfhLimitPerMonth}</div>
              <div className="text-xs text-indigo-700 mt-1">days/member/month</div>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow p-6 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-amber-700 font-medium">Avg Completion</div>
              <div className="text-3xl font-bold text-amber-600 mt-1">{report.summary.averageCompletionRate}%</div>
            </div>
            <div className="text-3xl">✓</div>
          </div>
        </div>
      </div>

      {/* Filter & Sort */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.members.length > 1 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Member</label>
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Members</option>
                {report.members.map((member) => (
                  <option key={member.memberId} value={member.memberId}>
                    {member.username} ({member.stats.totalActivities} activities)
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="activities">Most Activities</option>
              <option value="completion">Highest Completion Rate</option>
              <option value="wfh">Most WFH Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-4">
        {sortedMembers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">No members found</p>
          </div>
        ) : (
          sortedMembers.map((member) => (
            <div key={member.memberId} className={`bg-white rounded-lg shadow overflow-hidden border-l-4 ${
              member.stats.wfhDays > report.team.wfhLimitPerMonth ? 'border-red-500' : 'border-indigo-500'
            }`}>
              {/* Member Header */}
              <button
                onClick={() => toggleMemberExpand(member.memberId)}
                className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  getWfhStatusColor(member.stats.wfhDays, report.team.wfhLimitPerMonth)
                }`}
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{member.username}</h3>
                    <p className="text-sm text-gray-600">{member.email} {member.isLead && '• Team Lead 👔'}</p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="hidden lg:flex items-center gap-6 mr-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-indigo-600">{member.stats.totalActivities}</div>
                    <div className="text-xs text-gray-600">Activities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-amber-600">{member.stats.completedTasks}</div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-amber-600">{member.stats.completionRate}%</div>
                    <div className="text-xs text-gray-600">Rate</div>
                  </div>
                  <div className={`text-center ${getWfhStatusTextColor(member.stats.wfhDays, report.team.wfhLimitPerMonth)}`}>
                    <div className="text-xl font-bold">{member.stats.wfhDays}</div>
                    <div className="text-xs">/ {report.team.wfhLimitPerMonth} WFH Days</div>
                    {member.stats.wfhDays > report.team.wfhLimitPerMonth && (
                      <div className="text-xs font-semibold text-red-600">⚠️ Exceeded</div>
                    )}
                  </div>
                </div>

                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform hidden md:block`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Member Details */}
              {expandedMembers.has(member.memberId) && (
                <div className="border-t border-gray-200 px-6 py-6 bg-gray-50 space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Activities</div>
                      <div className="text-2xl font-bold text-indigo-600 mt-2">{member.stats.totalActivities}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Completed</div>
                      <div className="text-2xl font-bold text-amber-600 mt-2">{member.stats.completedTasks}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">In Progress</div>
                      <div className="text-2xl font-bold text-yellow-600 mt-2">{member.stats.inProgressTasks}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Blocked</div>
                      <div className="text-2xl font-bold text-red-600 mt-2">{member.stats.blockedTasks}</div>
                    </div>
                    <div className={`rounded-lg p-4 shadow-sm border-2 ${
                      member.stats.wfhDays > report.team.wfhLimitPerMonth 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">WFH Days</div>
                        <div className={`text-xs font-bold px-2 py-1 rounded ${
                          member.stats.wfhDays > report.team.wfhLimitPerMonth 
                            ? 'bg-red-200 text-red-700' 
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {((member.stats.wfhDays / report.team.wfhLimitPerMonth) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className={`text-2xl font-bold mt-2 ${
                        member.stats.wfhDays > report.team.wfhLimitPerMonth ? 'text-red-600' : 'text-purple-600'
                      }`}>
                        {member.stats.wfhDays} / {report.team.wfhLimitPerMonth}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${getWfhProgressColor(member.stats.wfhDays, report.team.wfhLimitPerMonth)}`}
                          style={{ width: `${Math.min((member.stats.wfhDays / report.team.wfhLimitPerMonth) * 100, 100)}%` }}
                        />
                      </div>
                      {member.stats.wfhDays > report.team.wfhLimitPerMonth && (
                        <div className="text-xs font-bold text-red-600 mt-2">
                          ⚠️ +{member.stats.wfhDays - report.team.wfhLimitPerMonth} over limit
                        </div>
                      )}
                      {member.stats.wfhDays > 0 && member.stats.wfhDays <= report.team.wfhLimitPerMonth && (
                        <div className="text-xs font-semibold text-green-600 mt-2">
                          ✓ {report.team.wfhLimitPerMonth - member.stats.wfhDays} days remaining
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Completion Rate Bar */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Completion Rate</span>
                      <span className="text-lg font-bold text-orange-600">{member.stats.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all"
                        style={{ width: `${member.stats.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Recent Activities */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span>📋</span> Recent Activities ({member.activities.length} total)
                    </h4>
                    {member.activities.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {member.activities.slice(0, 15).map((activity) => (
                          <div key={activity.id} className={`p-3 rounded-lg border-l-4 flex items-start gap-3 ${getStatusColor(activity.status)}`}>
                            <span className="text-lg font-bold mt-0.5">{getStatusIcon(activity.status)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium break-words">{activity.subject}</p>
                              <p className="text-xs mt-1 opacity-75">
                                {new Date(activity.date).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                                {activity.isWfh && ' • 🏠 Work From Home'}
                                {activity.project && ` • 📦 ${activity.project}`}
                                {activity.time && ` • ${activity.time}`}
                              </p>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded whitespace-nowrap">{activity.status}</span>
                          </div>
                        ))}
                        {member.activities.length > 15 && (
                          <p className="text-xs text-gray-600 text-center py-3 font-semibold">
                            ... and {member.activities.length - 15} more activities
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-6 bg-white rounded-lg">No activities found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
