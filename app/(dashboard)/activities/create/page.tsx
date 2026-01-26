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
    quotaType: 'team', // 'team' or 'personal'
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

  // Check if submit should be disabled
  const isSubmitDisabled = Boolean(
    loading || (
      formData.isWfh &&
      wfhUsage &&
      !hasWfhOnDate &&
      (
        (wfhUsage.team && wfhUsage.team.remaining <= 0 && formData.quotaType === 'team') ||
        (wfhUsage.personal && wfhUsage.personal.remaining <= 0 && formData.quotaType === 'personal')
      )
    )
  );

  return (
    <div className="h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8 font-sans overflow-hidden flex items-center justify-center">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-white shadow-2xl rounded-2xl border border-gray-100 flex overflow-hidden">

        {/* Left Column: Context Sidebar */}
        <div className="w-1/3 min-w-[320px] bg-gray-50/80 border-r border-gray-100 flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-white hover:shadow-sm text-gray-500 transition-all"
              title="Back to Activities"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">New Activity</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                {jakartaDateTime.time} • Jakarta
              </div>
            </div>
          </div>

          {/* Sidebar Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Team Selection */}
            {userTeams.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Team Space</label>
                {userTeams.length === 1 ? (
                  <div className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 text-sm font-semibold flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      {userTeams[0].name}
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.teamId}
                      onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                      className="w-full appearance-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none shadow-sm transition-all"
                    >
                      <option value="">Select Team</option>
                      {userTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quota Selection */}
            {formData.teamId && wfhUsage && (wfhUsage.team || wfhUsage.personal) && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                  Quota Source
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-2">Required</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['team', 'personal'].map((type) => {
                    const usage = type === 'team' ? wfhUsage.team : wfhUsage.personal;
                    if (!usage) return null;
                    const isActive = formData.quotaType === type;
                    const isDisabled = usage.remaining <= 0;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, quotaType: type })}
                        disabled={isDisabled}
                        className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 ${isActive
                          ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-600 shadow-sm transform scale-[1.02]'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-purple-700' : 'text-gray-500'}`}>
                            {type}
                          </span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>}
                        </div>
                        <div className="text-lg font-bold text-gray-900 leading-none mb-0.5">
                          {usage.remaining}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">days left</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Project Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project</label>
              <div className="relative">
                <select
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value, projectOther: '' })}
                  className="w-full appearance-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none shadow-sm transition-all"
                >
                  <option value="">Select Project...</option>
                  <option value="MZA">MZA</option>
                  <option value="ZSMART">ZSMART</option>
                  <option value="CIRRUST">CIRRUST</option>
                  <option value="MANULIFE">MANULIFE</option>
                  <option value="MKM">MKM</option>
                  <option value="KANSAI">KANSAI</option>
                  <option value="BNIL">BNIL</option>
                  <option value="LIRIQ">LIRIQ</option>
                  <option value="SMART COURIER">SMART COURIER</option>
                  <option value="Others">Custom Project...</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {formData.project === 'Others' && (
                <input
                  type="text"
                  value={formData.projectOther}
                  onChange={(e) => setFormData({ ...formData, projectOther: e.target.value })}
                  className="w-full mt-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none shadow-sm animate-fade-in-down"
                  placeholder="Enter Project Name"
                  autoFocus
                />
              )}
            </div>

            {/* Date Time Compact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none shadow-sm"
                />
              </div>
            </div>

          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => setShowInfoPanel(true)}
              className="w-full py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-white hover:text-purple-600 hover:border-purple-200 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              View Quota Details
            </button>
          </div>
        </div>

        {/* Right Column: Main Content */}
        <div className="flex-1 flex flex-col h-full relative">
          {/* Top Actions / User */}
          <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-gray-900">{user?.username}</div>
              <div className="text-xs text-gray-500">Logged in</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-8 lg:p-10 h-full">

            {/* Form Content */}
            <div className="flex-1 flex flex-col space-y-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">What did you do?</h1>
                <p className="text-sm text-gray-500">Log your task efficiently. Markdown is supported.</p>
              </div>

              {/* Subject */}
              <div>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full text-lg font-bold placeholder-gray-300 border-b-2 border-gray-100 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
                  placeholder="Task Subject (e.g. Fixed login bug)"
                  required
                />
              </div>

              {/* Description */}
              <div className="flex-1 relative group">
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-full resize-none text-base text-gray-700 bg-gray-50/50 rounded-2xl p-6 focus:bg-white focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all border border-transparent focus:border-purple-200 leading-relaxed"
                  placeholder="Detailed description of your work..."
                  required
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-100">
              <div className="text-red-500 text-sm font-medium flex items-center gap-2">
                {error && (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2.5 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:transform-none"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Log Activity
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* Info Modal Popup (Matches new aesthetic) */}
        {showInfoPanel && (
          <div className="fixed inset-0 bg-gray-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100 ring-1 ring-gray-200">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Quota Status
                </h3>
                <button onClick={() => setShowInfoPanel(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 text-center space-y-6">
                {formData.teamId && wfhUsage && (
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="#f3f4f6" strokeWidth="12" fill="none" />
                      <circle
                        cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none"
                        className={(wfhUsage.remaining ?? 0) > 0 ? "text-purple-600" : "text-red-500"}
                        strokeDasharray={351}
                        strokeDashoffset={351 - (351 * Math.min(((wfhUsage.used ?? 0) / (wfhUsage.limit ?? 1)), 1))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-black ${(wfhUsage.remaining ?? 0) > 0 ? "text-gray-900" : "text-red-600"}`}>
                        {wfhUsage.remaining ?? 0}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Remaining</span>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-gray-900 font-bold mb-1">Monthly WFH Allowance</h4>
                  <p className="text-sm text-gray-500">
                    You&apos;ve used <span className="font-semibold text-gray-900">{wfhUsage?.used ?? 0}</span> of your <span className="font-semibold text-gray-900">{wfhUsage?.limit ?? 0}</span> available days.
                  </p>
                </div>

              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => setShowInfoPanel(false)}
                  className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
