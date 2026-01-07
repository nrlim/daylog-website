'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { teamAPI, userAPI } from '@/lib/api';
import { Team, User } from '@/types';
import { useNotificationStore, useAuthStore } from '@/lib/store';

interface TeamDetail extends Team {
  members: Array<{
    id: string;
    userId: string;
    teamId: string;
    role: string;
    isLead?: boolean;
    user: {
      id: string;
      username: string;
    };
  }>;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [wfhLimit, setWfhLimit] = useState<number>(3);
  const [savingWfh, setSavingWfh] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; memberId: string; memberName: string }>({ 
    show: false, 
    memberId: '', 
    memberName: '' 
  });

  useEffect(() => {
    loadTeamAndUsers();
  }, [teamId]);

  useEffect(() => {
    // Check if user is admin or lead of this team
    if (team && user) {
      const member = team.members?.find(
        (member) => member.userId === user.id
      );
      const isMemberAdmin = member?.role === 'team_admin';
      const isTeamLead = member?.isLead === true;
      const isGlobalAdmin = user.role === 'admin';
      const hasAccess = isMemberAdmin || isTeamLead || isGlobalAdmin;
      setIsAdmin(hasAccess);
      setWfhLimit(team.wfhLimitPerMonth || 3);
    }
  }, [team, user]);

  const loadTeamAndUsers = async () => {
    try {
      const [teamRes, usersRes] = await Promise.all([
        teamAPI.getTeamById(teamId),
        userAPI.getUsers(),
      ]);
      setTeam(teamRes.data.team);
      setUsers(usersRes.data.users);
      setFormData({
        name: teamRes.data.team.name,
        description: teamRes.data.team.description || '',
      });
    } catch (error) {
      console.error('Failed to load team:', error);
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await teamAPI.updateTeam(teamId, formData);
      loadTeamAndUsers();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update team:', error);
      setError('Failed to update team');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      await teamAPI.addMember(teamId, selectedUserId);
      setSelectedUserId('');
      loadTeamAndUsers();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      setError(error.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = team?.members.find(m => m.id === memberId);
    if (!member) return;
    setConfirmModal({ 
      show: true, 
      memberId, 
      memberName: member.user.username 
    });
  };

  const confirmRemoveMember = async () => {
    const memberId = confirmModal.memberId;
    setConfirmModal({ show: false, memberId: '', memberName: '' });

    try {
      await teamAPI.removeMember(teamId, memberId);
      addNotification({
        type: 'success',
        title: 'Success',
        message: `${confirmModal.memberName} has been removed from the team`,
      });
      loadTeamAndUsers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      setError('Failed to remove member');
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove member from team',
      });
    }
  };

  const handleSaveWfhLimit = async () => {
    if (wfhLimit < 0) {
      addNotification({
        type: 'error',
        title: 'Invalid Input',
        message: 'WFH limit must be 0 or greater',
      });
      return;
    }

    setSavingWfh(true);
    try {
      await teamAPI.setWfhLimit(teamId, wfhLimit);
      addNotification({
        type: 'success',
        title: 'Success',
        message: `WFH limit updated to ${wfhLimit} days per month`,
      });
      loadTeamAndUsers();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update WFH limit',
      });
    } finally {
      setSavingWfh(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  if (!team) {
    return <div className="px-4 py-6">Team not found</div>;
  }

  // Get available users (not already members)
  const availableUsers = users.filter(
    (u) => !team.members.some((m) => m.userId === u.id)
  );

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{team.name}</h1>
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

      {/* Team Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Team Information</h2>
            {!isEditing ? (
              <div>
                <p className="text-gray-600 mb-4">{team.description || 'No description'}</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">Team Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
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
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Add Member Section - Enhanced for Team Leads */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border border-blue-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14.5 7a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Member</h2>
              <p className="text-sm text-gray-600">Expand your team with new members</p>
            </div>
          </div>
          
          {availableUsers.length > 0 ? (
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Choose a user to add...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all duration-200 font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
                </svg>
                Add Member to Team
              </button>
            </form>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-gray-600 text-center">
                <span className="text-green-600 font-semibold">✓ Complete</span> All users are already members of this team
              </p>
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Team Members ({team.members.filter(m => m.role !== 'team_admin').length})</h2>
        
        {team.members.length > 0 ? (
          <div className="space-y-3">
            {/* Team Leads First */}
            {team.members.filter(m => m.isLead).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="text-lg">👑</span> Team Leads
                </h3>
                <div className="space-y-2">
                  {team.members.filter(m => m.isLead).map((member) => (
                    <div key={member.id} className="flex justify-between items-center p-4 border-l-4 border-blue-500 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                          <span className="text-lg">👑</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.user.username}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Team Lead</span>
                          </div>
                        </div>
                      </div>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 hover:underline text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Members */}
            {team.members.filter(m => !m.isLead && (user?.role === 'admin' || m.role !== 'team_admin')).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="text-lg">👤</span> Members ({team.members.filter(m => !m.isLead && (user?.role === 'admin' || m.role !== 'team_admin')).length})
                </h3>
                <div className="space-y-2">
                  {team.members.filter(m => !m.isLead && (user?.role === 'admin' || m.role !== 'team_admin')).map((member) => (
                    <div key={member.id} className="flex justify-between items-center p-4 border-l-4 border-green-500 bg-green-50 rounded hover:bg-green-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.user.username}</p>
                          <span className="text-xs text-green-600 font-medium">Member</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 hover:underline text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No members yet</p>
        )}
      </div>

      {/* WFH Settings */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg shadow border border-orange-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
          </svg>
          <h2 className="text-lg font-bold text-gray-900">Work From Home Settings</h2>
        </div>

        {user?.role !== 'admin' ? (
          <div className="bg-white rounded-lg p-4 border border-orange-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Current WFH Limit:</span> {team.wfhLimitPerMonth} days per month
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Only system admins can modify WFH settings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                WFH Days Per Month
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={wfhLimit}
                  onChange={(e) => setWfhLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  max="31"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Members cannot add log activities once they exceed this limit in a month.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> The quota resets automatically at the start of each month.
              </p>
            </div>

            <button
              onClick={handleSaveWfhLimit}
              disabled={savingWfh || wfhLimit === (team.wfhLimitPerMonth || 3)}
              className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingWfh ? 'Saving...' : 'Save WFH Limit'}
            </button>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-white rounded-lg p-4 border border-orange-200 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">How it Works</h3>
          <ul className="text-xs text-gray-600 space-y-2">
            <li className="flex gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span>Members log activities on the website</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span>Mark activities as WFH when working from home</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span>Monthly quota tracks WFH days per person</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span>Cannot log more activities after limit is reached</span>
            </li>
            <li className="flex gap-2">
              <span className="text-orange-600 font-bold">•</span>
              <span>Quota resets on the 1st of each month</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7a2 2 0 012-2h.5a2 2 0 012 2v1m0 0h2a2 2 0 012 2v3.28a2 2 0 01-.973 1.693l-1.054.622A2 2 0 0015 17.25h-6v.75a2 2 0 01-2-2v-1m0 0H5a2 2 0 01-2-2V9m0 0h2a2 2 0 012-2h.5a2 2 0 012-2" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Remove Team Member?</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to remove <span className="font-semibold">{confirmModal.memberName}</span> from the team? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, memberId: '', memberName: '' })}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveMember}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
