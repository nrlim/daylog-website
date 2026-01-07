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
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Username and password are required',
      });
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
        message: `User "${formData.username}" created successfully${selectedTeams.length > 0 ? ` and added to ${selectedTeams.length} team(s)` : ''}`,
      });
      router.push('/users');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create user';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create User</h1>
        <p className="text-gray-600 mt-1">Add a new user to your system</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow border border-gray-100 p-8 space-y-6">
        {/* Username Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Username <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
            placeholder="e.g., john_doe"
          />
          <p className="text-gray-600 text-xs mt-1">Unique identifier for the user</p>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="user@example.com"
          />
          <p className="text-gray-600 text-xs mt-1">Optional email address</p>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Password <span className="text-red-600">*</span>
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            required
            placeholder="Enter a secure password"
          />
          <p className="text-gray-600 text-xs mt-1">Must be at least 6 characters</p>
        </div>

        {/* Teams Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">Assign to Teams</label>
          {teamsLoading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm">Loading teams...</span>
            </div>
          ) : teams.length > 0 ? (
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {teams.map((team) => (
                <label
                  key={team.id}
                  className="flex items-center gap-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeams.includes(team.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTeams([...selectedTeams, team.id]);
                      } else {
                        setSelectedTeams(selectedTeams.filter((id) => id !== team.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{team.name}</p>
                    {team.description && (
                      <p className="text-xs text-gray-600">{team.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
              No teams available. Create a team first.
            </p>
          )}
          <p className="text-gray-600 text-xs mt-2">Optional - You can add the user to teams now or later</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900">Default Role</p>
              <p className="text-sm text-blue-800 mt-1">New users are created with the <strong>member</strong> role. You can change the role from the user detail page.</p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H19.5V10.5H10.5z"></path>
                </svg>
                Create User
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
