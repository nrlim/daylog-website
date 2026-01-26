'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { userAPI, api } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';
import { User } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [topPerformers, setTopPerformers] = useState<{ [userId: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    loadUsers();
    loadTopPerformers();
  }, []);

  const loadTopPerformers = async () => {
    try {
      const response = await api.get('/top-performers');
      const topMap: { [userId: string]: number } = {};
      if (response.data && response.data.performers) {
        response.data.performers.forEach((performer: any) => {
          topMap[performer.userId] = performer.rank;
        });
      }
      setTopPerformers(topMap);
    } catch (error) {
      console.error('Failed to load top performers:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load users list',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete ${username}?`)) return;

    setDeleting(id);
    try {
      await userAPI.deleteUser(id);
      addNotification({
        type: 'success',
        title: 'User Deleted',
        message: `${username} has been deleted successfully`,
      });
      loadUsers();
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.error || 'Failed to delete user',
      });
    } finally {
      setDeleting(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-gray-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-medium text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header - Clean & Minimal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Members</h1>
            <p className="text-gray-500 text-sm mt-1">
              {users.length} active members in your organization
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 transition-all"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <Link
              href="/users/create"
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New User
            </Link>
          </div>
        </div>

        {/* Grid Layout - Standard Cards to reduce eye fatigue */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">�</div>
            <h3 className="text-gray-900 font-semibold mb-1">No users found</h3>
            <p className="text-gray-400 text-sm">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredUsers.map((user) => (
              <div key={user.id} className="group bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-indigo-100 transition-all duration-200 flex flex-col">

                {/* Top Section */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${topPerformers[user.id] === 1 ? 'bg-amber-400' :
                      topPerformers[user.id] === 2 ? 'bg-slate-400' :
                        topPerformers[user.id] === 3 ? 'bg-orange-400' :
                          'bg-indigo-500'
                    }`}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex gap-2">
                    {topPerformers[user.id] && (
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-50 text-yellow-600 text-xs" title={`Top Performer #${topPerformers[user.id]}`}>
                        {topPerformers[user.id] === 1 ? '🥇' : topPerformers[user.id] === 2 ? '�' : '�🥉'}
                      </span>
                    )}
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                      {user.role}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 text-lg truncate" title={user.username}>{user.username}</h3>
                  <p className="text-sm text-gray-500 truncate" title={user.email}>{user.email || 'No email'}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-medium text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {new Date(user.createdAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/users/${user.id}`} className="text-gray-400 hover:text-indigo-600 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </Link>
                    {deleting === user.id ? (
                      <span className="animate-spin text-rose-500"><svg className="w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg></span>
                    ) : (
                      <button onClick={() => handleDelete(user.id, user.username)} className="text-gray-400 hover:text-rose-600 p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
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
