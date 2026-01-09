'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useNotificationStore, useAuthStore } from '@/lib/store';

interface Issue {
  id: number;
  project: { id: number; name: string };
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
};

const COLUMNS: Column[] = [
  { id: STATUS_IDS.NEW, name: '🆕 New', bgColor: 'bg-blue-900/20', headerColor: 'bg-blue-600', issues: [] },
  { id: STATUS_IDS.IN_PROGRESS, name: '⚡ In Progress', bgColor: 'bg-yellow-900/20', headerColor: 'bg-yellow-600', issues: [] },
  { id: STATUS_IDS.READY_TO_TEST, name: '✅ Ready to Test', bgColor: 'bg-purple-900/20', headerColor: 'bg-purple-600', issues: [] },
  { id: STATUS_IDS.TESTING, name: '🧪 Testing', bgColor: 'bg-orange-900/20', headerColor: 'bg-orange-600', issues: [] },
  { id: STATUS_IDS.CLOSED, name: '🏁 Closed', bgColor: 'bg-green-900/20', headerColor: 'bg-green-600', issues: [] },
];

export default function KanbanBoard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [columns, setColumns] = useState<Column[]>(COLUMNS);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null);
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger to refresh issues

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Function to refresh issues from API
  const refreshIssues = async () => {
    try {
      setLoading(true);
      
      // Fetch issues from API with proper limit and cache busting
      const response = await api.get('/redmine/issues', {
        params: {
          limit: 9999, // Get all issues
          status_id: '*', // Get all statuses including closed
          offset: 0,
          ...(projectFilter !== 'all' && { project_id: projectFilter }),
          ...(assigneeFilter !== 'all' && { assigned_to_id: parseInt(assigneeFilter) }),
          ...(versionFilter !== 'all' && { fixed_version_id: parseInt(versionFilter) }),
        },
      });

      let issues = response.data.issues || [];
      console.log('API Response - Total issues:', response.data.total_count, 'Fetched:', issues.length);

      // Organize issues by status
      const updatedColumns = COLUMNS.map((col) => {
        const columnIssues = issues.filter((issue: Issue) => issue.status.id === col.id);
        console.log(`Status ${col.id} (${col.name}): ${columnIssues.length} issues`);
        return {
          ...col,
          issues: columnIssues,
        };
      });

      setColumns(updatedColumns);

      // Extract unique projects
      const projectIds = new Set<number>();
      const uniqueProjects: any[] = [];
      issues.forEach((i: Issue) => {
        if (!projectIds.has(i.project.id)) {
          projectIds.add(i.project.id);
          uniqueProjects.push(i.project);
        }
      });
      setProjects(uniqueProjects);

      // Extract unique assignees
      const assigneeIds = new Set<number>();
      const uniqueAssignees: any[] = [];
      issues.forEach((i: Issue) => {
        if (i.assigned_to && !assigneeIds.has(i.assigned_to.id)) {
          assigneeIds.add(i.assigned_to.id);
          uniqueAssignees.push(i.assigned_to);
        }
      });
      setAssignees(uniqueAssignees);

      // Extract unique versions (target versions)
      const versionIds = new Set<number>();
      const uniqueVersions: any[] = [];
      issues.forEach((i: any) => {
        if (i.fixed_version && !versionIds.has(i.fixed_version.id)) {
          versionIds.add(i.fixed_version.id);
          uniqueVersions.push(i.fixed_version);
        }
      });
      setVersions(uniqueVersions);

      console.log('Issues refreshed successfully');
    } catch (error: any) {
      console.error('Failed to fetch issues:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load Issues',
        message: error.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all issues and organize by status
  useEffect(() => {
    refreshIssues();
  }, [projectFilter, assigneeFilter, versionFilter, refreshTrigger, addNotification]);

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

    const previousColumns = columns; // Store previous state in case we need to revert

    try {
      setUpdating(true);
      console.log(`[DRAG-DROP] Starting update for issue #${draggedIssue.id} from status ${draggedIssue.status.id} to ${targetColumnId}`);

      // Update status via API
      console.log(`[DRAG-DROP] Sending PUT request to /redmine/issues/${draggedIssue.id}`, { statusId: targetColumnId });
      const response = await api.put(`/redmine/issues/${draggedIssue.id}`, {
        statusId: targetColumnId,
      });

      console.log('[DRAG-DROP] ✅ Status update response:', response.data);

      // Find the target column name
      const targetColumn = COLUMNS.find(col => col.id === targetColumnId);
      
      // Update local state AFTER successful API call
      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          issues:
            col.id === draggedIssue.status.id
              ? col.issues.filter((i) => i.id !== draggedIssue.id)
              : col.id === targetColumnId
              ? [
                  ...col.issues,
                  {
                    ...draggedIssue,
                    status: { id: targetColumnId, name: targetColumn?.name || col.name },
                  },
                ]
              : col.issues,
        }))
      );

      addNotification({
        type: 'success',
        title: 'Status Updated',
        message: `Ticket #${draggedIssue.id} moved to ${targetColumn?.name}`,
        duration: 3000,
      });

      // Wait a bit for Redmine to process, then force refresh
      console.log('[DRAG-DROP] ⏳ Waiting for Redmine to sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[DRAG-DROP] Triggering refresh after status update...');
      
      // Force refresh WITHOUT filters to ensure we get the updated issue
      setProjectFilter('all');
      setAssigneeFilter('all');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[DRAG-DROP] ❌ Failed to update status - full error:', error);
      console.error('[DRAG-DROP] Error message:', error.message);
      console.error('[DRAG-DROP] Error response:', error.response?.data);
      console.error('[DRAG-DROP] Error status:', error.response?.status);
      
      // Revert to previous state on error
      setColumns(previousColumns);
      
      addNotification({
        type: 'error',
        title: 'Failed to Update Status',
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Unknown error',
        duration: 5000,
      });
    } finally {
      setUpdating(false);
      setDraggedIssue(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'bg-blue-900/40 text-blue-300 border-blue-600/30';
      case 'normal':
        return 'bg-slate-700/40 text-slate-200 border-slate-600/30';
      case 'high':
        return 'bg-orange-900/40 text-orange-300 border-orange-600/30';
      case 'urgent':
        return 'bg-red-900/40 text-red-300 border-red-600/30';
      default:
        return 'bg-slate-700/40 text-slate-200 border-slate-600/30';
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

  const getIssueTypeCount = (issues: Issue[]) => {
    let bugs = 0;
    let tasks = 0;
    issues.forEach((issue) => {
      if (issue.tracker.name.toLowerCase().includes('bug')) {
        bugs++;
      } else {
        tasks++;
      }
    });
    return { bugs, tasks };
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.back()}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
                <span className="ml-auto text-sm font-medium text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
                  {getTotalIssueCount()} tasks
                </span>
              </div>
              <p className="text-xs text-slate-400">Drag tasks to update status</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
            >
              <option value="all">📁 All Projects</option>
              {projects.map((proj) => (
                <option key={proj?.id} value={proj?.id}>
                  {proj?.name}
                </option>
              ))}
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
            >
              <option value="all">👤 All Assignees</option>
              {assignees.map((assignee) => (
                <option key={assignee?.id} value={assignee?.id}>
                  {assignee?.name}
                </option>
              ))}
            </select>
            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
            >
              <option value="all">🏷️ All Versions</option>
              {versions.map((version) => (
                <option key={version?.id} value={version?.id}>
                  {version?.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => router.push('/redmine')}
              className="ml-auto px-3 py-1.5 text-sm bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition-colors"
            >
              📋 List View
            </button>
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

      {/* Kanban Board - Responsive Grid */}
      {!loading && (
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* Columns Container - Responsive without horizontal scroll */}
          <div className="flex gap-4 flex-1 min-h-0">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex-1 min-w-0 flex flex-col bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`${column.headerColor} px-4 py-3 font-bold text-white shadow-md flex justify-between items-center`}>
                  <div className="flex items-center gap-2">
                    <span>{column.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const { bugs, tasks } = getIssueTypeCount(column.issues);
                      return (
                        <>
                          {tasks > 0 && (
                            <span className="bg-green-900/40 border border-green-600/50 px-2 py-1 rounded text-xs font-semibold text-green-300">
                              Task: {tasks}
                            </span>
                          )}
                          {bugs > 0 && (
                            <span className="bg-red-900/40 border border-red-600/50 px-2 py-1 rounded text-xs font-semibold text-red-300">
                              Bug: {bugs}
                            </span>
                          )}
                          <span className="bg-black/20 px-2.5 py-1 rounded-full text-sm font-semibold">
                            {column.issues.length}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Issues List - Scrollable */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {column.issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 h-full">
                      <p className="text-sm font-medium">No tasks</p>
                    </div>
                  ) : (
                    column.issues.map((issue) => {
                      const trackerLabel = getTrackerLabel(issue.tracker.name);
                      
                      return (
                        <div
                          key={issue.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, issue)}
                          onClick={() => router.push(`/redmine/${issue.id}`)}
                          className="bg-slate-800/80 border border-slate-600 rounded-lg cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group overflow-hidden"
                        >
                          <div className="p-3 flex flex-col h-full">
                            {/* Top row: Type + ID left */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="font-bold text-blue-400 text-lg">
                                {trackerLabel.label.toUpperCase()} #{issue.id}
                              </span>
                            </div>

                            {/* Subject - Main content */}
                            <p className="text-sm font-semibold text-white line-clamp-2 group-hover:text-blue-200 transition-colors leading-tight mb-3 flex-1">
                              {issue.subject}
                            </p>

                            {/* Divider */}
                            <div className="border-t border-slate-600 mb-2" />

                            {/* Bottom row: Type indicator and Assignee */}
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded ${trackerLabel.bgColor}`} />
                              {issue.assigned_to ? (
                                <span className="text-xs text-slate-300 truncate flex-1">{issue.assigned_to.name}</span>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Unassigned</span>
                              )}
                            </div>

                            {/* Type label */}
                            <div className="flex items-center justify-between mt-2 text-xs">
                              <span className="text-slate-500">Type:</span>
                              <span className={`font-semibold ${trackerLabel.textColor}`}>{trackerLabel.label}</span>
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

          {/* Helper Text */}
          <div className="text-center py-3 text-xs text-slate-400 border-t border-slate-700 mt-4">
            <p>Drag tasks between columns • Click a task to view details</p>
          </div>
        </div>
      )}
    </div>
  );
}
