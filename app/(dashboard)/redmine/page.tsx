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
  
  // Temporary filter states for sidebar
  const [tempProjectFilter, setTempProjectFilter] = useState('all');
  const [tempAssigneeFilter, setTempAssigneeFilter] = useState('all');
  const [tempTrackerFilter, setTempTrackerFilter] = useState('all');
  const [tempVersionFilter, setTempVersionFilter] = useState('all');
  const [tempHiddenColumns, setTempHiddenColumns] = useState<number[]>([STATUS_IDS.CLOSED, STATUS_IDS.DROPPED, STATUS_IDS.ON_HOLD]);
  
  // Active filter states
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [trackerFilter, setTrackerFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');
  const [hiddenColumns, setHiddenColumns] = useState<number[]>([STATUS_IDS.CLOSED, STATUS_IDS.DROPPED, STATUS_IDS.ON_HOLD]);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [trackers, setTrackers] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentRedmineUserId, setCurrentRedmineUserId] = useState<number | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [isViewMode, setIsViewMode] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedColumns, setCollapsedColumns] = useState<number[]>([]);
  const [dragOverIssueId, setDragOverIssueId] = useState<number | null>(null);

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
    e.dataTransfer!.setDragImage(e.currentTarget, 0, 0);
  };

  const handleDragEnd = () => {
    setDraggedIssue(null);
    setDragOverIssueId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: number) => {
    e.preventDefault();
    if (!draggedIssue) return;

    setDragOverIssueId(null);

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

  // Temporary toggle for sidebar filters
  const toggleTempColumnVisibility = (columnId: number) => {
    setTempHiddenColumns((prev) => 
      prev.includes(columnId) 
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Apply all filters
  const applyFilters = () => {
    setProjectFilter(tempProjectFilter);
    setAssigneeFilter(tempAssigneeFilter);
    setTrackerFilter(tempTrackerFilter);
    setVersionFilter(tempVersionFilter);
    setHiddenColumns(tempHiddenColumns);
    addNotification({
      type: 'success',
      title: 'Filters Applied',
      message: 'Board filters have been updated',
      duration: 2000,
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setTempProjectFilter('all');
    setTempAssigneeFilter('all');
    setTempTrackerFilter('all');
    setTempVersionFilter('all');
    setTempHiddenColumns([STATUS_IDS.CLOSED, STATUS_IDS.DROPPED, STATUS_IDS.ON_HOLD]);
  };

  const toggleColumnVisibility = (columnId: number) => {
    setHiddenColumns((prev) => 
      prev.includes(columnId) 
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const toggleColumnCollapse = (columnId: number) => {
    setCollapsedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const visibleColumns = columns.filter((col) => !hiddenColumns.includes(col.id));

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Agile Board</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 border border-white/30 rounded-lg bg-white/20 text-sm font-medium text-white placeholder-white/70 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="all" style={{ color: 'black' }}>All Projects</option>
              {projects.map((proj) => (
                <option key={proj?.id} value={proj?.id} style={{ color: 'black' }}>
                  {proj?.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Create Task
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden flex-row-reverse">
        {/* Right Sidebar - Filters */}
        {sidebarOpen && (
          <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
            <div className="p-4 space-y-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Sidebar</h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="Close sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Filters Section */}
              <div>
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="flex items-center justify-between w-full font-bold text-gray-900 text-sm mb-3 hover:text-blue-600"
                >
                  <span>Filters</span>
                  <svg 
                    className={`w-4 h-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
                
                {filtersExpanded && (
                  <div className="space-y-4">
                    {/* Assignee Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Assignee</label>
                      <select
                        value={tempAssigneeFilter}
                        onChange={(e) => setTempAssigneeFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Assignees</option>
                        {assignees.map((assignee) => (
                          <option key={assignee?.id} value={assignee?.id}>
                            {assignee?.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tracker Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Tracker</label>
                      <select
                        value={tempTrackerFilter}
                        onChange={(e) => setTempTrackerFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Types</option>
                        {trackers.map((tracker) => (
                          <option key={tracker?.id} value={tracker?.id}>
                            {tracker?.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Version Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Target Version</label>
                      <select
                        value={tempVersionFilter}
                        onChange={(e) => setTempVersionFilter(e.target.value)}
                        disabled={projectFilter === 'all'}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="all">All Versions</option>
                        {versions.map((version) => (
                          <option key={version?.id} value={version?.id}>
                            {version?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Board Columns Section */}
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-3">Board Columns</h3>
                <div className="space-y-2">
                  {COLUMNS.map((col) => (
                    <label key={col.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={!tempHiddenColumns.includes(col.id)}
                        onChange={() => toggleTempColumnVisibility(col.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-700">{col.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 p-4 border-t border-gray-200">
              <button
                onClick={applyFilters}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="flex-1 px-3 py-2 bg-gray-200 text-gray-900 rounded font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Sidebar Toggle Button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-0 top-24 bg-white border border-gray-200 rounded-l-lg p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors z-40 shadow-md"
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Main Board Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Loading State */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600"></div>
                </div>
                <p className="text-gray-600 font-semibold">Loading tasks...</p>
              </div>
            </div>
          )}

          {/* Kanban Board */}
          {!loading && (
            <div className="flex-1 p-4 overflow-x-auto">
              <div className="flex gap-4 min-h-full">
                {visibleColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex-1 min-w-72 flex flex-col bg-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    {/* Column Header */}
                    <div className={`${column.headerColor} px-4 py-3 text-white font-bold flex justify-between items-center flex-shrink-0 transition-all duration-200`}>
                      <button
                        onClick={() => toggleColumnCollapse(column.id)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-1 text-left"
                      >
                        <svg 
                          className={`w-4 h-4 transition-transform flex-shrink-0 ${collapsedColumns.includes(column.id) ? '-rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>{column.name}</span>
                      </button>
                      <span className="bg-white/20 px-2.5 py-1 rounded text-sm font-semibold flex-shrink-0">
                        {column.issues.length}
                      </span>
                    </div>

                    {/* Issues Container */}
                    {!collapsedColumns.includes(column.id) && (
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {column.issues.length === 0 ? (
                          <div className="flex items-center justify-center h-20 text-gray-500 text-sm">
                            No tasks
                          </div>
                        ) : (
                          column.issues.map((issue, issueIndex) => {
                            const priorityColor = getPriorityColor(issue.priority.name);
                            const isDragging = draggedIssue?.id === issue.id;
                            const isDropTarget = dragOverIssueId === issue.id;
                            const dropTargetIndex = draggedIssue && dragOverIssueId 
                              ? column.issues.findIndex(i => i.id === dragOverIssueId)
                              : -1;
                            const shouldPushDown = draggedIssue && dropTargetIndex >= 0 && issueIndex > dropTargetIndex;
                            
                            return (
                              <div key={issue.id}>
                                {/* Drop indicator before card */}
                                {draggedIssue && (
                                  <div
                                    className="h-1 mx-2 rounded-full pointer-events-none"
                                    style={{
                                      backgroundColor: isDropTarget ? '#3b82f6' : 'transparent',
                                      boxShadow: isDropTarget ? '0 0 8px rgba(59, 130, 246, 0.6)' : 'none',
                                      transition: 'all 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                    }}
                                  />
                                )}
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, issue)}
                                  onDragEnter={(e) => {
                                    e.preventDefault();
                                    setDragOverIssueId(issue.id);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                  }}
                                  onDragLeave={(e) => {
                                    if (e.currentTarget === e.target) {
                                      setDragOverIssueId(null);
                                    }
                                  }}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setSelectedIssue(issue)}
                                  className={`bg-white border border-gray-300 rounded-lg p-3 cursor-grab active:cursor-grabbing will-change-transform ${
                                    isDragging 
                                      ? 'opacity-40 ring-2 ring-blue-500' 
                                      : isDropTarget && draggedIssue
                                      ? 'translate-y-2 shadow-xl'
                                      : shouldPushDown
                                      ? 'translate-y-2 shadow-md'
                                      : 'hover:shadow-md hover:border-blue-300'
                                  }`}
                                  style={{
                                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: isDragging 
                                      ? 'scale(0.95)' 
                                      : (isDropTarget || shouldPushDown) && draggedIssue
                                      ? 'translateY(10px)'
                                      : 'translateY(0)',
                                  }}
                                >
                                  <div className="space-y-2">
                                    {/* Title and ID */}
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
                                        {issue.subject}
                                      </h4>
                                      <span className="text-xs font-bold text-gray-600 flex-shrink-0">#{issue.id}</span>
                                    </div>

                                    {/* Priority and Tracker */}
                                    <div className="flex gap-2">
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${priorityColor}`}>
                                        {issue.priority.name}
                                      </span>
                                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                        {issue.tracker.name}
                                      </span>
                                    </div>

                                    {/* Assignee and Project */}
                                    <div className="text-xs text-gray-600 space-y-1 border-t border-gray-200 pt-2">
                                      <div>
                                        <span className="font-semibold">Assignee:</span> {issue.assigned_to?.name || 'Unassigned'}
                                      </div>
                                      <div>
                                        <span className="font-semibold">Project:</span> {issue.project.name}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
