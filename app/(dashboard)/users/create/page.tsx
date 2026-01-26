'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, teamAPI } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';
import { Team } from '@/types';

export default function CreateUserPage() {
  const router = useRouter();
  const { addNotification } = useNotificationStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'member' // Default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const response = await teamAPI.getTeams();
      setTeams(response.data.teams);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);

    try {
      // Create the user
      const userResponse = await authAPI.register({
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
      });

      const userId = userResponse.data.userId;

      // Add user to selected teams
      if (selectedTeams.length > 0) {
        for (const teamId of selectedTeams) {
          try {
            await teamAPI.addMember(teamId, userId);
          } catch (err) {
            console.error(`Failed to add user to team ${teamId}:`, err);
          }
        }
      }

      addNotification({
        type: 'success',
        title: 'Success',
        message: `User created successfully`,
      });
      router.push('/users');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create user';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30 p-6 lg:p-10 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
            <p className="text-gray-500 text-sm">Onboard a new member to your organization</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8 lg:p-10">

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Account Details Section */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Account Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Username <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium"
                    placeholder="e.g. john_doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Password <span className="text-rose-500">*</span></label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-medium"
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-xs text-gray-400">Min. 6 characters</p>
                </div>
              </div>
            </div>

            {/* Team Assignment Section */}
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h2 className="text-lg font-bold text-gray-900">Assign Teams</h2>
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">Optional</span>
              </div>

              {teamsLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  Loading teams...
                </div>
              ) : teams.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.map((team) => (
                    <label
                      key={team.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedTeams.includes(team.id)
                          ? 'border-indigo-500 bg-indigo-50/50'
                          : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(team.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTeams([...selectedTeams, team.id]);
                          else setSelectedTeams(selectedTeams.filter(id => id !== team.id));
                        }}
                        className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <div>
                        <p className={`font-bold ${selectedTeams.includes(team.id) ? 'text-indigo-900' : 'text-gray-900'}`}>{team.name}</p>
                        {team.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{team.description}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No teams available to assign.</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="font-medium text-sm">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 text-gray-600 font-semibold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating User...
                  </>
                ) : (
                  'Create User'
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
