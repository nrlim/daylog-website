'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useNotificationStore, useAuthStore } from '@/lib/store';

interface Project {
  id: number;
  name: string;
  identifier: string;
  is_private?: boolean;
}

interface Tracker {
  id: number;
  name: string;
}

export default function CreateRedmineTicketPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [projects, setProjects] = useState<Project[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPrivateProjects, setShowPrivateProjects] = useState(true);
  const [currentRedmineUser, setCurrentRedmineUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    project_id: '',
    tracker_id: '1', // Default to Bug
    subject: '',
    description: '',
    priority_id: '2', // Default to Normal
  });

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoadingMetadata(true);

        // Fetch projects
        const projectsResponse = await api.get('/redmine/projects');
        const projectsList = projectsResponse.data.projects || [];
        setProjects(projectsList);

        // Fetch trackers
        const trackersResponse = await api.get('/redmine/trackers');
        setTrackers(trackersResponse.data.trackers || []);

        // Fetch current Redmine user info
        try {
          const currentUserResponse = await api.get('/redmine/user/current');
          setCurrentRedmineUser(currentUserResponse.data.user || currentUserResponse.data);
        } catch (userError) {
          // Continue without current user info
        }

        addNotification({
          type: 'success',
          title: 'Metadata Loaded',
          message: 'Projects and trackers loaded successfully',
          duration: 2000,
        });
      } catch (error: any) {
        console.error('Failed to fetch metadata:', error);
        addNotification({
          type: 'error',
          title: 'Failed to Load Metadata',
          message: error.response?.data?.error || error.message || 'Could not load projects or trackers',
          duration: 5000,
        });
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [addNotification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.project_id || !formData.subject) {
      addNotification({
        type: 'warning',
        title: 'Validation Error',
        message: 'Project and subject are required',
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);

    try {
      const requestData: any = {
        project_id: parseInt(formData.project_id),
        tracker_id: parseInt(formData.tracker_id),
        subject: formData.subject,
        description: formData.description,
        priority_id: parseInt(formData.priority_id),
      };

      // Assign to current user if we have their Redmine ID
      if (currentRedmineUser?.id) {
        requestData.assigned_to_id = currentRedmineUser.id;
      }

      const response = await api.post('/redmine/issues', requestData);

      addNotification({
        type: 'success',
        title: 'Ticket Created!',
        message: `Ticket #${response.data.issue?.id} created successfully and assigned to you`,
        duration: 3000,
      });

      router.push('/redmine');
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Create Ticket',
        message: error.response?.data?.error || error.message || 'Could not create the ticket',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter projects based on private status
  const filteredProjects = projects.filter((project) => {
    if (showPrivateProjects) {
      return true; // Show all projects
    }
    // Only show public projects (where is_private is false or undefined)
    return !project.is_private;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
            Create Redmine Ticket
          </h1>
          <p className="text-gray-600 mt-2">Create a new issue in Redmine</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/20 space-y-6">
          {/* Project Filter */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="showPrivate"
              checked={showPrivateProjects}
              onChange={(e) => setShowPrivateProjects(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
            />
            <label htmlFor="showPrivate" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
              Show Private Projects
            </label>
            <span className="text-xs text-gray-500">
              Total: {filteredProjects.length} / {projects.length}
            </span>
          </div>

          {/* Project */}
          <div>
            <label className="block text-gray-700 mb-2 font-semibold text-sm">
              Project <span className="text-red-500">*</span>
            </label>
            {loadingMetadata ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
            ) : (
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a project...</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.is_private && ' 🔒'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tracker */}
          <div>
            <label className="block text-gray-700 mb-2 font-semibold text-sm">
              Type <span className="text-red-500">*</span>
            </label>
            {loadingMetadata ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded-lg"></div>
            ) : (
              <select
                value={formData.tracker_id}
                onChange={(e) => setFormData({ ...formData, tracker_id: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {trackers.map((tracker) => (
                  <option key={tracker.id} value={tracker.id}>
                    {tracker.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-gray-700 mb-2 font-semibold text-sm">Priority</label>
            <select
              value={formData.priority_id}
              onChange={(e) => setFormData({ ...formData, priority_id: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1">Low</option>
              <option value="2">Normal</option>
              <option value="3">High</option>
              <option value="4">Urgent</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-gray-700 mb-2 font-semibold text-sm">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter ticket subject..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 mb-2 font-semibold text-sm">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter ticket description..."
              rows={8}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || loadingMetadata}
              className="flex-1 bg-gradient-to-r from-blue-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Ticket'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
