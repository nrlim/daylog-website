'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { activityAPI, teamAPI, authAPI } from '@/lib/api';
import { Activity, Team, User } from '@/types';
import { useNotificationStore } from '@/lib/store';

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isTeamLead, setIsTeamLead] = useState(false);
  const [activityTab, setActivityTab] = useState<'my' | 'team'>('my');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingActivityId, setBlockingActivityId] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const { addNotification } = useNotificationStore();

  // Set default date range to current month
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: firstDayOfMonth.toISOString().split('T')[0],
    end: lastDayOfMonth.toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'InProgress' | 'Done' | 'Blocked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      const user = await loadCurrentUser();
      if (user) {
        await loadTeams(user.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (currentUser && teams.length >= 0) {
      loadActivities();
    }
  }, [currentUser, activityTab, teams, currentPage, statusFilter]);

  useEffect(() => {
    filterAndSortActivities();
    setCurrentPage(1);
  }, [activities, sortOrder, statusFilter]);

  const filterAndSortActivities = () => {
    let filtered = activities.filter((activity) => {
      const statusMatch = statusFilter === 'all' || activity.status === statusFilter;
      return statusMatch;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredActivities(filtered);
  };

  // Use server-side pagination data, fallback to default if not available
  const totalPages = pagination?.totalPages || Math.ceil(activities.length / itemsPerPage) || 1;
  const paginatedActivities = activities;

  const loadCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      setCurrentUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Failed to load current user:', error);
      return null;
    }
  };

  const loadTeams = async (userId?: string) => {
    try {
      const response = await teamAPI.getTeams();

      // Use the provided userId or fall back to currentUser?.id
      const userIdToCheck = userId || currentUser?.id;

      // Check if current user is a lead in any team
      const isLead = response.data.teams.some((team: Team) => {
        const member = team.members.find(m => m.userId === userIdToCheck);
        return member?.isLead === true;
      });

      setIsTeamLead(isLead);
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadActivities = async () => {
    setApplyingFilters(true);
    try {
      let allActivities: Activity[] = [];
      let paginationData: any = null;

      if (!currentUser) {
        setApplyingFilters(false);
        return;
      }

      if (activityTab === 'my') {
        const response = await activityAPI.getActivities({
          userId: currentUser.id,
          startDate: dateRange.start,
          endDate: dateRange.end,
          page: currentPage,
          limit: itemsPerPage,
        });
        allActivities = response.data.activities;
        paginationData = response.data.pagination;
      } else if (activityTab === 'team') {
        if (!teams || teams.length === 0) {
          setLoading(false);
          return;
        }

        // Check if user is admin - if yes, show all activities from all teams
        if (currentUser.role === 'admin') {
          for (const team of teams) {
            try {
              const response = await activityAPI.getTeamMembersActivities(team.id, {
                startDate: dateRange.start,
                endDate: dateRange.end,
                memberId: selectedUser || undefined,
                page: currentPage,
                limit: itemsPerPage,
              });
              allActivities = allActivities.concat(response.data.activities);
              paginationData = response.data.pagination;
            } catch (teamError: any) {
              // Continue with next team on error
            }
          }
        } else {
          // Find all teams where current user is a lead
          const leadTeams = teams.filter(team => {
            const member = team.members.find(m => m.userId === currentUser.id);
            const isLead = member?.isLead === true;
            return isLead;
          });

          if (leadTeams.length === 0) {
            setActivities([]);
            setError('You are not a team lead yet. Assign yourself as a lead in Teams settings.');
            setApplyingFilters(false);
            return;
          }

          // Get activities from each team
          for (const team of leadTeams) {
            try {
              const response = await activityAPI.getTeamMembersActivities(team.id, {
                startDate: dateRange.start,
                endDate: dateRange.end,
                memberId: selectedUser || undefined,
                page: currentPage,
                limit: itemsPerPage,
              });
              allActivities = allActivities.concat(response.data.activities);
              paginationData = response.data.pagination;
            } catch (teamError: any) {
              // Continue with next team on error
            }
          }
        }

        // Filter out current user's activities to avoid duplication with "My Activities" tab
        allActivities = allActivities.filter(a => a.userId !== currentUser.id);
      }

      setActivities(allActivities);
      setPagination(paginationData);
      setError(null);
    } catch (error: any) {
      console.error('❌ Error in loadActivities:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load activities';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Load Error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
      setApplyingFilters(false);
    }
  };

  const handleApplyFilters = async () => {
    setApplyingFilters(true);
    try {
      await loadActivities();
    } finally {
      setApplyingFilters(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'Blocked') {
      setBlockingActivityId(id);
      setShowBlockModal(true);
      return;
    }

    setUpdating(id);
    try {
      await activityAPI.updateActivity(id, { status: newStatus });
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Activity marked as Done`,
      });
      loadActivities();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update activity';
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleBlockActivity = async () => {
    if (!blockingActivityId || blockReason.trim() === '') {
      addNotification({
        type: 'error',
        title: 'Required',
        message: 'Please provide a reason for blocking',
      });
      return;
    }

    setUpdating(blockingActivityId);
    try {
      await activityAPI.updateActivity(blockingActivityId, {
        status: 'Blocked',
        blockedReason: blockReason
      });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Activity marked as Blocked',
      });
      setShowBlockModal(false);
      setBlockingActivityId(null);
      setBlockReason('');
      loadActivities();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to block activity';
      addNotification({
        type: 'error',
        title: 'Block Failed',
        message: errorMessage,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleEditClick = (activity: Activity) => {
    setEditingActivityId(activity.id);
    setEditSubject(activity.subject);
    setEditDescription(activity.description);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingActivityId || editSubject.trim() === '') {
      addNotification({
        type: 'error',
        title: 'Required',
        message: 'Please enter a subject',
      });
      return;
    }

    if (!editDescription.trim()) {
      addNotification({
        type: 'error',
        title: 'Required',
        message: 'Please enter a description',
      });
      return;
    }

    setUpdating(editingActivityId);
    try {
      await activityAPI.updateActivity(editingActivityId, {
        subject: editSubject,
        description: editDescription
      });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Activity updated successfully',
      });
      setShowEditModal(false);
      setEditingActivityId(null);
      setEditSubject('');
      setEditDescription('');
      loadActivities();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update activity';
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: errorMessage,
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteClick = (activityId: string) => {
    setDeletingActivityId(activityId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingActivityId) return;

    setUpdating(deletingActivityId);
    try {
      await activityAPI.deleteActivity(deletingActivityId);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Activity deleted successfully',
      });
      setShowDeleteModal(false);
      setDeletingActivityId(null);
      loadActivities();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete activity';
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: errorMessage,
      });
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'InProgress':
        return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
      case 'Blocked':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done':
        return '✓';
      case 'InProgress':
        return '⟳';
      case 'Blocked':
        return '✕';
      default:
        return '○';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="w-12 h-12 mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600"></div>
        </div>
        <p className="text-gray-600 font-medium">Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Activities</h1>
            <p className="text-gray-500 mt-1 font-medium">Track and manage your team&apos;s daily progress</p>
          </div>
          <Link
            href="/activities/create"
            className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log Activity
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-bold text-sm">{error}</p>
          </div>
        )}

        {/* Controls Container */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-5 space-y-5">

          {/* Tabs */}
          {(isTeamLead || currentUser?.role === 'admin') && (
            <div className="flex p-1 bg-gray-100/50 rounded-xl">
              <button
                onClick={() => {
                  setActivityTab('my');
                  setSelectedUser('');
                  setCurrentPage(1);
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activityTab === 'my'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                My Activities
              </button>
              <button
                onClick={() => {
                  setActivityTab('team');
                  setCurrentPage(1);
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activityTab === 'team'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {currentUser?.role === 'admin' ? 'All Team Activities' : 'Team Activities'}
              </button>
            </div>
          )}

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="InProgress">In Progress</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>

            {activityTab === 'team' && (isTeamLead || currentUser?.role === 'admin') ? (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">All Members</option>
                {teams
                  .filter(t => t.members.find(m => m.userId === currentUser?.id && (m.isLead || currentUser?.role === 'admin')))
                  .flatMap(team =>
                    team.members
                      .filter(member => member.user.role !== 'admin')
                      .map(member => ({ key: member.userId, username: member.user.username }))
                  )
                  .filter((v, i, a) => a.findIndex(t => t.key === v.key) === i)
                  .map(member => (
                    <option key={member.key} value={member.key}>{member.username}</option>
                  ))}
              </select>
            ) : (
              <div className="hidden lg:block"></div>
            )}

            <button
              onClick={handleApplyFilters}
              disabled={applyingFilters}
              className="px-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
            >
              {applyingFilters ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Applying...</span>
                </>
              ) : 'Apply Filter'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-sm font-bold text-gray-500">
              Found <span className="text-gray-900">{filteredActivities.length}</span> activities
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:border-gray-400 cursor-pointer"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {applyingFilters ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading activities...</p>
          </div>
        ) : filteredActivities.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden transition-all duration-200 hover:-translate-y-1 flex flex-col group"
                >
                  <div className="px-5 pt-5 pb-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                          {activity.user.username[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate leading-tight">{activity.user.username}</p>
                          <p className="text-[10px] uppercase font-bold text-gray-400 mt-0.5 tracking-wide">
                            {new Date(activity.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${activity.status === 'Done' ? 'bg-green-100 text-green-700' :
                          activity.status === 'InProgress' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {activity.isWfh && (
                        <div className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-100 text-[10px] font-bold uppercase tracking-wider">WFH</div>
                      )}
                      {activity.project && (
                        <div className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase tracking-wider max-w-[150px] truncate">{activity.project}</div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex-1">
                    <Link href={`/activities/${activity.id}`}>
                      <h3 className="font-bold text-gray-900 leading-snug hover:text-purple-600 transition-colors cursor-pointer line-clamp-2 mb-2">
                        {activity.subject}
                      </h3>
                    </Link>
                    {activity.status === 'Blocked' && activity.blockedReason && (
                      <div className="bg-red-50 rounded-xl p-3 border border-red-100 mt-2">
                        <p className="text-xs font-bold text-red-800 flex items-center mb-1">
                          Blocked Reason
                        </p>
                        <p className="text-xs text-red-600 leading-relaxed">{activity.blockedReason}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto border-t border-gray-100 bg-gray-50/50 p-3 flex items-center gap-2">
                    {activity.status === 'InProgress' ? (
                      <>
                        <button onClick={() => handleStatusChange(activity.id, 'Done')} disabled={!!updating} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm">Mark Done</button>
                        <button onClick={() => handleStatusChange(activity.id, 'Blocked')} disabled={!!updating} className="px-3 py-2 bg-white border border-gray-200 text-gray-600 hover:text-red-600 rounded-lg text-xs font-bold transition-all">Block</button>
                      </>
                    ) : activity.status === 'Done' ? (
                      <div className="flex-1 py-1.5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Completed</div>
                    ) : (
                      <div className="flex-1 py-1.5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Blocked</div>
                    )}
                    {(activity.status !== 'Done' || currentUser?.role === 'admin') && (
                      <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                        <button onClick={() => handleEditClick(activity)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => handleDeleteClick(activity.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
                <div className="text-sm font-bold text-gray-500">
                  Page <span className="text-gray-900">{currentPage}</span> of <span className="text-gray-900">{totalPages}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1 hidden sm:flex">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${currentPage === page
                          ? 'bg-gray-900 text-white shadow-lg'
                          : 'text-gray-500 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-20 text-center">
            <p className="text-gray-400 font-bold mb-2">No activities found</p>
            <Link href="/activities/create" className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-block">
              Log First Activity
            </Link>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl transform transition-all">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">Edit Activity</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all font-medium resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/50 rounded-b-2xl border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!!updating}
                  className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Delete Activity?</h3>
              <p className="text-gray-500 font-medium mb-8">This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-3 text-gray-700 bg-gray-100 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={!!updating}
                  className="px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {updating ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block Modal */}
        {showBlockModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl transform transition-all">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900">Block Activity</h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-sm text-red-800 font-medium">Please provide a reason. This will be visible to the team.</p>
                </div>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                  placeholder="Ex: Waiting for API deployment..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-medium resize-none placeholder:text-gray-400"
                />
              </div>

              <div className="px-6 py-4 bg-gray-50/50 rounded-b-2xl border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setBlockingActivityId(null);
                    setBlockReason('');
                  }}
                  className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockActivity}
                  disabled={!!updating || !blockReason.trim()}
                  className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {updating ? 'Blocking...' : 'Confirm Block'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
