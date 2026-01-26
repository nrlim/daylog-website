'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { reportingAPI } from '@/lib/api';

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
  const ITEMS_PER_PAGE = 10;

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
      const response = await reportingAPI.getProductivityReport(teamId, { startDate, endDate });
      const reportData = response.data;
      const members = (reportData.memberProductivity || reportData.members || []).map((m: any) => {
        const stats = m.stats || {
          totalTasks: m.totalTasks || 0,
          completedTasks: m.completedTasks || 0,
          inProgressTasks: m.inProgressTasks || 0,
          blockedTasks: m.blockedTasks || 0,
          completionRate: m.completionRate || 0,
        };

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
      setCurrentPage(1);
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
    if (score >= 80) return 'text-violet-600';
    if (score >= 60) return 'text-indigo-600';
    if (score >= 40) return 'text-amber-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-gray-600';
  }, []);

  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-black uppercase">Excellent</span>;
    if (score >= 60) return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase">Good</span>;
    if (score >= 40) return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-black uppercase">Fair</span>;
    return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-black uppercase">Needs Imp.</span>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-amber-500 rounded-full animate-spin mb-6"></div>
        <p className="text-gray-500 font-bold text-lg">Calculating productivity metrics...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Report Not Found</h2>
        <button onClick={() => window.location.href = '/reports'} className="text-amber-600 font-bold hover:underline">Go Back</button>
      </div>
    );
  }

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
                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Productivity Report</h1>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-500 font-medium">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    {report.team.name}
                  </span>
                  <span className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
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

        {/* Top Performers Section */}
        {(report.topPerformers && report.topPerformers.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {report.topPerformers.map((member, idx) => (
              <div key={member.memberId} className={`relative bg-white rounded-3xl p-8 border hover:-translate-y-1 transition-transform duration-300 ${idx === 0
                ? 'shadow-2xl shadow-amber-500/20 border-amber-200 z-10 scale-105'
                : 'shadow-xl shadow-gray-100/50 border-gray-100'
                }`}>
                {idx === 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/30">
                    Top Performer
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 relative">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-lg ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                      idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' :
                        'bg-gradient-to-br from-orange-300 to-orange-400'
                      }`}>
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                      #{idx + 1}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.username}</h3>
                  <div className={`text-4xl font-black mb-4 ${getProductivityColor(member.productivityScore)}`}>
                    {member.productivityScore.toFixed(1)}
                  </div>

                  <div className="w-full grid grid-cols-2 gap-2 text-left bg-gray-50 rounded-xl p-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Tasks</p>
                      <p className="font-bold text-gray-900">{member.metrics.completedTasks}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Rate</p>
                      <p className="font-bold text-gray-900">{Math.min(100, member.metrics.completionRate).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team Productivity List */}
        <div>
          <div className="flex justify-between items-center mb-6 px-2">
            <h2 className="text-xl font-black text-gray-900">Team Performance</h2>
            <div className="text-sm font-medium text-gray-500">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, report.members.length)} of {report.members.length} members
            </div>
          </div>

          <div className="space-y-6">
            {report.members
              .sort((a, b) => b.productivityScore - a.productivityScore)
              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
              .map((member) => (
                <div key={member.memberId} className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden p-6 lg:p-8 hover:-translate-y-1 transition-all duration-300">
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Member Basic Info */}
                    <div className="flex items-start gap-4 lg:w-1/4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-600 font-black text-lg">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{member.username}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase mt-1">{member.role}</p>
                        <div className="mt-2">
                          {getPerformanceBadge(member.productivityScore)}
                        </div>
                      </div>
                    </div>

                    {/* Scores & Stats */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Score */}
                      <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
                        <p className="text-xs font-bold text-violet-400 uppercase mb-1">Productivity Score</p>
                        <p className="text-3xl font-black text-violet-600">{member.productivityScore.toFixed(1)}</p>
                      </div>

                      {/* Completion */}
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-xs font-bold text-gray-400 uppercase">Completion Rate</p>
                          <p className="text-sm font-black text-gray-900">{Math.min(100, member.metrics.completionRate).toFixed(1)}%</p>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, member.metrics.completionRate)}%` }}></div>
                        </div>
                        <div className="flex gap-3 mt-3 text-xs font-medium text-gray-500">
                          <span>{member.metrics.completedTasks} Done</span>
                          <span>•</span>
                          <span>{member.metrics.totalTasks} Total</span>
                        </div>
                      </div>

                      {/* Task Sources */}
                      <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 p-3 rounded-xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Redmine (Office)</p>
                          <div className="flex justify-between items-end">
                            <span className="font-bold text-gray-900">{member.redmineStats.closedIssues}/{member.redmineStats.assignedIssues}</span>
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Issues</span>
                          </div>
                        </div>
                        <div className="bg-white border border-gray-200 p-3 rounded-xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Daylog (WFH)</p>
                          <div className="flex justify-between items-end">
                            <span className="font-bold text-gray-900">{member.dbTasks.completed}/{member.dbTasks.total}</span>
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Tasks</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Metrics / Options (If available) */}
                  {member.productivityMetrics && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-900 rounded-full"></span>
                        Detailed Scoring Breakdown
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Option 1: Weighted</p>
                          <p className="text-xl font-black text-gray-900">{member.productivityMetrics.option1.score.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">Redmine (75%) + Daylog (25%). Best for office-first workflows.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Option 2: Balanced</p>
                          <p className="text-xl font-black text-gray-900">{member.productivityMetrics.option2.score.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">Equal weight (50/50). Good for hybrid work verification.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Option 3: Velocity</p>
                          <p className="text-xl font-black text-gray-900">{member.productivityMetrics.option3.score.toFixed(1)}%</p>
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">Based on time tracking & efficiency. Speed of completion.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {/* Pagination */}
          {report.members && report.members.length > ITEMS_PER_PAGE && (
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-6 py-2 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(report.members.length / ITEMS_PER_PAGE), currentPage + 1))}
                disabled={currentPage === Math.ceil(report.members.length / ITEMS_PER_PAGE)}
                className="px-6 py-2 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
