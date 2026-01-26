'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userAPI, api } from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/lib/store';

interface UserDetail {
  id: string;
  username: string;
  email?: string;
  role: string;
  createdAt: string;
  teamMembers: Array<{
    id: string;
    role: string;
    team: {
      id: string;
      name: string;
    };
  }>;
  activities: Array<{
    id: string;
    description: string;
    date: string;
    status: string;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ role: '' });
  const [error, setError] = useState('');
  const [settingTopPerformer, setSettingTopPerformer] = useState<number | null>(null);
  const [currentTopPerformers, setCurrentTopPerformers] = useState<{ rank: number; username: string }[]>([]);

  useEffect(() => {
    loadUser();
    loadTopPerformers();
  }, [userId]);

  const loadTopPerformers = async () => {
    try {
      const response = await api.get('/top-performers');
      if (response.data && response.data.performers) {
        const performers = response.data.performers.map((p: any) => ({
          rank: p.rank,
          username: p.user.username,
        }));
        setCurrentTopPerformers(performers);
      }
    } catch (error) {
      console.error('Failed to load top performers:', error);
    }
  };

  const loadUser = async () => {
    try {
      const response = await userAPI.getUserById(userId);
      setUserDetail(response.data.user);
      setFormData({ role: response.data.user.role });
    } catch (error) {
      console.error('Failed to load user:', error);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userAPI.changeUserRole(userId, formData.role);
      loadUser();
      setIsEditing(false);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Role updated successfully',
      });
    } catch (error) {
      console.error('Failed to change role:', error);
      setError('Failed to change role');
    }
  };

  const handleSetTopPerformer = async (rank: number) => {
    if (!user || user.role !== 'admin') return;

    setSettingTopPerformer(rank);
    try {
      await api.post('/top-performers', {
        rank,
        userId,
      });
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Set as Top ${rank} Performer!`,
      });
      loadTopPerformers();
    } catch (error) {
      console.error('Failed to set top performer:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to set top performer',
      });
    } finally {
      setSettingTopPerformer(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-gray-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-medium text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!userDetail) {
    return <div className="p-10 text-center text-gray-500">User not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50/30 p-6 lg:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium text-sm mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Team
        </button>

        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden relative">
          {/* Cover Banner */}
          <div className="h-32 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100"></div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end -mt-12 gap-6">

              {/* Avatar & Info */}
              <div className="flex items-end gap-6">
                <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-lg">
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-black">
                    {userDetail.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="mb-2">
                  <h1 className="text-3xl font-black text-gray-900 leading-tight">{userDetail.username}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${userDetail.role === 'admin' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                      {userDetail.role}
                    </span>
                    <span className="text-sm text-gray-500 font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Joined {new Date(userDetail.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mb-2 w-full md:w-auto">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full md:w-auto px-5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Edit Role
                  </button>
                ) : (
                  <form onSubmit={handleChangeRole} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ role: e.target.value })}
                      className="bg-white border-0 rounded-lg py-1.5 pl-3 pr-8 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="p-1.5 text-gray-500 hover:text-rose-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Email Section */}
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Email Address</p>
                <p className="font-semibold text-gray-900">{userDetail.email || 'No email provided'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">User ID</p>
                <p className="font-family-mono text-sm text-gray-500">{userDetail.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Section: Top Performer */}
        {user && user.role === 'admin' && (
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <span>🏆</span> Set Monthly Ranking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((rank) => {
                const currentRank = currentTopPerformers.find(p => p.rank === rank);
                const isCurrent = currentRank?.username === userDetail.username;
                return (
                  <button
                    key={rank}
                    onClick={() => handleSetTopPerformer(rank)}
                    disabled={settingTopPerformer === rank}
                    className={`group relative p-6 rounded-2xl border transition-all duration-300 ${rank === 1 ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300' :
                        rank === 2 ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300' :
                          'border-orange-200 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-300'
                      }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-3 right-3 text-xs font-bold bg-white px-2 py-1 rounded-full shadow-sm border border-gray-100 text-green-600">
                        Active
                      </div>
                    )}
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    </div>
                    <div className={`font-black uppercase tracking-wider text-sm mb-1 ${rank === 1 ? 'text-amber-700' : rank === 2 ? 'text-slate-700' : 'text-orange-700'
                      }`}>Top {rank}</div>

                    {currentRank ? (
                      <div className="text-xs text-gray-500 font-medium">Currently: {currentRank.username}</div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">Position Empty</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Teams Section */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Teams</h3>
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{userDetail.teamMembers.length}</span>
            </div>

            {userDetail.teamMembers.length > 0 ? (
              <div className="space-y-4">
                {userDetail.teamMembers.map((member) => (
                  <div key={member.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-gray-900">{member.team.name}</h4>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs font-semibold bg-gray-50 text-gray-500 px-2 py-1 rounded uppercase tracking-wide">{member.role}</span>
                      <a href={`/teams/${member.team.id}`} className="text-xs font-bold text-indigo-600 hover:underline">View Team</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border border-gray-100 border-dashed p-6 text-center">
                <p className="text-sm text-gray-500">Not assigned to any teams.</p>
              </div>
            )}
          </div>

          {/* Activities Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Recent Activity</h3>
              <span className="text-xs font-medium text-gray-500">Last 5 entries</span>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
              {userDetail.activities.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {userDetail.activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-medium text-gray-900 mb-1">{activity.description}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase">
                            {new Date(activity.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${activity.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            activity.status === 'InProgress' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">💤</div>
                  <p className="text-gray-900 font-medium">No recent activity</p>
                  <p className="text-sm text-gray-500 mt-1">This user hasn't logged any tasks yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
