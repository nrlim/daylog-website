'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';

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

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ role: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    try {
      const response = await userAPI.getUserById(userId);
      setUser(response.data.user);
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
    } catch (error) {
      console.error('Failed to change role:', error);
      setError('Failed to change role');
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  if (!user) {
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
        <h1 className="text-3xl font-bold">{user.username}</h1>
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
            <p className="font-medium">{user.username}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user.email || 'Not provided'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
              {user.role}
            </span>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
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

      {/* Teams */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Teams ({user.teamMembers.length})</h2>
        
        {user.teamMembers.length > 0 ? (
          <div className="space-y-2">
            {user.teamMembers.map((member) => (
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
        <h2 className="text-xl font-semibold mb-4">Recent Activities ({user.activities.length})</h2>
        
        {user.activities.length > 0 ? (
          <div className="space-y-3">
            {user.activities.slice(0, 5).map((activity) => (
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
