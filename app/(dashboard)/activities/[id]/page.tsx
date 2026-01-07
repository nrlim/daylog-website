'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { activityAPI } from '@/lib/api';
import { Activity } from '@/types';
import { useNotificationStore } from '@/lib/store';

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.id as string;
  const { addNotification } = useNotificationStore();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editData, setEditData] = useState({
    subject: '',
    description: '',
    status: '',
    blockedReason: '',
  });

  const loadActivityDetails = async () => {
    try {
      setLoading(true);
      // Fetch activity by ID directly
      const response = await activityAPI.getActivityById(activityId);
      const found = response.data.activity;
      
      if (!found) {
        setError('Activity not found');
        return;
      }
      
      setActivity(found);
      // Initialize edit data with current activity values
      setEditData({
        subject: found.subject,
        description: found.description,
        status: found.status,
        blockedReason: found.blockedReason || '',
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load activity details';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivityDetails();
  }, [activityId]);

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (activity) {
      setEditData({
        subject: activity.subject,
        description: activity.description,
        status: activity.status,
        blockedReason: activity.blockedReason || '',
      });
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editData.subject.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Subject is required',
      });
      return;
    }

    if (!editData.description.trim()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Description is required',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        subject: editData.subject,
        description: editData.description,
        status: editData.status,
      };

      if (editData.status === 'Blocked' && editData.blockedReason) {
        updateData.blockedReason = editData.blockedReason;
      }

      await activityAPI.updateActivity(activityId, updateData);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Activity updated successfully',
      });
      setIsEditing(false);
      loadActivityDetails();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update activity';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await activityAPI.deleteActivity(activityId);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Activity deleted successfully',
      });
      router.push('/activities');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete activity';
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600"></div>
        </div>
        <p className="text-gray-600 font-medium">Loading activity details...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Activity Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The activity you are looking for does not exist.'}</p>
          <Link href="/activities" className="text-purple-600 hover:text-purple-700 font-semibold">
            ← Back to Activities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/activities" className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-flex items-center gap-1">
            ← Back to Activities
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">{activity.subject}</h1>
          <p className="text-gray-600 mt-2">
            By <span className="font-semibold">{activity.user.username}</span> on{' '}
            <span className="font-semibold">
              {new Date(activity.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </p>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center gap-2"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm flex items-center gap-2"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Activity Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Mode */}
          {isEditing ? (
            <>
              {/* Edit Mode Header */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">✏️</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-blue-900 mb-1">Editing Activity</h2>
                    <p className="text-base font-semibold text-blue-800 break-words">{editData.subject || '(Untitled Activity)'}</p>
                  </div>
                </div>
              </div>

              {/* Subject Field */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Subject <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editData.subject}
                  onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter activity subject..."
                />
              </div>

              {/* Status Selector */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Status <span className="text-red-600">*</span>
                </label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="InProgress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              {/* Blocked Reason (if status is Blocked) */}
              {editData.status === 'Blocked' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Blocked Reason
                  </label>
                  <textarea
                    value={editData.blockedReason}
                    onChange={(e) => setEditData({ ...editData, blockedReason: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Why is this activity blocked?"
                  />
                </div>
              )}

              {/* Description Field */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={8}
                  placeholder="Enter activity description..."
                />
              </div>

              {/* Edit Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : '✓ Save Changes'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Status & Details</h2>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold gap-1.5 ${getStatusColor(activity.status)}`}>
                {activity.status === 'Done' && '✓'}
                {activity.status === 'InProgress' && '○'}
                {activity.status === 'Blocked' && '✕'}
                {activity.status === 'InProgress' ? 'In Progress' : activity.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Date</p>
                <p className="text-gray-900 font-semibold">
                  {new Date(activity.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {activity.time && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Time</p>
                  <p className="text-gray-900 font-semibold">{activity.time}</p>
                </div>
              )}
              {activity.project && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Project</p>
                  <p className="text-gray-900 font-semibold">{activity.project}</p>
                </div>
              )}
              {activity.isWfh && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Work Location</p>
                  <p className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                    🏠 Work From Home
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{activity.description}</p>
            </div>
          </div>

          {/* Blocked Reason */}
          {activity.status === 'Blocked' && activity.blockedReason && (
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <h2 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                <span>⚠️</span> Blocked Reason
              </h2>
              <p className="text-red-800 leading-relaxed whitespace-pre-wrap">{activity.blockedReason}</p>
            </div>
          )}
            </>
          )}
        </div>

        {/* Right Column - Sidebar */}
        {!isEditing && (
        <div className="lg:col-span-1">
          {/* Timestamps Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Activity Timeline</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Created</p>
                <p className="text-sm text-gray-900 font-semibold">
                  {new Date(activity.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {activity.updatedAt && activity.updatedAt !== activity.createdAt && (
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Last Updated</p>
                  <p className="text-sm text-gray-900 font-semibold">
                    {new Date(activity.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Activity Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">User</p>
                <p className="text-sm text-gray-900 font-semibold">{activity.user.username}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Activity ID</p>
                <p className="text-xs text-gray-600 font-mono break-all">{activity.id}</p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2M3 7h18M5 5h14" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Activity?</h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to delete this activity? This action cannot be undone.
            </p>
            <p className="text-sm font-semibold text-gray-900 text-center mb-6 px-4 py-2 bg-gray-50 rounded-lg">
              &quot;{activity.subject}&quot;
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>🗑️ Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
