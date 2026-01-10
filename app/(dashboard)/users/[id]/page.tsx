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
      const performers = response.data.performers.map((p: any) => ({
        rank: p.rank,
        username: p.user.username,
      }));
      setCurrentTopPerformers(performers);
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
    if (!user || user.role !== 'admin') {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Only admins can set top performers',
      });
      return;
    }

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
    return <div className="px-4 py-6">Loading...</div>;
  }

  if (!userDetail) {
    return <div className="px-4 py-6">User not found</div>;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'member': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{userDetail.username}</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Username</p>
            <p className="font-medium">{userDetail.username}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{userDetail.email || 'Not provided'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(userDetail.role)}`}>
              {userDetail.role}
            </span>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="font-medium">{new Date(userDetail.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Change Role
          </button>
        ) : (
          <form onSubmit={handleChangeRole} className="mt-4">
            <div className="flex items-center gap-2">
              <select
                value={formData.role}
                onChange={(e) => setFormData({ role: e.target.value })}
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Top Performer Setting */}
      {user && user.role === 'admin' && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg shadow p-6 mb-6 border border-yellow-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            🏆 Set as Top Performer
          </h2>
          
          <p className="text-sm text-gray-600 mb-4">
            Assign {userDetail.username} to one of the podium positions for this month
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((rank) => {
              const currentRank = currentTopPerformers.find(p => p.rank === rank);
              return (
                <button
                  key={rank}
                  onClick={() => handleSetTopPerformer(rank)}
                  disabled={settingTopPerformer === rank}
                  className={`p-4 rounded-lg font-semibold transition-all ${
                    rank === 1
                      ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white hover:shadow-lg'
                      : rank === 2
                      ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white hover:shadow-lg'
                      : 'bg-gradient-to-br from-orange-300 to-orange-500 text-white hover:shadow-lg'
                  } ${settingTopPerformer === rank ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="text-2xl mb-2">
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                  </div>
                  <div>Top {rank}</div>
                  {currentRank && (
                    <div className="text-xs mt-2 opacity-90">
                      Current: {currentRank.username}
                    </div>
                  )}
                  {settingTopPerformer === rank && (
                    <div className="text-xs mt-2">Setting...</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Teams */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Teams ({userDetail.teamMembers.length})</h2>
        
        {userDetail.teamMembers.length > 0 ? (
          <div className="space-y-2">
            {userDetail.teamMembers.map((member) => (
              <div key={member.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{member.team.name}</p>
                  <p className="text-sm text-gray-500">Role: {member.role}</p>
                </div>
                <a href={`/teams/${member.team.id}`} className="text-blue-500 hover:underline">
                  View Team
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Not a member of any teams</p>
        )}
      </div>

      {/* Activities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activities ({userDetail.activities.length})</h2>
        
        {userDetail.activities.length > 0 ? (
          <div className="space-y-3">
            {userDetail.activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="p-3 border rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    activity.status === 'Done' ? 'bg-green-100 text-green-800' :
                    activity.status === 'InProgress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No activities yet</p>
        )}
      </div>
    </div>
  );
}
