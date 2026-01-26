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
  accentColor: string;
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
  { id: STATUS_IDS.NEW, name: '🆕 New', bgColor: 'bg-blue-50', accentColor: 'blue', issues: [] },
  { id: STATUS_IDS.IN_PROGRESS, name: '⚡ In Progress', bgColor: 'bg-amber-50', accentColor: 'amber', issues: [] },
  { id: STATUS_IDS.READY_TO_TEST, name: '✅ Ready to Test', bgColor: 'bg-purple-50', accentColor: 'purple', issues: [] },
  { id: STATUS_IDS.TESTING, name: '🧪 Testing', bgColor: 'bg-indigo-50', accentColor: 'indigo', issues: [] },
  { id: STATUS_IDS.CLOSED, name: '🏁 Closed', bgColor: 'bg-emerald-50', accentColor: 'emerald', issues: [] },
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  const refreshIssues = async () => {
    try {
      setLoading(true);

      const response = await api.get('/redmine/issues', {
        params: {
          limit: 9999,
          status_id: '*',
          offset: 0,
          ...(projectFilter !== 'all' && { project_id: projectFilter }),
        },
      });

      let issues = response.data.issues || [];
      setAllIssues(issues);

      // Extract unique projects, assignees, versions from ALL issues (independent of local filters)
      const projectIds = new Set<number>();
      const uniqueProjects: any[] = [];
      const assigneeIds = new Set<number>();
      const uniqueAssignees: any[] = [];
      const versionIds = new Set<number>();
      const uniqueVersions: any[] = [];

      issues.forEach((i: any) => {
        if (!projectIds.has(i.project.id)) {
          projectIds.add(i.project.id);
          uniqueProjects.push(i.project);
        }
        if (i.assigned_to && !assigneeIds.has(i.assigned_to.id)) {
          assigneeIds.add(i.assigned_to.id);
          uniqueAssignees.push(i.assigned_to);
        }
        if (i.fixed_version && !versionIds.has(i.fixed_version.id)) {
          versionIds.add(i.fixed_version.id);
          uniqueVersions.push(i.fixed_version);
        }
      });

      setProjects(uniqueProjects);
      setAssignees(uniqueAssignees);
      setVersions(uniqueVersions);

    } catch (error: any) {
      console.error('Failed to fetch issues:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load Issues',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Client-side Filtering Logic
    let filtered = [...allIssues];

    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(i => i.assigned_to?.id === parseInt(assigneeFilter));
    }
    if (versionFilter !== 'all') {
      filtered = filtered.filter(i => (i as any).fixed_version?.id === parseInt(versionFilter));
    }

    const updatedColumns = COLUMNS.map((col) => {
      const columnIssues = filtered.filter((issue: Issue) => issue.status.id === col.id);
      return { ...col, issues: columnIssues };
    });

    setColumns(updatedColumns);
  }, [allIssues, assigneeFilter, versionFilter]);

  useEffect(() => {
    refreshIssues();
  }, [projectFilter, refreshTrigger, addNotification]);

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
    if (draggedIssue.status.id === targetColumnId) {
      setDraggedIssue(null);
      return;
    }

    const previousColumns = columns;

    try {
      setUpdating(true);
      await api.put(`/redmine/issues/${draggedIssue.id}`, { statusId: targetColumnId });

      const targetColumn = COLUMNS.find(col => col.id === targetColumnId);

      setColumns((prevColumns) =>
        prevColumns.map((col) => ({
          ...col,
          issues:
            col.id === draggedIssue.status.id
              ? col.issues.filter((i) => i.id !== draggedIssue.id)
              : col.id === targetColumnId
                ? [...col.issues, { ...draggedIssue, status: { id: targetColumnId, name: targetColumn?.name || col.name } }]
                : col.issues,
        }))
      );

      addNotification({
        type: 'success',
        title: 'Updated',
        message: `Task moved to ${targetColumn?.name}`,
        duration: 2000,
      });

      await new Promise(resolve => setTimeout(resolve, 800));
      setProjectFilter('all');
      setAssigneeFilter('all');
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      setColumns(previousColumns);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to move task',
      });
    } finally {
      setUpdating(false);
      setDraggedIssue(null);
    }
  };

  const getTrackerStyle = (trackerName: string) => {
    const name = trackerName.toLowerCase();
    if (name.includes('bug')) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (name.includes('feature')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (name.includes('task')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === 'urgent' || p === 'immediate') return <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Urgent"></span>;
    if (p === 'high') return <span className="w-2 h-2 rounded-full bg-orange-500" title="High"></span>;
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50/50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm px-6 py-4 z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

          {/* Title */}
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Kanban Board
                <span className="text-sm font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">{columns.reduce((a, b) => a + b.issues.length, 0)} Tasks</span>
              </h1>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { value: projectFilter, userChange: setProjectFilter, options: projects, default: 'All Projects', icon: '📁' },
              { value: assigneeFilter, userChange: setAssigneeFilter, options: assignees, default: 'All Assignees', icon: '👤' },
              { value: versionFilter, userChange: setVersionFilter, options: versions, default: 'All Versions', icon: '🏷️' },
            ].map((filter, i) => (
              <div key={i} className="relative">
                <select
                  value={filter.value}
                  onChange={(e) => filter.userChange(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none hover:bg-gray-100 cursor-pointer transition-colors min-w-[140px]"
                >
                  <option value="all">{filter.default}</option>
                  {filter.options.map((opt: any) => (
                    <option key={opt?.id} value={opt?.id}>{opt?.name}</option>
                  ))}
                </select>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">{filter.icon}</span>
              </div>
            ))}
            <button onClick={() => router.push('/redmine')} className="ml-2 p-2.5 text-gray-500 hover:text-indigo-600 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 transition-all" title="List View">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Board Area */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">Syncing tasks...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex h-full gap-6 min-w-max">
            {columns.map((column) => (
              <div
                key={column.id}
                className={`flex flex-col w-80 lg:w-96 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden ${draggedIssue && draggedIssue.status.id !== column.id ? 'ring-2 ring-indigo-100 bg-indigo-50/30' : 'bg-gray-50/50'
                  }`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`p-4 border-b border-gray-100/50 bg-white sticky top-0 z-10 flex justify-between items-center`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full bg-${column.accentColor}-500 shadow-sm`}></span>
                    <span className="font-bold text-gray-900">{column.name}</span>
                  </div>
                  <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold">{column.issues.length}</span>
                </div>

                {/* Issues List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {column.issues.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 py-10">
                      <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <span className="text-sm font-medium">Empty</span>
                    </div>
                  ) : (
                    column.issues.map((issue) => (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue)}
                        onClick={() => router.push(`/redmine/${issue.id}`)}
                        className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-100 cursor-grab active:cursor-grabbing transition-all duration-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${getTrackerStyle(issue.tracker.name)}`}>
                            {issue.tracker.name}
                          </div>
                          {getPriorityBadge(issue.priority.name)}
                        </div>

                        <h3 className="text-sm font-bold text-gray-800 mb-3 leading-snug line-clamp-3 group-hover:text-indigo-700 transition-colors">
                          {issue.subject}
                        </h3>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                          <div className="flex items-center gap-2">
                            {issue.assigned_to ? (
                              <div className="flex items-center gap-1.5" title={`Assigned to ${issue.assigned_to.name}`}>
                                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                  {issue.assigned_to.name.charAt(0)}
                                </div>
                                <span className="text-xs text-gray-500 font-medium truncate max-w-[80px]">{issue.assigned_to.name.split(' ')[0]}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300 italic">Unassigned</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">#{issue.id}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
