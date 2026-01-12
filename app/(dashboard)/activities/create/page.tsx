'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { activityAPI, teamAPI } from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/lib/store';
import { Team } from '@/types';

// Get current date and time in Asia/Jakarta timezone
const getJakartaDateTime = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
};

export default function CreateActivityPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [redmineProjects, setRedmineProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const jakartaDateTime = getJakartaDateTime();
  const [formData, setFormData] = useState({
    date: jakartaDateTime.date,
    time: jakartaDateTime.time,
    subject: '',
    description: '',
    status: 'InProgress',
    isWfh: true,
    teamId: '',
    project: '',
    projectOther: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wfhUsage, setWfhUsage] = useState<{ team?: { used: number; limit: number; remaining: number }; personal?: { total: number; used: number; remaining: number }; summary?: { totalUsed: number; totalAvailable: number }; used?: number; limit?: number; remaining?: number } | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [hasWfhOnDate, setHasWfhOnDate] = useState(false);

  useEffect(() => {
    loadUserTeams();
  }, []);

  useEffect(() => {
    if (user?.id && formData.date) {
      checkWfhOnDate();
    }
  }, [formData.date, user?.id]);

  useEffect(() => {
    // If only one team exists, set it as default
    if (userTeams.length === 1 && !formData.teamId) {
      setFormData(prev => ({
        ...prev,
        teamId: userTeams[0].id,
        isWfh: true // Default to WFH activity
      }));
    } else if (userTeams.length > 1 && !formData.teamId && userTeams.length > 0) {
      // For multiple teams, set first as default
      setFormData(prev => ({
        ...prev,
        teamId: userTeams[0].id,
        isWfh: true // Default to WFH activity
      }));
    }
  }, [userTeams]);

  useEffect(() => {
    // Load WFH usage when team is selected
    if (formData.teamId && formData.isWfh) {
      loadWfhUsage();
    }
  }, [formData.teamId, formData.isWfh]);

  const checkWfhOnDate = async () => {
    try {
      const response = await activityAPI.getActivities({
        startDate: formData.date,
        endDate: formData.date,
        userId: user?.id,
        limit: 100 // Ensure we get enough to check
      });
      const activities = response.data.activities || response.data;
      if (Array.isArray(activities)) {
        const found = activities.some((a: any) => a.isWfh);
        setHasWfhOnDate(found);
      }
    } catch (err) {
      console.error('Failed to check WFH activities for date:', err);
    }
  };

  const loadUserTeams = async () => {
    try {
      const response = await teamAPI.getTeams();
      setUserTeams(response.data.teams);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setUserTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const loadWfhUsage = async () => {
    try {
      const response = await teamAPI.getWfhUsage(formData.teamId);
      setWfhUsage(response.data);
    } catch (err) {
      console.error('Failed to load WFH usage:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.subject.trim()) {
      const errorMsg = 'Activity subject is required';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errorMsg,
      });
      return;
    }

    if (!formData.description.trim()) {
      const errorMsg = 'Activity description is required';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errorMsg,
      });
      return;
    }

    if (!formData.project) {
      const errorMsg = 'Project selection is required';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errorMsg,
      });
      return;
    }

    if (formData.project === 'Others' && !formData.projectOther.trim()) {
      const errorMsg = 'Please enter a custom project name';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errorMsg,
      });
      return;
    }

    // Check WFH limit
    if (formData.isWfh && wfhUsage) {
      // Support both old and new response formats
      const totalRemaining = wfhUsage.summary?.totalAvailable ?
        (wfhUsage.summary.totalAvailable - wfhUsage.summary.totalUsed) :
        (wfhUsage.remaining ?? 0);

      if (totalRemaining <= 0 && !hasWfhOnDate) {
        const teamUsed = wfhUsage.team?.used ?? wfhUsage.used ?? 0;
        const teamLimit = wfhUsage.team?.limit ?? wfhUsage.limit ?? 3;
        const personalUsed = wfhUsage.personal?.used ?? 0;
        const personalTotal = wfhUsage.personal?.total ?? 0;

        const errorMsg = `WFH limit exceeded. Team: ${teamUsed}/${teamLimit}, Personal: ${personalUsed}/${personalTotal}`;
        setError(errorMsg);
        addNotification({
          type: 'error',
          title: 'WFH Limit Exceeded',
          message: errorMsg,
        });
        return;
      }
    }

    setLoading(true);

    try {
      const finalProject = formData.project === 'Others' ? formData.projectOther : formData.project;

      const activityData = {
        date: formData.date,
        time: formData.time,
        subject: formData.subject,
        description: formData.description,
        status: formData.status,
        isWfh: formData.isWfh,
        teamId: formData.teamId || undefined,
        project: finalProject,
      };

      await activityAPI.createActivity(activityData);
      addNotification({
        type: 'success',
        title: 'Success',
        message: formData.isWfh
          ? `Activity logged as WFH (${wfhUsage?.remaining ? wfhUsage.remaining - 1 : 0} remaining this month)`
          : 'Activity logged successfully',
      });
      router.push('/activities');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create activity';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return '✓';
      case 'InProgress': return '⟳';
      case 'Blocked': return '✕';
      default: return '○';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-10 space-y-8">
          {/* Info Button - Top Right */}
          <div className="flex justify-end -mt-2 -mr-2">
            <button
              type="button"
              onClick={() => setShowInfoPanel(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700 font-medium"
              title="View WFH & Quota Information"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">info</span>
            </button>
          </div>

          {/* User and Team Info - Compact Card */}
          {!teamsLoading && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{user?.username?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600">Logged in as</p>
                    <p className="text-base font-semibold text-gray-900">{user?.username}</p>
                  </div>
                </div>
                {userTeams.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-end max-w-xs">
                    {userTeams.map((team) => (
                      <span
                        key={team.id}
                        className="inline-flex px-3 py-1 bg-white text-purple-700 rounded-full text-xs font-semibold border border-purple-200 shadow-sm"
                      >
                        {team.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team Selection */}
          {userTeams.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Team <span className="text-red-600">*</span>
              </label>
              {userTeams.length === 1 ? (
                <div className="w-full px-4 py-3 border border-purple-200 rounded-lg bg-purple-50 text-gray-700 font-medium flex items-center justify-between hover:border-purple-300 transition-colors">
                  <span>{userTeams[0].name}</span>
                  <span className="text-xs px-2.5 py-1 bg-purple-600 text-white rounded-full font-semibold">Auto</span>
                </div>
              ) : (
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white hover:border-gray-400"
                  required
                >
                  <option value="">Select a team</option>
                  {userTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Project <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.project}
              onChange={(e) => setFormData({ ...formData, project: e.target.value, projectOther: '' })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white hover:border-gray-400"
              required
            >
              <option value="">Select a project</option>
              <option value="MZA">MZA</option>
              <option value="ZSMART">ZSMART</option>
              <option value="CIRRUST">CIRRUST</option>
              <option value="MANULIFE">MANULIFE</option>
              <option value="MKM">MKM</option>
              <option value="KANSAI">KANSAI</option>
              <option value="BNIL">BNIL</option>
              <option value="LIRIQ">LIRIQ</option>
              <option value="SMART COURIER">SMART COURIER</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Project Others - Free Text Field */}
          {formData.project === 'Others' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Project Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.projectOther}
                onChange={(e) => setFormData({ ...formData, projectOther: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white hover:border-gray-400"
                placeholder="Enter custom project name"
                required
              />
            </div>
          )}

          {/* WFH Quota Display - Main Form */}
          {formData.teamId && wfhUsage && (
            <div>
              {/* Team Quota */}
              {wfhUsage.team && (
                <div className={`rounded-lg p-5 border-2 mb-3 ${wfhUsage.team.remaining > 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${wfhUsage.team.remaining > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        Team WFH Quota
                      </p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-3xl font-bold ${wfhUsage.team.remaining > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {wfhUsage.team.remaining}
                        </p>
                        <p className={`text-sm font-medium ${wfhUsage.team.remaining > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          / {wfhUsage.team.limit} days
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col items-end gap-2">
                      <div className="w-full">
                        <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${wfhUsage.team.remaining > 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min((wfhUsage.team.used / wfhUsage.team.limit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className={`text-xs font-medium ${wfhUsage.team.remaining > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {Math.round((wfhUsage.team.used / wfhUsage.team.limit) * 100)}% used
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Quota */}
              {wfhUsage.personal && (
                <div className={`rounded-lg p-5 border-2 ${wfhUsage.personal.remaining > 0 ? 'bg-purple-50 border-purple-300' : 'bg-orange-50 border-orange-300'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${wfhUsage.personal.remaining > 0 ? 'text-purple-700' : 'text-orange-700'}`}>
                        Personal WFH Quota (from rewards)
                      </p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-3xl font-bold ${wfhUsage.personal.remaining > 0 ? 'text-purple-600' : 'text-orange-600'}`}>
                          {wfhUsage.personal.remaining}
                        </p>
                        <p className={`text-sm font-medium ${wfhUsage.personal.remaining > 0 ? 'text-purple-600' : 'text-orange-600'}`}>
                          / {wfhUsage.personal.total} days
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col items-end gap-2">
                      <div className="w-full">
                        <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${wfhUsage.personal.remaining > 0 ? 'bg-purple-500' : 'bg-orange-500'}`}
                            style={{ width: `${wfhUsage.personal.total > 0 ? Math.min((wfhUsage.personal.used / wfhUsage.personal.total) * 100, 100) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className={`text-xs font-medium ${wfhUsage.personal.remaining > 0 ? 'text-purple-700' : 'text-orange-700'}`}>
                        {wfhUsage.personal.total > 0 ? Math.round((wfhUsage.personal.used / wfhUsage.personal.total) * 100) : 0}% used
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback for old format */}
              {wfhUsage.remaining !== undefined && !wfhUsage.team && (
                <div className={`rounded-lg p-5 border-2 ${(wfhUsage.remaining ?? 0) > 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${(wfhUsage.remaining ?? 0) > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        WFH Quota Remaining
                      </p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-4xl font-bold ${(wfhUsage.remaining ?? 0) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {wfhUsage.remaining ?? 0}
                        </p>
                        <p className={`text-sm font-medium ${(wfhUsage.remaining ?? 0) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          / {wfhUsage.limit ?? 3} days
                        </p>
                      </div>
                      <p className={`text-xs mt-2 ${(wfhUsage.remaining ?? 0) > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {(wfhUsage.remaining ?? 0) > 0
                          ? `You can log ${wfhUsage.remaining ?? 0} more WFH activities`
                          : 'Limit reached - no more WFH activities allowed'}
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col items-end gap-2">
                      <div className="w-full">
                        <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all ${(wfhUsage.remaining ?? 0) > 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(((wfhUsage.used ?? 0) / (wfhUsage.limit ?? 3)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <p className={`text-xs font-medium ${(wfhUsage.remaining ?? 0) > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                        {Math.round(((wfhUsage.used ?? 0) / (wfhUsage.limit ?? 3)) * 100)}% used ({wfhUsage.used ?? 0}/{wfhUsage.limit ?? 3})
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date and Time Section */}
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
            <p className="text-sm font-semibold text-gray-900 mb-4">
              When the activity actually happened?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Time <span className="text-red-600">*</span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Subject <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white hover:border-gray-400"
              placeholder="Brief title of the activity (e.g., 'Fixed login bug', 'Completed UI design')"
              required
            />
            <p className="text-xs text-gray-500 mt-2">Keep it concise and descriptive</p>
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none bg-white hover:border-gray-400"
              placeholder="Describe what you accomplished... Be specific about what was done, any challenges, and results."
              rows={6}
              required
            />
            <p className="text-xs text-gray-500 mt-2">Tip: Be specific • Mention challenges • Include outcomes</p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-8 border-t-2 border-gray-200">
            <button
              type="submit"
              disabled={loading || (formData.isWfh && wfhUsage && !hasWfhOnDate ? (wfhUsage.summary ? (wfhUsage.summary.totalAvailable - wfhUsage.summary.totalUsed) <= 0 : (wfhUsage.remaining ?? 0) <= 0) : false)}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl hover:shadow-xl hover:shadow-purple-300 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 text-base"
              title={formData.isWfh && wfhUsage && !hasWfhOnDate && (wfhUsage.summary ? (wfhUsage.summary.totalAvailable - wfhUsage.summary.totalUsed) <= 0 : (wfhUsage.remaining ?? 0) <= 0) ? 'WFH quota exceeded for this month' : ''}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : formData.isWfh && wfhUsage && !hasWfhOnDate && (wfhUsage.summary ? (wfhUsage.summary.totalAvailable - wfhUsage.summary.totalUsed) <= 0 : (wfhUsage.remaining ?? 0) <= 0) ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 112.5 5.5h2.016A6 6 0 0012 4c3.314 0 6 2.686 6 6 0 .26-.016.52-.048.776l2.086-.587A.5.5 0 0121 9.5v-4a.5.5 0 00-.5-.5h-4a.5.5 0 00-.467.683l.72 2.16a.5.5 0 00.466.317h2.01A5 5 0 107 9.5a.5.5 0 00-1 0 6 6 0 106.477-4.61z" clipRule="evenodd" />
                  </svg>
                  <span>Quota Exceeded</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.707 9.293a1 1 0 10-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                  <span>Log Activity</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 hover:border-gray-400 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Info Modal Popup */}
        {showInfoPanel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
              {/* Modal Header - Gradient */}
              <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Information</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfoPanel(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                {/* Quota Display - Enhanced */}
                {formData.teamId && wfhUsage && (
                  <div className={`rounded-lg overflow-hidden border-2 transition-all ${(wfhUsage.remaining ?? 0) > 0 ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-300' : 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-300'}`}>
                    {/* Header */}
                    <div className={`px-4 py-3 ${(wfhUsage.remaining ?? 0) > 0 ? 'bg-blue-100/50' : 'bg-red-100/50'}`}>
                      <p className="font-bold text-gray-900 text-sm text-center">📊 Your Monthly Quota Status</p>
                    </div>

                    {/* Main Content */}
                    <div className="px-4 py-4 space-y-3">
                      {/* Big Number Display */}
                      <div className="text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className={`text-4xl font-black ${(wfhUsage.remaining ?? 0) > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {(wfhUsage.remaining ?? 0) > 0 ? (wfhUsage.remaining ?? 0) : '0'}
                          </div>
                          <p className={`text-xs font-semibold ${(wfhUsage.remaining ?? 0) > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                            {(wfhUsage.remaining ?? 0) === 1 ? 'day remaining' : 'days remaining'}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-xs font-semibold text-gray-700">Usage Progress</p>
                          <p className="text-xs font-bold text-gray-700">{Math.round(((wfhUsage.used ?? 0) / (wfhUsage.limit ?? 1)) * 100)}%</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-sm">
                          <div
                            className={`h-3 rounded-full transition-all ${(wfhUsage.remaining ?? 0) > 0 ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700' : 'bg-gradient-to-r from-red-500 via-red-600 to-red-700'}`}
                            style={{ width: `${Math.min(((wfhUsage.used ?? 0) / (wfhUsage.limit ?? 1)) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={`px-3 py-2 rounded-lg text-center font-semibold text-xs ${(wfhUsage.remaining ?? 0) > 0 ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                        {(wfhUsage.remaining ?? 0) > 0
                          ? `✓ You can log ${wfhUsage.remaining ?? 0} more WFH activit${(wfhUsage.remaining ?? 0) === 1 ? 'y' : 'ies'} this month`
                          : '⛔ WFH quota limit reached for this month'}
                      </div>

                      {/* Info Message */}
                      <div className={`px-3 py-2 rounded-lg text-xs font-medium ${(wfhUsage.remaining ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        <p>
                          {(wfhUsage.remaining ?? 0) > 0
                            ? `${Math.ceil(((wfhUsage.remaining ?? 0) / (wfhUsage.limit ?? 1)) * 100)}% of your quota available`
                            : 'No WFH activities can be logged until next month'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* What is WFH Section */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3.5 border-2 border-orange-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">All activities logged as WFH</p>
                      <p className="text-xs text-gray-700 mt-1">Counted toward monthly quota limit</p>
                    </div>
                  </div>
                </div>

                {/* Tips - Compact */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg p-3.5 border-2 border-indigo-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-lg">
                      💡
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm mb-1.5">Quick Tips</p>
                      <ul className="text-xs text-gray-700 space-y-0.5">
                        <li>• Be specific & clear</li>
                        <li>• Mention challenges</li>
                        <li>• Include outcomes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 px-6 py-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInfoPanel(false)}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-300 transition-all font-semibold text-sm"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
