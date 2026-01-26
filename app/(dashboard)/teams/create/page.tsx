'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { teamAPI } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';
import Link from 'next/link';

export default function CreateTeamPage() {
  const router = useRouter();
  const { addNotification } = useNotificationStore();
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      const errorMsg = 'Team name is required';
      setError(errorMsg);
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: errorMsg,
      });
      return;
    }

    setLoading(true);

    try {
      await teamAPI.createTeam(formData);
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Team "${formData.name}" created successfully`,
      });
      router.push('/teams');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create team';
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Create New Team</h1>
          <p className="text-gray-500 font-medium text-lg">Bring your people together and start collaborating.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 p-8 md:p-10 relative overflow-hidden">
          {/* Decorative gradient blob */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            <div className="space-y-6">
              <div>
                <label htmlFor="teamName" className="block text-sm font-bold text-gray-700 mb-2 ml-1">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-100 focus:border-gray-400 focus:bg-white transition-all outline-none font-bold text-lg text-gray-900 placeholder:text-gray-300"
                  placeholder="e.g. Engineering Squad"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2 ml-1">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-gray-100 focus:border-gray-400 focus:bg-white transition-all outline-none font-medium text-gray-900 placeholder:text-gray-300 resize-none"
                  placeholder="What is this team about?"
                  rows={4}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">Team Roles</h4>
                <p className="text-sm text-blue-700/80 leading-relaxed">
                  After creating the team, you'll be assigned as the <strong>Team Admin</strong>. You can then invite other members and assign leads.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse md:flex-row gap-4 pt-4">
              <Link
                href="/teams"
                className="px-8 py-4 rounded-xl font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-center transition-all bg-transparent"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-8 py-4 bg-gray-900 hover:bg-black disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Team...
                  </>
                ) : (
                  <>
                    <span>Create Team</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
