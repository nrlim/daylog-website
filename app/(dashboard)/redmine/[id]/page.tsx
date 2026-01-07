'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function RedmineTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const user = useAuthStore((state) => state.user);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const ticketId = params?.id as string;
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!ticketId) return;

    const fetchIssue = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/redmine/issues/${ticketId}`);
        setIssue(response.data.issue);
      } catch (error: any) {
        console.error('Failed to fetch issue:', error);
        addNotification({
          type: 'error',
          title: 'Failed to Load Ticket',
          message: error.response?.data?.error || error.message || 'Could not fetch the ticket',
          duration: 5000,
        });
        router.push('/redmine');
      } finally {
        setLoading(false);
      }
    };

    fetchIssue();
  }, [ticketId, router, addNotification]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in progress':
      case 'inprogress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-gray-700 font-semibold">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="bg-white/95 backdrop-blur-md p-12 rounded-xl shadow-lg border border-white/20 text-center">
            <p className="text-gray-600">Ticket not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 font-semibold"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tickets
        </button>

        {/* Ticket Header */}
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/20 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-blue-600">#{issue.id}</span>
                <span className={`text-sm font-semibold px-4 py-1 rounded-full border ${getStatusColor(issue.status.name)}`}>
                  {issue.status.name}
                </span>
                <span className={`text-sm font-semibold ${getPriorityColor(issue.priority.name)}`}>
                  {issue.priority.name} Priority
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{issue.subject}</h1>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Project</p>
              <p className="text-gray-800 font-medium">{issue.project.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Type</p>
              <p className="text-gray-800 font-medium">{issue.tracker.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Author</p>
              <p className="text-gray-800 font-medium">{issue.author.name}</p>
            </div>
            {issue.assigned_to && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Assigned To</p>
                <p className="text-gray-800 font-medium">{issue.assigned_to.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/20 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Description</h2>
          <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {issue.description ? (
              <p className="whitespace-pre-wrap">{issue.description}</p>
            ) : (
              <p className="text-gray-500 italic">No description provided</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/20">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Created</p>
              <p className="text-gray-800 font-medium text-lg">
                {new Date(issue.created_on).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">Last Updated</p>
              <p className="text-gray-800 font-medium text-lg">
                {new Date(issue.updated_on).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
