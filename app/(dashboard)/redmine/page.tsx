'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useNotificationStore, useAuthStore } from '@/lib/store';
import axios from 'axios';

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
  custom_fields?: Array<{ id: number; name: string; value: any }>;
  children?: Array<{ id: number; subject: string; tracker: { id: number; name: string }; status: { id: number; name: string } }>;
  relations?: Array<{ id: number; issue_id: number; issue_to_id: number; relation_type: string; delay?: number }>;
  tags?: any[]; // Adjust based on actual API response if needed
  parent?: { id: number; subject?: string };
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
  const [loading, setLoading] = useState(true); // Initial load only
  const [isRefreshing, setIsRefreshing] = useState(false); // Background refresh
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
  const [searchQuery, setSearchQuery] = useState('');
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
  const [createModalDefaults, setCreateModalDefaults] = useState<any>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch Redmine user and projects on mount
  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const initializeBoard = async () => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    };

    initializeBoard();
  }, [user, router]);


  // Fetch all issues and organize by status
  const fetchIssues = async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setIsRefreshing(true);

      const params: Record<string, any> = { limit: 200, include: 'relations' }; // Optimized: Removed 'children' and status_id='*'
      if (projectFilter !== 'all') params.project_id = projectFilter;
      if (assigneeFilter !== 'all') params.assigned_to_id = assigneeFilter;
      if (trackerFilter !== 'all') params.tracker_id = trackerFilter;
      if (versionFilter !== 'all') params.fixed_version_id = versionFilter;

      const response = await api.get('/redmine/issues', {
        params,
        signal: abortControllerRef.current.signal
      });

      let allIssues = response.data.issues || [];

      // Client-side filtering for search query (subject search)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        allIssues = allIssues.filter((issue: Issue) =>
          issue.subject.toLowerCase().includes(query) ||
          issue.id.toString().includes(query)
        );
      }

      // Hydrate parent subjects using the current list of issues
      const issueMap = new Map<number, Issue>(allIssues.map((i: Issue) => [i.id, i]));
      allIssues.forEach((issue: Issue) => {
        if (issue.parent && !issue.parent.subject && issueMap.has(issue.parent.id)) {
          issue.parent.subject = issueMap.get(issue.parent.id)!.subject;
        }
      });

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
        // Use a separate non-aborted request for static data if needed, or share the controller?
        // Better to let this be independent but it might be cancelled if using same api instance?
        // Actually axios instances share interceptors but not signals unless passed.
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
      if (axios.isCancel(error)) {
        console.log('Request canceled', error.message);
        return;
      }
      addNotification({
        type: 'error',
        title: 'Failed to Load Issues',
        message: error.message || 'Unknown error',
        duration: 5000,
      });
    } finally {
      // Only unset refreshing if this is the active request
      // But since we abide by abort, if we are here and not cancelled, we are done.
      // If cancelled, we returned early.
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (columns.length > 0 && !loading) {
      fetchIssues();
    }
  }, [projectFilter, assigneeFilter, trackerFilter, versionFilter, searchQuery, loading]);

  // Sync active filters to temp filters when active filters change
  useEffect(() => {
    setTempProjectFilter(projectFilter);
    setTempAssigneeFilter(assigneeFilter);
    setTempTrackerFilter(trackerFilter);
    setTempVersionFilter(versionFilter);
    setTempHiddenColumns(hiddenColumns);
  }, [projectFilter, assigneeFilter, trackerFilter, versionFilter, hiddenColumns]);

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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg flex-shrink-0 relative z-20">
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
            {isRefreshing && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-white/90 text-sm animate-pulse">
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Syncing...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-white/30 rounded-lg bg-white/10 text-sm font-medium text-white placeholder-white/60 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 w-64 transition-all"
              />
            </div>
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
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-sm"
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
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
          {/* Loading State - Initial Only */}
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-blue-200 border-t-blue-600"></div>
                </div>
                <p className="text-gray-600 font-semibold">Loading Board...</p>
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


                            // Determine Card Style based on Tracker
                            const trackerName = issue.tracker.name.toLowerCase();
                            let cardStyleClass = 'border-l-4 ';
                            if (trackerName.includes('bug')) {
                              cardStyleClass += 'border-l-red-500 bg-red-50';
                            } else if (trackerName.includes('story') || trackerName.includes('feature')) {
                              cardStyleClass += 'border-l-green-500 bg-green-50';
                            } else if (trackerName.includes('task')) {
                              cardStyleClass += 'border-l-blue-500 bg-blue-50';
                            } else {
                              cardStyleClass += 'border-l-slate-400 bg-white';
                            }

                            // Extract Story Points (Business Value)
                            const storyPoints = issue.custom_fields?.find(f => f.name === 'Business Value' || f.name === 'Story Points')?.value;



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
                                  className={`${cardStyleClass} border border-gray-300 rounded-lg p-3 cursor-grab active:cursor-grabbing will-change-transform group ${isDragging
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
                                    {/* Top Row: Tracker + ID + Actions */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${issue.tracker.name.toLowerCase().includes('bug') ? 'bg-red-50 text-red-600 border-red-200' :
                                          issue.tracker.name.toLowerCase().includes('feature') ? 'bg-green-50 text-green-600 border-green-200' :
                                            'bg-blue-50 text-blue-600 border-blue-200'
                                          }`}>
                                          {issue.tracker.name}
                                        </span>
                                        <span className="text-xs font-mono text-gray-500 group-hover:text-blue-600 transition-colors">#{issue.id}</span>
                                      </div>
                                      {/* Story Points Badge */}
                                      {storyPoints && (
                                        <div className="flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200" title="Story Points">
                                          {storyPoints}
                                        </div>
                                      )}
                                    </div>

                                    {/* Parent Issue (if subtask) */}
                                    {issue.parent && (
                                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1 max-w-full bg-slate-50 p-1 rounded border border-slate-100">
                                        <span className="flex-shrink-0 text-slate-400">↳</span>
                                        <span className="truncate hover:text-blue-600 transition-colors cursor-pointer flex-1" title={`Parent: #${issue.parent.id} ${issue.parent.subject || ''}`}>
                                          <span className="font-mono font-semibold mr-1">#{issue.parent.id}</span>
                                          {issue.parent.subject}
                                        </span>
                                      </div>
                                    )}

                                    {/* Title */}
                                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 group-hover:text-blue-600 transition-colors">
                                      {issue.subject}
                                    </h4>

                                    {/* Tags */}
                                    {issue.tags && issue.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {issue.tags.map((tag, idx) => (
                                          <span key={idx} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] rounded border border-yellow-200">
                                            {tag.name || tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {/* Subtasks */}
                                    {issue.children && issue.children.length > 0 && (
                                      <div className="mt-2 space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Subtasks</p>
                                        {issue.children.map(child => (
                                          <div key={child.id} className="flex items-center justify-between text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                                            <span className="truncate flex-1 hover:text-blue-600 cursor-pointer" title={child.subject}>
                                              <span className="font-mono text-slate-400 mr-1">#{child.id}</span>
                                              {child.subject}
                                            </span>
                                            <span className={`ml-2 w-2 h-2 rounded-full ${[3, 4, 5].includes(child.tracker?.id) ? 'bg-green-500' : 'bg-blue-400'
                                              }`} title="Status"></span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Priority and Tracker - Bottom */}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-1">
                                      <div className="flex gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${priorityColor}`}>
                                          {issue.priority.name}
                                        </span>
                                      </div>

                                      <div className="text-xs text-gray-500 flex items-center gap-1">
                                        {issue.assigned_to ? (
                                          <span className="truncate max-w-[100px]" title={issue.assigned_to.name}>{issue.assigned_to.name.split(' ')[0]}</span>
                                        ) : (
                                          <span className="italic">Unassigned</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Quick Actions (On Hover) */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                      <button
                                        className="p-1 bg-white text-gray-500 hover:text-blue-600 rounded shadow-md border border-gray-200"
                                        title="Add Subtask"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCreateModalDefaults({
                                            project_id: issue.project.id,
                                            parent_issue_id: issue.id,
                                            parent_subject: issue.subject,
                                            subject: '',
                                          });
                                          setShowCreateModal(true);
                                        }}
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                      </button>
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
              {/* Parent Task (if exists) */}
              {selectedIssue.parent && (
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-4 flex items-center gap-3">
                  <div className="bg-blue-900/50 p-1.5 rounded text-blue-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide">Parent Task</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-200">
                      <span className="font-mono font-bold text-blue-300 flex-shrink-0">#{selectedIssue.parent.id}</span>
                      <span className="truncate min-w-0 flex-1">{selectedIssue.parent.subject}</span>
                    </div>
                  </div>
                </div>
              )}


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
      )
      }

      {/* Create Ticket Modal */}
      {
        showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg border border-slate-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">
                  {createModalDefaults?.parent_issue_id ? 'Create Subtask' : 'Create New Ticket'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateModalDefaults(null);
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
                    const payload: any = {
                      subject: formData.get('subject'),
                      description: formData.get('description'),
                      project_id: parseInt(formData.get('project_id') as string),
                      tracker_id: parseInt(formData.get('tracker_id') as string),
                      priority_id: parseInt(formData.get('priority_id') as string),
                      assigned_to_id: currentRedmineUserId,
                    };

                    // Priority to state for subtask mode
                    if (createModalDefaults?.parent_issue_id) {
                      payload.parent_issue_id = Number(createModalDefaults.parent_issue_id);
                    } else {
                      const parentId = formData.get('parent_issue_id');
                      if (parentId) {
                        payload.parent_issue_id = parseInt(parentId as string);
                      }
                    }

                    console.log('Creating ticket with payload:', payload);

                    const response = await api.post('/redmine/issues', payload);
                    const ticketTitle = createModalDefaults?.parent_issue_id
                      ? `Subtask created (Parent #${createModalDefaults.parent_issue_id})`
                      : 'Ticket Created';

                    addNotification({
                      type: 'success',
                      title: ticketTitle,
                      message: `Ticket #${response.data.issue?.id} created successfully`,
                      duration: 3000,
                    });
                    setShowCreateModal(false);
                    setCreateModalDefaults(null);
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
                  {/* Parent Task Display (Visible & Read-only) */}
                  {createModalDefaults?.parent_issue_id && (
                    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 mb-4">
                      <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
                        Parent Task
                      </label>
                      <div className="flex items-center gap-2 text-sm text-blue-900">
                        <span className="font-mono font-bold">#{createModalDefaults.parent_issue_id}</span>
                        <span className="truncate opacity-80">{createModalDefaults.parent_subject}</span>
                      </div>
                      <input type="hidden" name="parent_issue_id" value={createModalDefaults.parent_issue_id} />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Subject *</label>
                    <input
                      type="text"
                      name="subject"
                      required
                      defaultValue={createModalDefaults?.subject || ''}
                      className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={createModalDefaults?.parent_issue_id ? "Subtask subject" : "Ticket subject"}
                      autoFocus
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
                        defaultValue={createModalDefaults?.project_id || (projectFilter !== 'all' ? projectFilter : '')}
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
                        defaultValue="2"
                        className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">Low</option>
                        <option value="2">Normal</option>
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
                      defaultValue={createModalDefaults?.tracker_id || ''}
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
                      {createModalDefaults?.parent_issue_id ? 'Create Subtask' : 'Create Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateModalDefaults(null);
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
        )
      }

      {/* Edit Ticket Modal */}
      {
        editingIssue && !isViewMode && (
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
        )
      }
    </div >
  );
}
