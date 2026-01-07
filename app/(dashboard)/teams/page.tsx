'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { teamAPI, authAPI } from '@/lib/api';
import { Team, User } from '@/types';
import { useNotificationStore } from '@/lib/store';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settingLead, setSettingLead] = useState<string | null>(null);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    loadTeams();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      setCurrentUser(response.data.user);
    } catch (error: any) {
      console.error('Error loading current user');
    }
  };

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await teamAPI.getTeams();
      setTeams(response.data.teams);
      setError(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load teams';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Load Error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) return;
    
    setDeleting(id);
    try {
      await teamAPI.deleteTeam(id);
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Team "${teamName}" deleted successfully`,
      });
      loadTeams();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete team';
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: errorMessage,
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleSetTeamLead = async (teamId: string, memberId: string, isLead: boolean, memberName: string) => {
    setSettingLead(`${teamId}-${memberId}`);
    try {
      // If setting a member as lead, first remove lead from any existing lead
      const team = teams.find(t => t.id === teamId);
      if (team && !isLead) {
        const currentLead = team.members.find(m => m.isLead);
        if (currentLead && currentLead.userId !== memberId) {
          // Remove lead from current lead
          await teamAPI.setTeamMemberLead(teamId, currentLead.userId, false);
        }
      }
      
      // Then set the new lead
      await teamAPI.setTeamMemberLead(teamId, memberId, !isLead);
      addNotification({
        type: 'success',
        title: 'Success',
        message: !isLead ? `${memberName} is now the team lead` : `${memberName} is no longer a team lead`,
      });
      loadTeams();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update team lead status';
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage,
      });
    } finally {
      setSettingLead(null);
    }
  };

  const isTeamAdmin = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !currentUser) {
      return false;
    }
    const member = team.members.find(m => m.userId === currentUser.id);
    const isAdmin = member?.role === 'team_admin';
    return isAdmin;
  };

  const isTeamLead = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !currentUser) {
      return false;
    }
    const member = team.members.find(m => m.userId === currentUser.id);
    return member?.isLead === true;
  };

  const getMyTeams = () => {
    const filtered = teams.filter(team => {
      const member = team.members.find(m => m.userId === currentUser?.id);
      const isLead = member?.isLead === true;
      return isLead;
    });
    return filtered;
  };

  const myTeams = useMemo(() => {
    if (!teams || !currentUser) {
      return [];
    }
    return teams.filter(team => {
      const member = team.members.find(m => m.userId === currentUser.id);
      const isLead = member?.isLead === true;
      return isLead;
    });
  }, [teams, currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="w-12 h-12 mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600"></div>
        </div>
        <p className="text-gray-600 font-medium">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-1">Manage all teams and their members</p>
        </div>
        <Link
          href="/teams/create"
          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
          </svg>
          Create Team
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Teams Grid */}
      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-xl shadow border border-gray-100 hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              {/* Card Header with gradient */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold flex-1">{team.name}</h2>
                  {isTeamLead(team.id) && (
                    <span className="bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold ml-2">
                      👑 Lead
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-gray-600">{team.description || 'No description provided'}</p>
                </div>

                {/* Members Count */}
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.5 1.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM7 10a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"></path>
                  </svg>
                  <span className="font-medium">{team.members.filter(m => !m.isLead && m.role !== 'team_admin').length} {team.members.filter(m => !m.isLead && m.role !== 'team_admin').length === 1 ? 'member' : 'members'}</span>
                  {team.members.some(m => m.isLead) && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">1 Lead</span>
                  )}
                </div>

                {/* Team Members List with Lead Toggle */}
                {team.members.length > 0 && isTeamAdmin(team.id) && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-4">Organization Structure</p>
                    <div className="space-y-1 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
                      {/* Team Leads Section */}
                      {team.members.some(m => m.isLead) && (
                        <div className="mb-4">
                          <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="text-lg">👑</span> Team Leads
                          </div>
                          <div className="pl-4 space-y-2 border-l-2 border-blue-300">
                            {team.members
                              .filter(m => m.isLead)
                              .map((member) => (
                                <div
                                  key={member.userId}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-all group"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-lg">👑</span>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">{member.user.username}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-blue-600 font-medium">Team Lead</span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleSetTeamLead(team.id, member.userId, member.isLead || false, member.user.username)}
                                    disabled={settingLead === `${team.id}-${member.userId}`}
                                    className="ml-2 px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                                    title="Remove lead status"
                                  >
                                    {settingLead === `${team.id}-${member.userId}` ? 'Updating...' : 'Remove'}
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Team Admin Section - HIDDEN */}

                      {/* Regular Members Section */}
                      {team.members.some(m => m.role === 'member' && !m.isLead) && (
                        <div>
                          <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="text-lg">👤</span> Team Members
                          </div>
                          <div className="pl-4 space-y-2 border-l-2 border-green-300">
                            {team.members
                              .filter(m => m.role === 'member' && !m.isLead)
                              .map((member) => (
                                <div
                                  key={member.userId}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border-l-4 border-green-500 shadow-sm hover:shadow-md transition-all group"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-lg">👤</span>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">{member.user.username}</p>
                                      <p className="text-xs text-green-600 font-medium">Member</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleSetTeamLead(team.id, member.userId, member.isLead || false, member.user.username)}
                                    disabled={settingLead === `${team.id}-${member.userId}`}
                                    className="ml-2 px-3 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                                    title="Promote to lead"
                                  >
                                    {settingLead === `${team.id}-${member.userId}` ? 'Updating...' : 'Make Lead'}
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex-1 text-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                  >
                    View Details
                  </Link>
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(team.id, team.name)}
                      disabled={deleting === team.id}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting === team.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3.5A2.5 2.5 0 019.5 18h5a2.5 2.5 0 012.5 2.5z"></path>
          </svg>
          <p className="text-gray-600 font-medium mb-2 text-lg">No teams yet</p>
          <p className="text-gray-500 text-sm mb-6">Create your first team to get started collaborating</p>
          <Link
            href="/teams/create"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
            </svg>
            Create Team
          </Link>
        </div>
      )}
    </div>
  );
}
