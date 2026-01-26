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
      const team = teams.find(t => t.id === teamId);
      if (team && !isLead) {
        const currentLead = team.members.find(m => m.isLead);
        if (currentLead && currentLead.userId !== memberId) {
          await teamAPI.setTeamMemberLead(teamId, currentLead.userId, false);
        }
      }

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
    if (!team || !currentUser) return false;
    const member = team.members.find(m => m.userId === currentUser.id);
    return member?.role === 'team_admin';
  };

  const isTeamLead = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !currentUser) return false;
    const member = team.members.find(m => m.userId === currentUser.id);
    return member?.isLead === true;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <p className="text-gray-500 font-bold text-lg">Loading your teams...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Teams</h1>
            <p className="text-gray-500 font-medium mt-2 max-w-xl">
              Collaborate directly with your groups. Manage team members, assignments, and roles from one place.
            </p>
          </div>
          <Link
            href="/teams/create"
            className="group px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-xl shadow-gray-200 transition-all flex items-center gap-3 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="bg-white/20 p-1 rounded-md">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            </div>
            Create New Team
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4 text-red-700 animate-in fade-in slide-in-from-top-2">
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Teams Grid */}
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teams.map((team) => (
              <div
                key={team.id}
                className="group bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100/80 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col"
              >
                {/* Visual Header */}
                <div className="h-24 bg-gradient-to-br from-gray-900 to-gray-800 relative p-6 flex flex-col justify-end">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                  </div>
                  {isTeamLead(team.id) && (
                    <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-lg">
                      You Lead This Team
                    </div>
                  )}
                  <h2 className="text-2xl font-black text-white tracking-tight relative z-10 truncate">{team.name}</h2>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About</h3>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 min-h-[3rem]">
                      {team.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((m, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {m.user.username[0].toUpperCase()}
                        </div>
                      ))}
                      {team.members.length > 4 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">
                          +{team.members.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-400 ml-2">{team.members.length} Members</span>
                  </div>

                  {/* Organization Structure (Admin Only) */}
                  {team.members.length > 0 && isTeamAdmin(team.id) && (
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-900 uppercase">Team Structure</h4>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Admin View</span>
                      </div>

                      {/* Leads List */}
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div key={member.userId} className="flex items-center justify-between group/member">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {member.isLead && <span className="text-sm">👑</span>}
                              <span className={`text-sm truncate ${member.isLead ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                {member.user.username}
                              </span>
                            </div>
                            <button
                              onClick={() => handleSetTeamLead(team.id, member.userId, member.isLead || false, member.user.username)}
                              disabled={settingLead === `${team.id}-${member.userId}`}
                              className={`
                                   text-[10px] font-bold px-2 py-1 rounded transition-all opacity-0 group-hover/member:opacity-100
                                   ${member.isLead
                                  ? 'text-red-500 hover:bg-red-50 bg-transparent'
                                  : 'text-blue-500 hover:bg-blue-50 bg-transparent'
                                }
                                `}
                            >
                              {settingLead === `${team.id}-${member.userId}` ? '...' : member.isLead ? 'Remove Lead' : 'Make Lead'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex gap-3">
                    <Link
                      href={`/teams/${team.id}`}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm text-center hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      View Details
                    </Link>
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(team.id, team.name)}
                        disabled={deleting === team.id}
                        className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {deleting === team.id ? '...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No teams created yet</h3>
            <p className="text-gray-500 text-center max-w-sm mb-8">
              Get started by creating a team to collaborate with your organization members.
            </p>
            <Link
              href="/teams/create"
              className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all"
            >
              Create Your First Team
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
