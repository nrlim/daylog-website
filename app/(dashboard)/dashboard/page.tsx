'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { activityAPI, teamAPI, api } from '@/lib/api';
import { Activity } from '@/types';

interface TopPerformer {
  id: string;
  userId: string;
  rank: number;
  user: {
    username: string;
    profilePicture?: string;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const [userActivities, setUserActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [wfhUsage, setWfhUsage] = useState<{
    team?: { used: number; limit: number; remaining: number };
    personal?: { total: number; used: number; remaining: number };
    summary?: { totalUsed: number; totalAvailable: number };
  } | null>(null);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loadingPerformers, setLoadingPerformers] = useState(true);

  useEffect(() => {
    loadUserTeams();
    loadUserActivities();
    loadTopPerformers();
  }, [user?.id]);

  const loadTopPerformers = async () => {
    try {
      setLoadingPerformers(true);
      const response = await api.get('/top-performers');
      // Handle variable API response structure
      const data = response.data;
      if (Array.isArray(data)) {
        setTopPerformers(data);
      } else if (data && Array.isArray(data.topPerformers)) {
        setTopPerformers(data.topPerformers);
      } else if (data && Array.isArray(data.data)) {
        setTopPerformers(data.data);
      } else {
        console.warn('Unexpected top performers response format:', data);
        setTopPerformers([]);
      }
    } catch (error) {
      console.error('Failed to fetch top performers:', error);
      setTopPerformers([]);
    } finally {
      setLoadingPerformers(false);
    }
  };

  const loadUserTeams = async () => {
    try {
      const response = await teamAPI.getTeams();
      const teams = response.data.teams;
      setUserTeams(teams);
      // Load WFH usage for first team
      if (teams.length > 0) {
        try {
          const wfhResponse = await teamAPI.getWfhUsage(teams[0].id);
          // API returns { team: {...}, personal: {...}, summary: {...} }
          setWfhUsage(wfhResponse.data);
        } catch (wfhError) {
          console.error('Failed to load WFH usage:', wfhError);
          // Set default values if fetch fails
          setWfhUsage(null);
        }
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadUserActivities = async () => {
    setLoading(true);
    try {
      const response = await activityAPI.getActivities();
      setUserActivities(response.data.activities);
    } catch (error) {
      console.error('Failed to load user activities:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load activities',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-green-100 text-green-800 border-green-300';
      case 'InProgress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Blocked': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-orange-400 to-orange-600';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'InProgress':
        return (
          <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          </svg>
        );
      case 'Blocked':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-gray-500 mt-1 font-medium">
              Welcome back, <span className="text-gray-900 font-bold">{user?.username}</span>. Here is your daily overview.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/activities"
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              View All Activities
            </Link>
            <Link
              href="/activities/create"
              className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Log Activity
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Stats & Quota */}
          <div className="space-y-8 lg:col-span-2">

            {/* WFH Quota Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Quota Card */}
              <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 relative overflow-hidden group hover:border-purple-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-24 h-24 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="p-2 bg-purple-50 rounded-lg text-purple-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </span>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Team Quota</h3>
                  </div>

                  {wfhUsage?.team ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-gray-900">{wfhUsage.team.remaining}</span>
                        <span className="text-sm font-medium text-gray-500">days left</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(((wfhUsage.team.used) / (wfhUsage.team.limit || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-gray-400 mt-2">
                        <span>Used: {wfhUsage.team.used}</span>
                        <span>Limit: {wfhUsage.team.limit}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-16 flex items-center text-gray-400 text-sm">Loading usage data...</div>
                  )}
                </div>
              </div>

              {/* Personal Quota Card */}
              <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 relative overflow-hidden group hover:border-blue-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-24 h-24 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </span>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Personal Quota</h3>
                  </div>

                  {wfhUsage?.personal ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-gray-900">{wfhUsage.personal.remaining}</span>
                        <span className="text-sm font-medium text-gray-500">days left</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(((wfhUsage.personal.used) / (wfhUsage.personal.total || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs font-medium text-gray-400 mt-2">
                        <span>Used: {wfhUsage.personal.used}</span>
                        <span>Total: {wfhUsage.personal.total}</span>
                      </div>
                    </div>
                  ) : (wfhUsage?.summary ? (
                    // Fallback for old data structure if needed, or just show 0
                    <div className="h-16 flex items-center text-gray-400 text-sm">No personal quota</div>
                  ) : (
                    <div className="h-16 flex items-center text-gray-400 text-sm">Loading usage data...</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions for Admin (using new style) */}
            {user?.role === 'admin' && (
              <div className="grid grid-cols-2 gap-6">
                <Link href="/teams" className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Manage Teams</div>
                    <div className="text-xs text-gray-500">View and edit team structures</div>
                  </div>
                </Link>
                <Link href="/users" className="bg-white p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Manage Users</div>
                    <div className="text-xs text-gray-500">Add or remove system users</div>
                  </div>
                </Link>
              </div>
            )}

            {/* Recent Activity Table */}
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Your Recent Activity</h3>
                {loading && <div className="text-xs text-gray-400 font-medium">Updating...</div>}
              </div>

              {userActivities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Project</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Task</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {userActivities
                        .filter(a => a.userId === user?.id)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, 5)
                        .map((activity) => (
                          <tr key={activity.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">
                                  {new Date(activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-xs text-gray-500">{activity.time}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${activity.project === 'Others' ? 'bg-gray-400' : 'bg-indigo-500'}`}></span>
                                <span className="text-sm font-semibold text-gray-700">{activity.project === 'Others' ? 'Custom' : activity.project}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 font-medium truncate max-w-[200px]">{activity.subject}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">{activity.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${activity.status === 'Done' ? 'bg-green-100 text-green-700' :
                                activity.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                {activity.status === 'Done' ? 'Completed' : activity.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <p>No recent activity found. Start by logging your work!</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Top Performers */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 h-full">
              <h3 className="font-bold text-gray-900 text-lg mb-6 flex items-center gap-2">
                <span className="text-yellow-500">🏆</span> top performers
              </h3>

              {loadingPerformers ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>)}
                </div>
              ) : (
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={performer.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      <div className={`
                             w-8 h-8 flex items-center justify-center rounded-full font-black text-sm
                             ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}
                          `}>
                        {index + 1}
                      </div>

                      {performer.user.profilePicture ? (
                        <img src={performer.user.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm">
                          {performer.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 truncate">
                          {performer.user.username}
                          {user?.id === performer.userId && <span className="ml-2 text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded">YOU</span>}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">Rank {performer.rank}</div>
                      </div>

                      {index === 0 && <span className="text-lg">🥇</span>}
                    </div>
                  ))}

                  {topPerformers.length === 0 && (
                    <div className="text-center text-gray-400 py-10 text-sm">
                      Not enough data yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
