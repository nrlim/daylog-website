'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { pokerAPI } from '@/lib/api';
import { useNotificationStore, usePokerStore } from '@/lib/store';
import { PokerSession } from '@/types';

export default function PokerPage() {
  const sessions = usePokerStore((state) => state.sessions);
  const setSessions = usePokerStore((state) => state.setSessions);
  const loadSessionsFromStorage = usePokerStore((state) => state.loadSessionsFromStorage);
  const [loading, setLoading] = useState(true);
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    // Load from localStorage first
    loadSessionsFromStorage();
    // Then fetch from API to sync with latest data
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await pokerAPI.getSessions();
      setSessions(response.data.sessions);
      
      if (response.data.sessions.length > 0) {
        addNotification({
          type: 'success',
          title: 'Sessions Loaded!',
          message: `Found ${response.data.sessions.length} poker session(s).`,
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Failed to load poker sessions:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load Sessions',
        message: 'Could not load your poker sessions. Please refresh the page.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'voting': return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200';
      case 'revealed': return 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 border border-yellow-200';
      case 'completed': return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl inline-block">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-base font-semibold text-gray-700">Loading sessions...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 border border-white/40">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Planning Poker Sessions
              </h1>
              <p className="text-gray-600 text-sm mt-0.5">Manage your estimation sessions</p>
            </div>
            <Link
              href="/poker/create"
              className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-md text-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </Link>
          </div>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-10 text-center border border-white/40">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mb-3">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">No sessions yet</h3>
            <p className="text-gray-600 mb-4 text-sm">Create your first planning poker session</p>
            <Link
              href="/poker/create"
              className="inline-flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-md text-sm"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Session
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/40 hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* Story Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 truncate mb-1">{session.storyName}</h3>
                      <p className="text-sm text-gray-600">{session.team.name}</p>
                    </div>

                    {/* Status & Stats */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                      
                      <div className="flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {session.votes.length}
                      </div>

                      {session.finalPoints && (
                        <div className="flex items-center px-2.5 py-1 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-lg text-xs font-bold border border-green-200">
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {session.finalPoints}
                        </div>
                      )}

                      <Link
                        href={`/poker/${session.id}`}
                        className="inline-flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium text-xs whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
