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

interface Project {
  id: number;
  name: string;
  identifier: string;
}

export default function RedmineTicketsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Fetch projects for filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/redmine/projects');
        setProjects(response.data.projects || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const offset = (currentPage - 1) * pageSize;
        const params: any = { 
          limit: pageSize,
          offset: offset,
          assigned_to_id: 'me' // Filter to show only my tasks
        };
        
        // Add project filter if selected
        if (projectFilter !== 'all') {
          params.project_id = projectFilter;
        }
        
        const response = await api.get('/redmine/issues', { params });
        setIssues(response.data.issues || []);
        setTotalCount(response.data.total_count || 0);
        
        if (response.data.issues && response.data.issues.length > 0) {
          addNotification({
            type: 'success',
            title: 'Issues Loaded',
            message: `Loaded ${response.data.issues.length} of ${response.data.total_count || 'your'} issues`,
            duration: 3000,
          });
        }
      } catch (error: any) {
        console.error('Failed to fetch issues:', error);
        addNotification({
          type: 'error',
          title: 'Failed to Load Issues',
          message: error.response?.data?.error || error.message || 'Could not fetch Redmine issues',
          duration: 5000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [currentPage, pageSize, projectFilter, addNotification]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in progress':
      case 'inprogress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'text-blue-600';
      case 'normal':
        return 'text-gray-600';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesFilter =
      filter === 'all' ||
      issue.status.name.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      issue.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Redmine Tickets
              </h1>
              <p className="text-gray-600 mt-2">View and manage your Redmine issues</p>
            </div>
            <button
              onClick={() => router.push('/redmine/create')}
              className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Ticket
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-md border border-white/20 space-y-4">
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'new', 'in progress', 'closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                        filter === status
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Project</label>
                <select
                  value={projectFilter}
                  onChange={(e) => {
                    setProjectFilter(e.target.value);
                    setCurrentPage(1); // Reset to first page
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Issues List */}
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              </div>
              <p className="text-gray-700 font-semibold">Loading tickets...</p>
            </div>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md p-12 rounded-xl shadow-lg border border-white/20 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No tickets found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search query' : 'Create a new ticket to get started'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => router.push(`/redmine/${issue.id}`)}
                className="bg-white/95 backdrop-blur-md p-6 rounded-xl shadow-md hover:shadow-lg border border-white/20 transition-all cursor-pointer hover:border-blue-200 hover:scale-[1.01]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-gray-500">#{issue.id}</span>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(issue.status.name)}`}>
                        {issue.status.name}
                      </span>
                      <span className={`text-xs font-semibold ${getPriorityColor(issue.priority.name)}`}>
                        {issue.priority.name}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{issue.subject}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{issue.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>📁 {issue.project.name}</span>
                      <span>🏷️ {issue.tracker.name}</span>
                      {issue.assigned_to && <span>👤 {issue.assigned_to.name}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-2">
                      <div>Created: {new Date(issue.created_on).toLocaleDateString()}</div>
                      <div>Updated: {new Date(issue.updated_on).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          {/* Pagination Controls */}
          {totalCount > pageSize && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tasks
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <div className="flex items-center gap-2 px-3 py-2">
                  {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                    .slice(Math.max(0, currentPage - 2), Math.min(Math.ceil(totalCount / pageSize), currentPage + 2))
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-sm font-medium rounded ${
                          page === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                  disabled={currentPage === Math.ceil(totalCount / pageSize)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
