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
      email?: string;
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
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Team updated',
      });
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
      addNotification({
        type: 'success',
        title: 'Welcome!',
        message: 'New member added to the team',
      });
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-purple-600 rounded-full animate-spin mb-6"></div>
        <p className="text-gray-500 font-bold text-lg">Loading team details...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Team Not Found</h2>
        <button onClick={() => router.back()} className="text-purple-600 font-bold hover:underline">Go Back</button>
      </div>
    );
  }

  // Get available users (not already members)
  const availableUsers = users.filter(
    (u) => !team.members.some((m) => m.userId === u.id)
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Teams
        </button>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl mb-6 font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Team Details & Members */}
          <div className="lg:col-span-2 space-y-8">

            {/* Team Info Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Team Details</h2>
                  {!isEditing ? (
                    <>
                      <h1 className="text-3xl font-black text-gray-900 mb-2">{team.name}</h1>
                      <p className="text-gray-600 text-lg leading-relaxed">{team.description || 'No description provided.'}</p>
                    </>
                  ) : (
                    <div className="w-full">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full text-3xl font-black text-gray-900 border-b-2 border-gray-200 focus:border-purple-500 outline-none bg-transparent mb-4 placeholder:text-gray-300"
                        placeholder="Team Name"
                      />
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full text-lg text-gray-600 bg-gray-50 p-4 rounded-xl border-none outline-none resize-none focus:ring-2 focus:ring-purple-100"
                        placeholder="Team Description"
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                        <button onClick={handleUpdateTeam} className="px-6 py-2 rounded-xl font-bold text-white bg-gray-900 hover:bg-black shadow-lg transition-all">Save</button>
                      </>
                    ) : (
                      <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900">
                  Members <span className="text-gray-300 font-medium text-lg ml-1">({team.members.length})</span>
                </h2>
              </div>

              {team.members.length > 0 ? (
                <div className="space-y-3">
                  {/* Sort members: Leads first */}
                  {[...team.members].sort((a, b) => (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0)).map((member) => (
                    <div key={member.id} className={`
                             group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200
                             ${member.isLead ? 'bg-purple-50/50 border-purple-100 hover:border-purple-200' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'}
                          `}>
                      <div className="flex items-center gap-4">
                        <div className={`
                                   w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm
                                   ${member.isLead ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}
                                `}>
                          {member.user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900">{member.user.username}</p>
                            {member.isLead && <span className="bg-purple-200 text-purple-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Lead</span>}
                          </div>
                          {member.user.email && <p className="text-sm text-gray-500">{member.user.email}</p>}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Remove from team"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold">No members in this team yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Add Member & Settings */}
          {isAdmin && (
            <div className="space-y-8">

              {/* Add Member Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white shadow-xl shadow-gray-200">
                <h3 className="text-xl font-black mb-1">Add New Member</h3>
                <p className="text-gray-400 text-sm mb-6">Expand your team capabilities</p>

                {availableUsers.length > 0 ? (
                  <form onSubmit={handleAddMember} className="space-y-4">
                    <div className="relative">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full appearance-none bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white/20 transition-all font-medium"
                        required
                      >
                        <option value="" className="text-gray-500">Select a user...</option>
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.id} className="text-gray-900">
                            {user.username}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 rounded-xl transition-all shadow-lg shadow-white/10 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      Add Member
                    </button>
                  </form>
                ) : (
                  <div className="bg-white/10 rounded-xl p-4 text-center border border-white/10">
                    <p className="text-gray-300 text-sm font-medium">All users are already in this team</p>
                  </div>
                )}
              </div>

              {/* WFH Settings Card */}
              <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">WFH Settings</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase">Monthly Limit</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Days Per Month
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={wfhLimit}
                        onChange={(e) => setWfhLimit(Math.max(0, parseInt(e.target.value) || 0))}
                        min="0"
                        max="31"
                        className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-xl text-center"
                      />
                      <div className="text-sm text-gray-500 leading-tight">
                        Max WFH days<br />per member
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <p className="text-xs text-orange-800 font-medium">
                      <strong>Note:</strong> Quota resets automatically on the 1st of each month.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveWfhLimit}
                    disabled={savingWfh || wfhLimit === (team.wfhLimitPerMonth || 3)}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-md shadow-orange-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    {savingWfh ? 'Saving Changes...' : 'Update Limit'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmModal.show && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-white/20 transform scale-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7a2 2 0 012-2h.5a2 2 0 012 2v1m0 0h2a2 2 0 012 2v3.28a2 2 0 01-.973 1.693l-1.054.622A2 2 0 0015 17.25h-6v.75a2 2 0 01-2-2v-1m0 0H5a2 2 0 01-2-2V9m0 0h2a2 2 0 012-2h.5a2 2 0 012-2" /></svg>
              </div>

              <h3 className="text-xl font-black text-gray-900 text-center mb-2">Remove Member?</h3>
              <p className="text-gray-500 text-center font-medium mb-8">
                Are you sure you want to remove <strong className="text-gray-900">{confirmModal.memberName}</strong>? This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmModal({ show: false, memberId: '', memberName: '' })}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveMember}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
