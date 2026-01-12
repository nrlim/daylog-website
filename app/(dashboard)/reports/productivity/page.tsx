'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { reportingAPI, api } from '@/lib/api';

interface ProductivityMetrics {
  option1: {
    score: number;
    label: string;
    description?: string;
  };
  option2: {
    score: number;
    label: string;
    description?: string;
  };
  option3: {
    score: number;
    label: string;
    description?: string;
    daylogDurations: Array<{ duration: number; isCompleted: boolean }>;
    redmineDurations: Array<{ duration: number; isCompleted: boolean }>;
    avgDaylogDuration: number;
    avgRedmineDuration: number;
    timeEfficiencyScore: number;
  };
  finalScore?: {
    score: number;
    label: string;
    description?: string;
    weights?: { completionRate: number; weighted: number; efficiency: number };
  };
}

interface MemberMetrics {
  memberId: string;
  username: string;
  role: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    blockedTasks: number;
    completionRate: number;
    wfhDays: number;
    avgTasksPerDay: string;
  };
  dbTasks: {
    total: number;
    completed: number;
    blocked: number;
  };
  redmineStats: {
    assignedIssues: number;
    newIssues: number;
    inProgressIssues: number;
    closedIssues: number;
  };
  productivityScore: number;
  productivityMetrics?: ProductivityMetrics;
}

interface ProductivityReportData {
  team: {
    id: string;
    name: string;
    wfhLimitPerMonth?: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  members: MemberMetrics[];
  memberProductivity?: MemberMetrics[];
  topPerformers?: MemberMetrics[];
}

export default function ProductivityReportPage() {
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('teamId');

  const [report, setReport] = useState<ProductivityReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10; // Show 10 team members per page

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

  // Initialize with current month dates
  useEffect(() => {
    const now = new Date();
    setMonthPeriod(now.getMonth(), now.getFullYear());
  }, []);

  useEffect(() => {
    loadReport();
  }, [teamId, startDate, endDate]);

  const loadReport = useCallback(async () => {
    if (!teamId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const response = await reportingAPI.getProductivityReport(teamId, {
        startDate,
        endDate,
      });

      // Transform response data to calculate top performers
      const reportData = response.data;
      const members = (reportData.memberProductivity || reportData.members || []).map((m: any) => {
        const stats = m.stats || {
          totalTasks: m.totalTasks || 0,
          completedTasks: m.completedTasks || 0,
          inProgressTasks: m.inProgressTasks || 0,
          blockedTasks: m.blockedTasks || 0,
          completionRate: m.completionRate || 0,
        };

        // Use final score if available, otherwise fall back to option1
        const primaryScore = m.productivityMetrics?.finalScore?.score ||
          m.productivityMetrics?.option1?.score ||
          parseFloat(m.completionRate || stats?.completionRate || '0');

        return {
          ...m,
          metrics: {
            ...stats,
            wfhDays: m.metrics?.wfhDays || 0,
            avgTasksPerDay: m.metrics?.avgTasksPerDay || '0',
          },
          dbTasks: {
            total: stats.totalTasks,
            completed: stats.completedTasks,
            inProgress: stats.inProgressTasks,
            blocked: stats.blockedTasks,
          },
          redmineStats: m.redmineStats || {
            assignedIssues: 0,
            newIssues: 0,
            inProgressIssues: 0,
            closedIssues: 0,
          },
          productivityMetrics: m.productivityMetrics || undefined,
          productivityScore: primaryScore,
        };
      });
      const topPerformers = [...members]
        .sort((a: any, b: any) => b.productivityScore - a.productivityScore)
        .slice(0, 3);

      setReport({
        ...reportData,
        topPerformers,
        members: members
      });
      setCurrentPage(1); // Reset to first page on new report
    } catch (error) {
      console.error('Failed to load productivity report:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load productivity report',
      });
    } finally {
      setLoading(false);
    }
  }, [teamId, startDate, endDate, addNotification]);

  const getProductivityColor = useCallback((score: number) => {
    // Elegant color scheme with indigo primary, amber secondary
    if (score >= 80) return 'text-indigo-700';
    if (score >= 60) return 'text-indigo-600';
    if (score >= 40) return 'text-amber-600';
    if (score >= 20) return 'text-amber-500';
    return 'text-slate-600';
  }, []);

  const getProductivityBg = useCallback((score: number) => {
    // Subtle backgrounds with color-coded hints
    if (score >= 80) return 'bg-indigo-50 border-indigo-200';
    if (score >= 60) return 'bg-indigo-50 border-indigo-100';
    if (score >= 40) return 'bg-amber-50 border-amber-100';
    if (score >= 20) return 'bg-amber-50 border-amber-100';
    return 'bg-white border-slate-100';
  }, []);

  // Memoize the scoring information to prevent recomputation
  const scoringInfo = useMemo(() => ({
    option1: {
      label: 'Combined Completion Rate (Redmine Focus)',
      formula: 'If no Daylog: 100% Redmine Rate | If Daylog exists: (75% × Redmine Rate) + (25% × Daylog Rate)',
      description: 'Prioritizes Redmine work. If no Daylog tasks, trusts Redmine completely. If Daylog exists, gives Redmine 75% weight and Daylog 25% weight.',
    },
    option2: {
      label: 'Weighted Performance Score (Balanced)',
      formula: 'If no Daylog: 100% Redmine Rate | If Daylog exists: (50% × Redmine Rate) + (50% × Daylog Rate)',
      description: 'Balanced view combining Redmine (50%) and Daylog (50%) completion rates equally when both exist.',
    },
    option3: {
      label: 'Time-based Efficiency',
      formula: 'Tasks Completed / Working Days × 25 (where 4 tasks/day = 100 points)',
      description: 'Measures task completion velocity based on time spent. Calculated as (Completed Tasks / Total Working Days) normalized to 0-100, assuming 4 tasks per working day equals perfect efficiency',
    },
    final: {
      label: 'Final Productivity Score',
      formula: 'Same as Option 1/2: If no Daylog: 100% Redmine | If Daylog: (50% Redmine) + (50% Daylog)',
      description: 'Uses the combined completion rate as the primary score. Defaults to Redmine-only when no Daylog tasks, otherwise balances both systems equally',
    },
  }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-slate-700 font-semibold">Loading productivity report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">Report Not Found</h1>
        <p className="text-slate-600 mt-2">Unable to load the productivity report</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Productivity & Performance Report
            </h1>
            <p className="text-slate-300 mt-2">
              Team: <strong>{report.team.name}</strong> | Period: <strong>{getCurrentMonthLabel()}</strong> ({startDate} to {endDate})
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
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Select Report Period</h3>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={goToPreviousMonth}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors font-semibold"
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
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors font-semibold"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Or Select Custom Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">End Date</label>
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

      {/* Top Performers */}
      {(report.topPerformers && report.topPerformers.length > 0) && (
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Top Performers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {report.topPerformers.map((member, idx) => (
              <div key={member.memberId} className={`rounded-lg shadow border overflow-hidden transition-shadow hover:shadow-md ${idx === 0 ? 'bg-white border-slate-200 border-t-4 border-t-slate-800' :
                idx === 1 ? 'bg-white border-slate-200' :
                  'bg-white border-slate-200'
                }`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-600 mb-1">#{idx + 1}</div>
                      <h3 className="text-lg font-bold text-slate-900">{member.username}</h3>
                    </div>
                    <div></div>
                  </div>
                  <div className={`text-4xl font-bold mb-2 ${getProductivityColor(member.productivityScore)}`}>
                    {member.productivityScore.toFixed(1)}
                  </div>
                  <p className="text-sm text-slate-600 font-medium mb-4">Productivity Score</p>
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
                    <div>
                      <div className="text-lg font-bold text-slate-900">{member.metrics.completedTasks}</div>
                      <div className="text-xs text-slate-600">Completed</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{Math.min(100, member.metrics.completionRate).toFixed(1)}%</div>
                      <div className="text-xs text-slate-600">Completion</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{member.metrics.totalTasks}</div>
                      <div className="text-xs text-slate-600">Total Tasks</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-900">{member.metrics.blockedTasks}</div>
                      <div className="text-xs text-slate-600">Blocked</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Members Productivity with Pagination */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Team Productivity
        </h2>

        {/* Pagination Info and Controls */}
        {report.members && report.members.length > ITEMS_PER_PAGE && (
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, report.members.length)} of {report.members.length} team members
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {report.members
            .sort((a, b) => b.productivityScore - a.productivityScore)
            .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
            .map((member) => (
              <div
                key={member.memberId}
                className={`rounded-lg shadow border overflow-hidden transition-all hover:shadow-md ${member.productivityScore >= 80 ? 'bg-slate-50 border-slate-200' :
                  'bg-white border-slate-100'
                  }`}
              >
                <div className="p-6">
                  {/* Header with member info and score */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow bg-gradient-to-br from-indigo-600 to-indigo-700`}>
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900">{member.username}</h3>
                        <p className="text-sm text-slate-600">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getProductivityColor(member.productivityScore)}`}>
                        {Math.min(100, member.productivityScore).toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Score</div>
                    </div>
                  </div>

                  {/* Completion Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Task Completion Rate</span>
                      <span className="text-sm font-bold text-slate-900">{Math.min(100, member.metrics.completionRate).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all bg-indigo-700`}
                        style={{ width: `${Math.min(100, member.metrics.completionRate)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl font-bold text-slate-900">{member.metrics.totalTasks}</div>
                      <div className="text-xs text-slate-600 font-medium">Total</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl font-bold text-slate-900">{member.metrics.completedTasks}</div>
                      <div className="text-xs text-slate-600 font-medium">Completed</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl font-bold text-slate-900">{member.redmineStats.inProgressIssues}</div>
                      <div className="text-xs text-slate-600 font-medium">In Progress</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl font-bold text-slate-900">{member.metrics.blockedTasks}</div>
                      <div className="text-xs text-slate-600 font-medium">Blocked</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-2xl font-bold text-slate-900">{member.metrics.avgTasksPerDay}</div>
                      <div className="text-xs text-slate-600 font-medium">Tasks/Day</div>
                    </div>
                  </div>

                  {/* WFH Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-100">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-1">WFH Status</div>
                      <div className="flex items-baseline gap-2">
                        <div className={`text-lg font-bold ${member.metrics.wfhDays > (report?.team.wfhLimitPerMonth || 3)
                          ? 'text-red-600'
                          : 'text-purple-600'
                          }`}>
                          {member.metrics.wfhDays} days
                        </div>
                        <div className="text-xs text-slate-500">
                          / {report?.team.wfhLimitPerMonth || 3} limit
                        </div>
                      </div>
                      {member.metrics.wfhDays > (report?.team.wfhLimitPerMonth || 3) && (
                        <div className="text-xs text-red-600 font-semibold mt-1">
                          Exceeded
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 mb-1">Performance Status</div>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${member.productivityScore >= 80 ? 'bg-green-200 text-green-800' :
                        member.productivityScore >= 60 ? 'bg-blue-200 text-blue-800' :
                          member.productivityScore >= 40 ? 'bg-yellow-200 text-yellow-800' :
                            'bg-red-200 text-red-800'
                        }`}>
                        {member.productivityScore >= 80 ? 'Excellent' :
                          member.productivityScore >= 60 ? 'Good' :
                            member.productivityScore >= 40 ? 'Fair' :
                              'Needs Attention'}
                      </div>
                    </div>
                  </div>

                  {/* Three Productivity Options */}
                  {member.productivityMetrics && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-slate-900 mb-4">
                        Productivity Reporting Options
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Option 1: Weighted Combined Completion Rate */}
                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="mb-3">
                            <h5 className="font-bold text-indigo-900 text-sm">{member.productivityMetrics.option1.label}</h5>
                          </div>
                          <div className="text-3xl font-bold text-indigo-700 mb-2">
                            {member.productivityMetrics.option1.score.toFixed(1)}%
                          </div>
                          <p className="text-xs text-slate-600 mb-3">
                            Weighted: Redmine 75% + Daylog 25%
                          </p>
                          <div className="text-xs bg-white rounded p-2 text-slate-600 border border-indigo-100">
                            <span className="font-semibold">Formula:</span> (Redmine Rate × 0.75) + (Daylog Rate × 0.25)
                          </div>
                        </div>

                        {/* Option 2: Weighted Performance with Redmine Focus */}
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="mb-3">
                            <h5 className="font-bold text-amber-900 text-sm">{member.productivityMetrics.option2.label}</h5>
                          </div>
                          <div className="text-3xl font-bold text-amber-700 mb-2">
                            {member.productivityMetrics.option2.score.toFixed(1)}%
                          </div>
                          <p className="text-xs text-slate-600 mb-3">
                            Emphasizes Redmine with 50% weight vs Daylog 50%
                          </p>
                          <div className="text-xs bg-white rounded p-2 text-slate-600 border border-amber-100">
                            <span className="font-semibold">Formula:</span> (Redmine Rate × 0.50) + (Daylog Rate × 0.50)
                          </div>
                        </div>

                        {/* Option 3: Time-based Efficiency */}
                        <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="mb-3">
                            <h5 className="font-bold text-slate-900 text-sm">{member.productivityMetrics.option3.label}</h5>
                          </div>
                          <div className="text-3xl font-bold text-indigo-700 mb-2">
                            {member.productivityMetrics.option3.score.toFixed(1)}%
                          </div>
                          <p className="text-xs text-slate-600 mb-3">
                            Task completion velocity based on time duration
                          </p>
                          <div className="text-xs bg-indigo-50 rounded p-2 text-slate-600 space-y-1">
                            <div><span className="font-semibold">Daylog Avg:</span> {member.productivityMetrics.option3.avgDaylogDuration.toFixed(0)} min ({(member.productivityMetrics.option3.avgDaylogDuration / 60).toFixed(1)} hrs)</div>
                            <div><span className="font-semibold">Redmine Avg:</span> {member.productivityMetrics.option3.avgRedmineDuration.toFixed(0)} min ({(member.productivityMetrics.option3.avgRedmineDuration / 60).toFixed(1)} hrs)</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold">Recommendation:</span> Choose the option that best fits your evaluation needs. Option 1 is simple, Option 2 balances both systems, and Option 3 focuses on task completion velocity.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Task Breakdown - Database vs Redmine */}
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="font-semibold text-slate-900 mb-3">
                      Task Breakdown by Source
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Database Tasks */}
                      <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3">
                          <h5 className="font-semibold text-slate-900">Daylog Tasks</h5>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Total:</span>
                            <span className="font-bold text-blue-600">{member.dbTasks.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">Completed:</span>
                            <span className="font-bold text-green-600">{member.dbTasks.completed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">Blocked:</span>
                            <span className="font-bold text-red-600">{member.dbTasks.blocked}</span>
                          </div>
                          {member.dbTasks.total > 0 && (
                            <>
                              <div className="pt-2 border-t border-slate-200">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-slate-700 font-medium">Completion Rate:</span>
                                  <span className="font-bold text-slate-900">
                                    {Math.min(100, (member.dbTasks.completed / member.dbTasks.total) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-indigo-700"
                                    style={{ width: `${Math.min(100, (member.dbTasks.completed / member.dbTasks.total) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Redmine Tasks */}
                      <div className="bg-white rounded-lg p-4 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-3">
                          <h5 className="font-semibold text-slate-900">Redmine Issues</h5>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Total:</span>
                            <span className="font-bold text-slate-900">{member.redmineStats.assignedIssues}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">New:</span>
                            <span className="font-bold text-slate-900">{member.redmineStats.newIssues}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">In Progress:</span>
                            <span className="font-bold text-slate-900">{member.redmineStats.inProgressIssues}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-700">Closed:</span>
                            <span className="font-bold text-slate-900">{member.redmineStats.closedIssues}</span>
                          </div>
                          {member.redmineStats.assignedIssues > 0 && (
                            <>
                              <div className="pt-2 border-t border-slate-200">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-slate-700 font-medium">Closure Rate:</span>
                                  <span className="font-bold text-slate-900">
                                    {Math.min(100, (member.redmineStats.closedIssues / member.redmineStats.assignedIssues) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-amber-600"
                                    style={{ width: `${Math.min(100, (member.redmineStats.closedIssues / member.redmineStats.assignedIssues) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </>
                          )}


                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Pagination Controls */}
        {report.members && report.members.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.ceil(report.members.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-semibold transition-colors ${currentPage === pageNum
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(report.members.length / ITEMS_PER_PAGE), currentPage + 1))}
              disabled={currentPage === Math.ceil(report.members.length / ITEMS_PER_PAGE)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Scoring Information */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-3">
          Productivity Score Calculation
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          The productivity score is calculated using a smart weighting system that prioritizes Redmine (office work) data while considering Daylog (home work) activities when available. The system automatically adjusts based on whether team members have Daylog tasks.
        </p>

        <div className="space-y-4 mb-6">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-300 shadow-md">
            <h4 className="font-bold text-indigo-900 mb-2">📊 Final Productivity Score (Recommended)</h4>
            <p className="text-sm text-gray-700 mb-2">
              The primary score for evaluating productivity. Uses a smart weighting system that adapts based on whether team members have Daylog tasks or are Redmine-only.
            </p>
            <div className="text-xs text-gray-600 space-y-2 bg-white bg-opacity-60 p-3 rounded mb-2">
              <div className="font-semibold text-gray-800">Calculation Logic:</div>
              <div>• <strong>If NO Daylog Tasks:</strong> Final Score = 100% × Redmine Completion Rate</div>
              <div>• <strong>If HAS Daylog Tasks:</strong> Final Score = (50% × Redmine Rate) + (50% × Daylog Rate)</div>
            </div>
            <p className="text-xs text-gray-600 mt-2"><strong>Best for:</strong> Overall team member productivity evaluation equalizing both metrics</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Option 1: Combined Completion Rate (Redmine Focus)</h4>
            <p className="text-sm text-gray-700 mb-2">
              Combines completion rates with emphasis on Redmine. Uses 100% Redmine when no Daylog tasks exist, otherwise weights Redmine at 75% and Daylog at 25%.
            </p>
            <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
              If no Daylog: 100% × Redmine Rate | If Daylog: (75% × Redmine) + (25% × Daylog)
            </p>
            <p className="text-xs text-gray-600 mt-2"><strong>Best for:</strong> Primary focus on official office work tracking</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">Option 2: Weighted Performance (Balanced)</h4>
            <p className="text-sm text-gray-700 mb-2">
              Balanced view treating Office (Redmine) and Home (Daylog) work equally. Weights both systems at 50% when both exist.
            </p>
            <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
              If no Daylog: 100% × Redmine Rate | If Daylog: (50% × Redmine) + (50% × Daylog)
            </p>
            <p className="text-xs text-gray-600 mt-2"><strong>Best for:</strong> Teams where WFH output is considered equal to office output</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">Option 3: Time-based Efficiency</h4>
            <p className="text-sm text-gray-700 mb-2">
              Measures task completion velocity by analyzing actual time spent on completed tasks. Normalized to 0-100 where 4 tasks per working day = 100 points (perfect efficiency).
            </p>
            <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2 rounded">
              <div><strong>Calculation:</strong> (Completed Tasks / Total Working Days) × 25</div>
              <div><strong>Daylog:</strong> Measured from start time to completion (updatedAt)</div>
              <div><strong>Redmine:</strong> Measured from creation (created_on) to closure (closed_on)</div>
              <div><strong>Working Day:</strong> 480 minutes (8 hours)</div>
            </div>
            <p className="text-xs text-gray-600 mt-2"><strong>Best for:</strong> Understanding real work velocity and task completion speed</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-700 font-semibold mb-2">Performance Status Levels:</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div className="text-2xl font-bold text-indigo-700">80+</div>
              <div className="text-sm font-medium text-indigo-900">Excellent Performance</div>
              <div className="text-xs text-slate-600 mt-1">Highly productive</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
              <div className="text-2xl font-bold text-indigo-600">60-79</div>
              <div className="text-sm font-medium text-indigo-900">Good Performance</div>
              <div className="text-xs text-slate-600 mt-1">On track</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <div className="text-2xl font-bold text-amber-600">40-59</div>
              <div className="text-sm font-medium text-amber-900">Fair Performance</div>
              <div className="text-xs text-slate-600 mt-1">Needs improvement</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-2xl font-bold text-slate-600">&lt;40</div>
              <div className="text-sm font-medium text-slate-800">Low Performance</div>
              <div className="text-xs text-slate-600 mt-1">Requires attention</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
