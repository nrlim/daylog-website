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
  const [wfhUsage, setWfhUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
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
      setTopPerformers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch top performers:', error);
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
          setWfhUsage({ 
            team: { used: 0, limit: 0, remaining: 0 },
            personal: { used: 0, total: 0, remaining: 0 },
            summary: { totalUsed: 0, totalAvailable: 0 },
          } as any);
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
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.username}! 👋</h1>
          <p className="text-blue-100">Here&apos;s what&apos;s happening with your team today</p>
        </div>
        <Link
          href="/activities"
          className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold border border-white/30 hover:border-white/50 flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path>
          </svg>
          View Activities
        </Link>
      </div>

      {/* Top Performers Section */}
      {!loadingPerformers && topPerformers.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🌟 Top Performers This Month</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topPerformers.map((performer) => (
              <div
                key={performer.id}
                className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${getRankColor(performer.rank)} p-0.5`}
              >
                <div className="relative bg-slate-50 rounded-lg p-6 flex flex-col items-center justify-center h-full">
                  {/* Profile Picture */}
                  {performer.user.profilePicture ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-gray-200">
                      <img
                        src={performer.user.profilePicture}
                        alt={performer.user.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 border-2 border-gray-200">
                      <span className="text-2xl font-bold text-white">{performer.user.username.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  
                  <div className="text-4xl mb-2">{getMedalEmoji(performer.rank)}</div>
                  
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-gray-900 mb-1">
                      {performer.user.username}
                    </h4>
                    <p className="text-gray-600 text-xs uppercase tracking-wider">
                      {performer.rank === 1 && '⭐ Top Performer'}
                      {performer.rank === 2 && '⭐ 2nd Place'}
                      {performer.rank === 3 && '⭐ 3rd Place'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'admin' && (
          <a
            href="/teams"
            className="group bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-blue-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Teams</h2>
              <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
                  <path d="M4.5 5.5C3.12 5.5 2 6.62 2 8s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5z"></path>
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Manage your teams and members</p>
            <span className="text-blue-600 font-medium group-hover:translate-x-1 inline-block transition-transform">
              View Teams →
            </span>
          </a>
        )}

        {user?.role === 'admin' && (
          <a
            href="/users"
            className="group bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-purple-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM9 12a6 6 0 11-12 0 6 6 0 0112 0z"></path>
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Manage all users in the system</p>
            <span className="text-purple-600 font-medium group-hover:translate-x-1 inline-block transition-transform">
              View Users →
            </span>
          </a>
        )}
      </div>

      {/* WFH Quota Status - Simple Display */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">WFH Monthly Quota</h3>
            <p className="text-sm text-gray-600 mt-1">Track your work from home usage</p>
          </div>
          <div className="text-right">
            {wfhUsage ? (
              <>
                <p className="text-4xl font-bold text-blue-600">
                  {(wfhUsage as any).team?.remaining || 0}
                </p>
                <p className="text-sm text-gray-600">team days remaining</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Loading...</p>
            )}
          </div>
        </div>
        {wfhUsage ? (
          <div className="mt-6 space-y-6">
            {/* Team Quota */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Team Quota</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Used</p>
                  <p className="text-xl font-bold text-gray-900">{(wfhUsage as any).team?.used || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Limit</p>
                  <p className="text-xl font-bold text-gray-900">{(wfhUsage as any).team?.limit || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 mb-1">Usage</p>
                  <p className="text-xl font-bold text-gray-900">
                    {(wfhUsage as any).team?.limit 
                      ? Math.round(((wfhUsage as any).team?.used / (wfhUsage as any).team?.limit) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Quota */}
            {(wfhUsage as any).personal?.total > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Personal Quota</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Used</p>
                    <p className="text-xl font-bold text-gray-900">{(wfhUsage as any).personal?.used || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Total</p>
                    <p className="text-xl font-bold text-gray-900">{(wfhUsage as any).personal?.total || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Usage</p>
                    <p className="text-xl font-bold text-gray-900">
                      {(wfhUsage as any).personal?.total 
                        ? Math.round(((wfhUsage as any).personal?.used / (wfhUsage as any).personal?.total) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center py-4">
            <p className="text-sm text-gray-500">No WFH quota data available</p>
          </div>
        )}
      </div>

      {/* Activities Section */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Your Recent Activities</h2>
          <p className="text-sm text-gray-600 mt-1">Your latest activity logs this month</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 mx-auto mb-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600"></div>
            </div>
            <p className="text-gray-600">Loading activities...</p>
          </div>
        ) : userActivities.filter(a => a.userId === user?.id).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userActivities
                  .filter(a => a.userId === user?.id)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900 font-medium">
                        {new Date(activity.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-600">{activity.time}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{activity.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activity.isWfh ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold border border-blue-300">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
                          </svg>
                          WFH
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold border border-gray-300">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                          </svg>
                          Office
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(activity.status)}`}>
                        {getStatusIcon(activity.status)}
                        {activity.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-gray-500">No activities found</p>
            <p className="text-sm text-gray-400 mt-1">
              <Link href="/activities/create" className="text-blue-600 hover:text-blue-700 font-medium">
                Create your first activity →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
