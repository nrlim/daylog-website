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
  }, [currentUser, activityTab, teams]);

  useEffect(() => {
    filterAndSortActivities();
    setCurrentPage(1);
  }, [activities, sortOrder, statusFilter, selectedUser]);

  const filterAndSortActivities = () => {
    let filtered = activities.filter((activity) => {
      const statusMatch = statusFilter === 'all' || activity.status === statusFilter;
      const userMatch = !selectedUser || activity.userId === selectedUser;
      return statusMatch && userMatch;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredActivities(filtered);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedActivities = filteredActivities.slice(startIndex, endIndex);

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
    setLoading(true);
    try {
      let allActivities: Activity[] = [];

      if (!currentUser) {
        setLoading(false);
        return;
      }

      if (activityTab === 'my') {
        const response = await activityAPI.getActivities({
          userId: currentUser.id,
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
        allActivities = response.data.activities;
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
              });
              allActivities = allActivities.concat(response.data.activities);
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
            setLoading(false);
            return;
          }

          // Get activities from each team
          for (const team of leadTeams) {
            try {
              const response = await activityAPI.getTeamMembersActivities(team.id, {
                startDate: dateRange.start,
                endDate: dateRange.end,
              });
              allActivities = allActivities.concat(response.data.activities);
            } catch (teamError: any) {
              // Continue with next team on error
            }
          }
        }
        
        // Filter out current user's activities to avoid duplication with "My Activities" tab
        allActivities = allActivities.filter(a => a.userId !== currentUser.id);
      }

      setActivities(allActivities);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-600 mt-1">Track all logged activities and progress</p>
        </div>
        <Link
          href="/activities/create"
          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
          </svg>
          Log Activity
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

      {/* Tabs Section */}
      {(isTeamLead || currentUser?.role === 'admin') && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setActivityTab('my');
                setSelectedUser('');
              }}
              className={`flex-1 px-6 py-3 font-medium transition-all ${
                activityTab === 'my'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Activities
            </button>
            <button
              onClick={() => {
                setActivityTab('team');
              }}
              className={`flex-1 px-6 py-3 font-medium transition-all ${
                activityTab === 'team'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {currentUser?.role === 'admin' ? 'All Team Activities' : 'Team Activities'}
            </button>
          </div>
        </div>
      )}

      {/* Filters & Sort Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-0 z-40">
        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 mb-3">
          <div className="relative">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all hover:border-gray-400"
              title="From Date"
            />
          </div>

          <div className="relative">
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all hover:border-gray-400"
              title="To Date"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'InProgress' | 'Done' | 'Blocked')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all hover:border-gray-400 appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="InProgress">In Progress</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>

          {activityTab === 'team' && isTeamLead && (
            <div className="relative">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all hover:border-gray-400 appearance-none cursor-pointer"
              >
                <option value="">All Members</option>
                {teams
                  .filter(t => t.members.find(m => m.userId === currentUser?.id && m.isLead))
                  .flatMap(team =>
                    team.members.map(member => ({
                      key: member.userId,
                      username: member.user.username,
                    }))
                  )
                  .filter((v, i, a) => a.findIndex(t => t.key === v.key) === i)
                  .map(member => (
                    <option key={member.key} value={member.key}>
                      {member.username}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <button
            onClick={handleApplyFilters}
            disabled={applyingFilters}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md"
          >
            {applyingFilters ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Applying
              </>
            ) : (
              'Apply'
            )}
          </button>
        </div>

        {/* Sort & Count Row */}
        <div className="flex flex-col md:flex-row items-center gap-2.5 pt-3 border-t border-gray-100">
          <div className="relative w-full md:w-auto">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white transition-all hover:border-gray-400 appearance-none cursor-pointer"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <div className="text-xs text-gray-600 md:ml-auto font-medium">
            <span className="font-semibold text-gray-900">{filteredActivities.length}</span> {filteredActivities.length !== 1 ? 'activities' : 'activity'}
          </div>
        </div>
      </div>

      {/* Loading Overlay Modal */}
      {applyingFilters && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center gap-4 max-w-sm w-full">
            <div className="relative w-14 h-14">
              <svg className="animate-spin h-14 w-14 text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-gray-900 mb-1">Loading Activities</h3>
              <p className="text-sm text-gray-600">Please wait while we fetch your activities...</p>
            </div>
          </div>
        </div>
      )}

      {/* Activities Grid */}
      {filteredActivities.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedActivities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 overflow-hidden transition-all duration-200 flex flex-col group"
            >
              {/* Card Header */}
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {activity.user.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{activity.user.username}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(activity.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {activity.isWfh && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 whitespace-nowrap">
                        WFH
                      </span>
                    )}
                    {activity.project && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                        {activity.project}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium gap-1 ${getStatusColor(activity.status)}`}>
                    {activity.status === 'Done' && '✓'}
                    {activity.status === 'InProgress' && '○'}
                    {activity.status === 'Blocked' && '✕'}
                    {activity.status === 'InProgress' ? 'In Progress' : activity.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-5 py-3 flex-1">
                <Link href={`/activities/${activity.id}`}>
                  <p className="text-gray-900 font-semibold text-sm leading-relaxed line-clamp-2 hover:text-purple-600 transition-colors cursor-pointer">
                    {activity.subject}
                  </p>
                </Link>
                {activity.status === 'Blocked' && activity.blockedReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs font-semibold text-red-900 flex items-center gap-1.5 mb-1">
                      <span>⚠️</span> Blocked Reason
                    </p>
                    <p className="text-xs text-red-800 leading-relaxed">{activity.blockedReason}</p>
                  </div>
                )}
              </div>

              {/* Card Footer - Timestamps */}
              <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-600 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(activity.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {activity.updatedAt && activity.updatedAt !== activity.createdAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Closed:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(activity.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="px-5 py-3 border-t border-gray-100 bg-white space-y-3">
                {activity.status === 'InProgress' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(activity.id, 'Done')}
                      disabled={updating === activity.id}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating === activity.id ? '...' : '✓ Done'}
                    </button>
                    <button
                      onClick={() => handleStatusChange(activity.id, 'Blocked')}
                      disabled={updating === activity.id || (!isTeamLead && currentUser?.role !== 'admin')}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!isTeamLead && currentUser?.role !== 'admin' ? 'Only team leads can block activities' : ''}
                    >
                      {updating === activity.id ? '...' : '✕ Block'}
                    </button>
                  </div>
                ) : activity.status === 'Done' && currentUser?.role === 'admin' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(activity.id, 'Blocked')}
                      disabled={updating === activity.id}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating === activity.id ? '...' : '✕ Block'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-xs font-medium text-gray-600 py-2">
                    {activity.status === 'Done' ? '✓ Completed' : '✕ Blocked'}
                  </div>
                )}
                
                {/* Edit and Delete Buttons - Hidden for Done activities (except for admins) */}
                {(activity.status !== 'Done' || currentUser?.role === 'admin') && (
                  <div className="flex gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => handleEditClick(activity)}
                      disabled={updating === activity.id}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating === activity.id ? '...' : '✏️ Edit'}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(activity.id)}
                      disabled={updating === activity.id}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating === activity.id ? '...' : '🗑️ Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page <span className="font-semibold text-gray-900">{currentPage}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-0.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-md font-medium text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-purple-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <p className="text-gray-900 font-semibold mb-1 text-base">No activities found</p>
          <p className="text-gray-600 text-sm mb-6">Try adjusting your filters or start logging new activities</p>
          <Link
            href="/activities/create"
            className="inline-flex items-center px-4 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
            </svg>
            Log Activity
          </Link>
        </div>
      )}

      {/* Edit Activity Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <span className="text-xl">✏️</span>
                Edit Activity
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingActivityId(null);
                  setEditSubject('');
                  setEditDescription('');
                }}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="editSubject" className="block text-sm font-semibold text-gray-700 mb-2">
                  Activity Subject *
                </label>
                <input
                  id="editSubject"
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Enter activity subject..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editSubject.length > 0 ? `${editSubject.length} characters` : 'Required'}
                </p>
              </div>
              <div>
                <label htmlFor="editDescription" className="block text-sm font-semibold text-gray-700 mb-2">
                  Activity Description *
                </label>
                <textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter activity description..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors resize-none text-gray-900"
                  rows={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editDescription.length > 0 ? `${editDescription.length} characters` : 'Required'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingActivityId(null);
                  setEditSubject('');
                  setEditDescription('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSubject.trim() === '' || editDescription.trim() === '' || updating === editingActivityId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updating === editingActivityId ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>✏️</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Delete Activity
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingActivityId(null);
                }}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed">
                Are you sure you want to delete this activity? This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingActivityId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={updating === deletingActivityId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updating === deletingActivityId ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    Delete Activity
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Reason Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                <span className="text-xl">✕</span>
                Block Activity
              </h3>
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockingActivityId(null);
                  setBlockReason('');
                }}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="blockReason" className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for blocking *
                </label>
                <textarea
                  id="blockReason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Enter the reason why this activity is blocked..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-colors resize-none text-gray-900"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {blockReason.length > 0 ? `${blockReason.length} characters` : 'Required'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockingActivityId(null);
                  setBlockReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockActivity}
                disabled={blockReason.trim() === '' || updating === blockingActivityId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updating === blockingActivityId ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Blocking...
                  </>
                ) : (
                  <>
                    <span>✕</span>
                    Block Activity
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
