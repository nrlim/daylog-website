'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    profilePicture: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        profilePicture: (user as any).profilePicture || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put(`/users/${user?.id}`, {
        username: formData.username,
        email: formData.email,
        profilePicture: formData.profilePicture,
      });

      setUser(response.data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Please log in first</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-black text-white mb-2">Profile Settings</h1>
          <p className="text-slate-400">Update your profile and upload a profile picture</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 text-green-200">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-200">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
              <p className="text-xs text-slate-500 mt-1">Cannot be changed</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>

            {/* Profile Picture URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Profile Picture URL
              </label>
              <input
                type="url"
                value={formData.profilePicture}
                onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/your-photo.jpg"
              />
              <p className="text-xs text-slate-400 mt-2">
                Upload your photo to Cloudinary and paste the URL here
              </p>
            </div>

            {/* Preview */}
            {formData.profilePicture && (
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-300 mb-3">Preview:</p>
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-600 flex items-center justify-center">
                  <img 
                    src={formData.profilePicture} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all duration-200"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
