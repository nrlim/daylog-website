'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useNotificationStore, useAuthStore } from '@/lib/store';

interface Issue {
  id: number;
  project: { id: number; name: string; is_private?: boolean };
  tracker: { id: number; name: string };
  status: { id: number; name: string };
  priority: { id: number; name: string };
  subject: string;
  description: string;
  author: { id: number; name: string };
  assigned_to?: { id: number; name: string };
  created_on: string;
  updated_on: string;
}

interface Column {
  id: number;
  name: string;
  bgColor: string;
  headerColor: string;
  issues: Issue[];
}

const STATUS_IDS = {
  NEW: 1,
  IN_PROGRESS: 2,
  READY_TO_TEST: 3,
  TESTING: 4,
  CLOSED: 5,
  REOPEN: 8,
  ON_HOLD: 9,
  DROPPED: 6,
};

const COLUMNS: Column[] = [
  { id: STATUS_IDS.NEW, name: 'New', bgColor: 'bg-blue-900/20', headerColor: 'bg-blue-600', issues: [] },
  { id: STATUS_IDS.IN_PROGRESS, name: 'In Progress', bgColor: 'bg-yellow-900/20', headerColor: 'bg-yellow-600', issues: [] },
  { id: STATUS_IDS.READY_TO_TEST, name: 'Ready to Test', bgColor: 'bg-purple-900/20', headerColor: 'bg-purple-600', issues: [] },
  { id: STATUS_IDS.TESTING, name: 'Testing', bgColor: 'bg-orange-900/20', headerColor: 'bg-orange-600', issues: [] },
  { id: STATUS_IDS.CLOSED, name: 'Closed', bgColor: 'bg-green-900/20', headerColor: 'bg-green-600', issues: [] },
  { id: STATUS_IDS.REOPEN, name: 'Re-Open', bgColor: 'bg-cyan-900/20', headerColor: 'bg-cyan-600', issues: [] },
  { id: STATUS_IDS.ON_HOLD, name: 'On Hold', bgColor: 'bg-gray-900/20', headerColor: 'bg-gray-600', issues: [] },
  { id: STATUS_IDS.DROPPED, name: 'Dropped', bgColor: 'bg-red-900/20', headerColor: 'bg-red-700', issues: [] },
];

export default function RedmineTicketsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [columns, setColumns] = useState<Column[]>(COLUMNS);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [trackerFilter, setTrackerFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentRedmineUserId, setCurrentRedmineUserId] = useState<number | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [isViewMode, setIsViewMode] = useState(true);
  const [hiddenColumns, setHiddenColumns] = useState<number[]>([STATUS_IDS.CLOSED, STATUS_IDS.DROPPED, STATUS_IDS.ON_HOLD]);

  // Fetch Redmine user and projects on mount
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const initializeBoard = async () => {
      try {
        // Fetch current Redmine user, projects, and trackers in parallel
        const [userRes, projectsRes, trackersRes] = await Promise.all([
          api.get('/redmine/user/current').catch(() => null),
          api.get('/redmine/projects'),
          api.get('/redmine/trackers'),
        ]);

        console.log('User response:', userRes?.data);
        
        if (userRes?.data?.user?.id) {
          setAssigneeFilter(userRes.data.user.id.toString());
          setCurrentRedmineUserId(userRes.data.user.id);
          console.log('Current Redmine user ID set to:', userRes.data.user.id);
        } else {
          setAssigneeFilter('all');
          setCurrentRedmineUserId(null);
          console.warn('Could not fetch current user ID');
        }

        if (projectsRes?.data?.projects) {
          setProjects(projectsRes.data.projects);
        }
        
        if (trackersRes?.data?.trackers) {
          setTrackers(trackersRes.data.trackers);
          console.log('Trackers loaded:', trackersRes.data.trackers);
        }
      } catch (error) {
        console.error('Failed to initialize board:', error);
        setAssigneeFilter('all');
      }
    };

    initializeBoard();
  }, [user, router]);

  // Fetch all issues and organize by status
  const fetchIssues = async () => {
    try {
      setLoading(true);
      
      const params: Record<string, any> = { limit: 100 };
      if (projectFilter !== 'all') params.project_id = projectFilter;
      if (assigneeFilter !== 'all') params.assigned_to_id = parseInt(assigneeFilter);
      if (trackerFilter !== 'all') params.tracker_id = parseInt(trackerFilter);
      if (versionFilter !== 'all') params.fixed_version_id = parseInt(versionFilter);
      
      const response = await api.get('/redmine/issues', { params });
      const allIssues = response.data.issues || [];

      // Organize issues by status in single pass with Map for O(1) lookups
      const issuesByStatus = new Map<number, Issue[]>();
      
      columns.forEach(col => issuesByStatus.set(col.id, []));

      allIssues.forEach((issue: Issue) => {
        const statusId = issue.status.id;
        if (issuesByStatus.has(statusId)) {
          issuesByStatus.get(statusId)!.push(issue);
        }
      });

      // Update columns
      setColumns((prevColumns) => prevColumns.map((col) => ({
        ...col,
        issues: issuesByStatus.get(col.id) || [],
      })));
      
      // Fetch all assignees separately (without filters) to keep dropdown complete
      if (assignees.length === 0) {
        const allIssuesResponse = await api.get('/redmine/issues', { params: { limit: 1000 } });
        const assigneeMap = new Map<number, any>();
        allIssuesResponse.data.issues?.forEach((issue: Issue) => {
          if (issue.assigned_to && !assigneeMap.has(issue.assigned_to.id)) {
            assigneeMap.set(issue.assigned_to.id, issue.assigned_to);
          }
        });
        setAssignees(Array.from(assigneeMap.values()));
      }
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Issues',
        message: error.message || 'Unknown error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (columns.length > 0) {
      fetchIssues();
    }
  }, [projectFilter, assigneeFilter, trackerFilter, versionFilter]);

  // Fetch versions when project changes
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        if (projectFilter !== 'all') {
          const response = await api.get(`/redmine/projects/${projectFilter}/versions`);
          setVersions(response.data.versions || []);
        } else {
          setVersions([]);
        }
      } catch (error) {
        setVersions([]);
      }
    };
    fetchVersions();
  }, [projectFilter]);

  const handleDragStart = (e: React.DragEvent, issue: Issue) => {
    setDraggedIssue(issue);
    e.dataTransfer!.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: number) => {
    e.preventDefault();
    if (!draggedIssue) return;

    // If same status, just return
    if (draggedIssue.status.id === targetColumnId) {
      setDraggedIssue(null);
      return;
    }

    try {
      setUpdating(true);

      // Update status via API
      const response = await api.put(`/redmine/issues/${draggedIssue.id}`, {
        statusId: targetColumnId,
      });

      // Refetch issues to get updated data from server
      await fetchIssues();

      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Ticket #${draggedIssue.id} moved to ${columns.find((c) => c.id === targetColumnId)?.name}`,
        duration: 3000,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to Update Status',
        message: error.response?.data?.error || error.message,
        duration: 5000,
      });
    } finally {
      setUpdating(false);
      setDraggedIssue(null);
    }
  };

  const getTrackerLabel = (trackerName: string) => {
    const name = trackerName.toLowerCase();
    if (name.includes('bug')) {
      return {
        bgColor: 'bg-red-900/30 border-red-600/50',
        textColor: 'text-red-300',
        label: 'Bug',
      };
    } else if (name.includes('feature')) {
      return {
        bgColor: 'bg-green-900/30 border-green-600/50',
        textColor: 'text-green-300',
        label: 'Feature',
      };
    } else if (name.includes('task')) {
      return {
        bgColor: 'bg-blue-900/30 border-blue-600/50',
        textColor: 'text-blue-300',
        label: 'Task',
      };
    } else if (name.includes('subtask')) {
      return {
        bgColor: 'bg-purple-900/30 border-purple-600/50',
        textColor: 'text-purple-300',
        label: 'Subtask',
      };
    }
    return {
      bgColor: 'bg-slate-700/30 border-slate-600/50',
      textColor: 'text-slate-300',
      label: trackerName,
    };
  };

  const getTotalIssueCount = () => {
    return columns.reduce((sum, col) => sum + col.issues.length, 0);
  };

  const getPriorityColor = (priorityName: string) => {
    const name = priorityName.toLowerCase();
    if (name.includes('low')) {
      return 'bg-gray-700 text-gray-300';
    } else if (name.includes('normal')) {
      return 'bg-blue-700 text-blue-300';
    } else if (name.includes('high')) {
      return 'bg-orange-700 text-orange-300';
    } else if (name.includes('urgent') || name.includes('immediate')) {
      return 'bg-red-700 text-red-300';
    }
    return 'bg-slate-700 text-slate-300';
  };

  const toggleColumnVisibility = (columnId: number) => {
    setHiddenColumns((prev) => 
      prev.includes(columnId) 
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const visibleColumns = columns.filter((col) => !hiddenColumns.includes(col.id));

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Loading Overlay for Card Movement */}
      {updating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 shadow-2xl border border-slate-600 flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-semibold text-lg">Updating ticket status...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 shadow-lg flex-shrink-0">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-white">Daylog Board</h1>
              <span className="text-sm font-medium text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
                {getTotalIssueCount()} tasks
              </span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
            >
              Create Ticket
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
            >
              <option value="all">All Projects</option>
              {projects.map((proj) => (
                <option key={proj?.id} value={proj?.id}>
                  {proj?.name}
                </option>
              ))}
            </select>
            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              disabled={projectFilter === 'all'}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Versions</option>
              {versions.map((version) => (
                <option key={version?.id} value={version?.id}>
                  {version?.name}
                </option>
              ))}
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
            >
              <option value="all">All Assignees</option>
              {assignees.map((assignee) => (
                <option key={assignee?.id} value={assignee?.id}>
                  {assignee?.name}
                </option>
              ))}
            </select>
            <select
              value={trackerFilter}
              onChange={(e) => setTrackerFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
            >
              <option value="all">All Trackers</option>
              {trackers.map((tracker) => (
                <option key={tracker?.id} value={tracker?.id}>
                  {tracker?.name}
                </option>
              ))}
            </select>
            
            {/* Column Visibility Filters */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-600">
              <span className="text-xs text-slate-400 font-medium">Show:</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={!hiddenColumns.includes(STATUS_IDS.CLOSED)}
                  onChange={() => toggleColumnVisibility(STATUS_IDS.CLOSED)}
                  className="w-3.5 h-3.5 rounded border-slate-500 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                />
                Closed
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={!hiddenColumns.includes(STATUS_IDS.ON_HOLD)}
                  onChange={() => toggleColumnVisibility(STATUS_IDS.ON_HOLD)}
                  className="w-3.5 h-3.5 rounded border-slate-500 text-gray-600 focus:ring-2 focus:ring-gray-500 cursor-pointer"
                />
                On Hold
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={!hiddenColumns.includes(STATUS_IDS.DROPPED)}
                  onChange={() => toggleColumnVisibility(STATUS_IDS.DROPPED)}
                  className="w-3.5 h-3.5 rounded border-slate-500 text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
                />
                Dropped
              </label>
            </div>
            
            <span className="text-xs text-slate-400 ml-auto">Drag tasks to update status • Click to edit</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-slate-700 border-t-blue-500"></div>
            </div>
            <p className="text-slate-300 font-semibold">Loading tasks...</p>
          </div>
        </div>
      )}

      {/* Kanban Board - Fullscreen */}
      {!loading && (
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          {/* Columns Container - Responsive without horizontal scroll */}
          <div className="flex gap-3 flex-1 min-h-0">
            {visibleColumns.map((column) => (
              <div
                key={column.id}
                className="flex-1 min-w-0 flex flex-col bg-slate-700/30 rounded-lg border border-slate-600 overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`${column.headerColor} px-3 py-2 font-bold text-white shadow-md flex justify-between items-center flex-shrink-0`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{column.name}</span>
                  </div>
                  <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
                    {column.issues.length}
                  </span>
                </div>

                {/* Issues List - Scrollable */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                  {column.issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 h-full">
                      <p className="text-xs font-medium">No tasks</p>
                    </div>
                  ) : (
                    column.issues.map((issue) => {
                      const trackerLabel = getTrackerLabel(issue.tracker.name);
                      
                      return (
                        <div
                          key={issue.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, issue)}
                          onClick={() => setSelectedIssue(issue)}
                          className="bg-slate-800/80 border border-slate-600 rounded-lg cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group overflow-hidden"
                        >
                          <div className="p-3 flex flex-col h-full">
                            {/* Top row: Type + ID */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className={`font-bold text-sm px-2 py-1 rounded ${trackerLabel.bgColor} ${trackerLabel.textColor}`}>
                                {trackerLabel.label.toUpperCase()} #{issue.id}
                              </span>
                            </div>

                            {/* Subject - Main content */}
                            <p className="text-sm font-semibold text-white line-clamp-2 group-hover:text-blue-200 transition-colors leading-tight mb-3 flex-1">
                              {issue.subject}
                            </p>

                            {/* Divider */}
                            <div className="border-t border-slate-600 mb-2" />

                            {/* Bottom row: Project and Assignee */}
                            <div className="space-y-1">
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-500">Project:</span>
                                <span className="text-slate-300 ml-1">{issue.project.name}</span>
                              </div>
                              <div className="text-xs text-slate-400">
                                <span className="text-slate-500">Assignee:</span>
                                <span className="text-slate-300 ml-1">
                                  {issue.assigned_to ? issue.assigned_to.name : 'Unassigned'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-blue-400 bg-blue-900/40 px-2 py-1 rounded">
                    #{selectedIssue.id}
                  </span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${getPriorityColor(selectedIssue.priority.name)}`}>
                    {selectedIssue.priority.name}
                  </span>
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-700 text-slate-200 rounded">
                    {selectedIssue.status.name}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedIssue.subject}</h2>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-white transition-colors font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
                <p className="text-slate-200 text-sm bg-slate-700/30 p-3 rounded border border-slate-600">
                  {selectedIssue.description || 'No description provided'}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 mb-2">Project</h3>
                  <p className="text-sm text-slate-200 bg-slate-700/30 p-2 rounded">{selectedIssue.project.name}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 mb-2">Type</h3>
                  <p className="text-sm text-slate-200 bg-slate-700/30 p-2 rounded">{selectedIssue.tracker.name}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 mb-2">Author</h3>
                  <p className="text-sm text-slate-200 bg-slate-700/30 p-2 rounded">{selectedIssue.author.name}</p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 mb-2">Assignee</h3>
                  <p className="text-sm text-slate-200 bg-slate-700/30 p-2 rounded">
                    {selectedIssue.assigned_to?.name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 mb-2">Created</h3>
                  <p className="text-sm text-slate-200 bg-slate-700/30 p-2 rounded">
                    {new Date(selectedIssue.created_on).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 mb-2">Updated</h3>
                  <p className="text-sm text-slate-200 bg-slate-700/30 p-2 rounded">
                    {new Date(selectedIssue.updated_on).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-600">
                <button
                  onClick={() => {
                    setEditingIssue(selectedIssue);
                    setIsViewMode(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  const payload = {
                    subject: formData.get('subject'),
                    description: formData.get('description'),
                    project_id: formData.get('project_id'),
                    tracker_id: formData.get('tracker_id'),
                    priority_id: formData.get('priority_id'),
                    assigned_to_id: currentRedmineUserId,
                  };
                  console.log('Creating ticket with payload:', payload);
                  
                  const response = await api.post('/redmine/issues', payload);
                  addNotification({
                    type: 'success',
                    title: 'Ticket Created',
                    message: 'New ticket has been created successfully',
                    duration: 3000,
                  });
                  setShowCreateModal(false);
                  // Refresh issues
                  window.location.reload();
                } catch (error: any) {
                  addNotification({
                    type: 'error',
                    title: 'Failed to Create Ticket',
                    message: error.response?.data?.error || error.message || 'Unknown error occurred',
                    duration: 5000,
                  });
                }
              }}>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    required
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ticket subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ticket description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Project *</label>
                    <select
                      name="project_id"
                      required
                      className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Priority *</label>
                    <select
                      name="priority_id"
                      required
                      className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">Low</option>
                      <option value="2" selected>Normal</option>
                      <option value="3">High</option>
                      <option value="4">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Type *</label>
                  <select
                    name="tracker_id"
                    required
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {trackers.length > 0 ? (
                      trackers.map((tracker) => (
                        <option key={tracker.id} value={tracker.id}>
                          {tracker.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Loading trackers...</option>
                    )}
                  </select>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-600">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
                  >
                    Create Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingIssue && !isViewMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Edit Ticket #{editingIssue.id}</h2>
              <button
                onClick={() => {
                  setEditingIssue(null);
                  setIsViewMode(true);
                }}
                className="text-slate-400 hover:text-white transition-colors font-bold text-lg"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  await api.put(`/redmine/issues/${editingIssue.id}`, {
                    subject: formData.get('subject'),
                    description: formData.get('description'),
                    priority_id: formData.get('priority_id'),
                    assigned_to_id: formData.get('assigned_to_id') || null,
                  });
                  addNotification({
                    type: 'success',
                    title: 'Ticket Updated',
                    message: 'Ticket has been updated successfully',
                    duration: 3000,
                  });
                  setEditingIssue(null);
                  setSelectedIssue(null);
                  // Refresh issues
                  window.location.reload();
                } catch (error: any) {
                  addNotification({
                    type: 'error',
                    title: 'Failed to Update Ticket',
                    message: error.message,
                    duration: 5000,
                  });
                }
              }}>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    defaultValue={editingIssue.subject}
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={editingIssue.description}
                    className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Priority</label>
                    <select
                      name="priority_id"
                      defaultValue={editingIssue.priority.id}
                      className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">Low</option>
                      <option value="2">Normal</option>
                      <option value="3">High</option>
                      <option value="4">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Assignee</label>
                    <select
                      name="assigned_to_id"
                      defaultValue={editingIssue.assigned_to?.id || ''}
                      className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-600">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingIssue(null);
                      setIsViewMode(true);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
