'use client';

import { useState, useEffect } from 'react';
import { rewardsAPI } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';

interface Reward {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  quantity: number;
  isActive: boolean;
  createdAt: string;
}

export default function ManageRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsCost: 0,
    quantity: -1,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const response = await rewardsAPI.getRewards();
      setRewards(response.data?.rewards || []);
    } catch (error: any) {
      console.error('Failed to fetch rewards:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load rewards',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (reward?: Reward) => {
    if (reward) {
      setEditingId(reward.id);
      setFormData({
        name: reward.name,
        description: reward.description || '',
        pointsCost: reward.pointsCost,
        quantity: reward.quantity,
        isActive: reward.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', pointsCost: 0, quantity: -1, isActive: true });
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.pointsCost < 1) {
      addNotification({
        type: 'warning',
        title: 'Validation Error',
        message: 'Name and points cost are required',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await rewardsAPI.updateReward(editingId, formData);
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Reward updated successfully',
        });
      } else {
        await rewardsAPI.createReward(
          formData.name,
          formData.description,
          formData.pointsCost,
          formData.quantity,
          formData.isActive
        );
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Reward created successfully',
        });
      }
      setIsOpen(false);
      fetchRewards();
    } catch (error: any) {
      console.error('Failed to save reward:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'Failed to save reward',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm('Are you sure you want to delete this reward?')) return;

    try {
      await rewardsAPI.deleteReward(rewardId);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Reward deleted successfully',
      });
      fetchRewards();
    } catch (error: any) {
      console.error('Failed to delete reward:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete reward',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Manage Rewards</h2>
          <p className="text-gray-500 mt-1 font-medium">Create and update available rewards</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
        >
          <span>＋</span> Add Reward
        </button>
      </div>

      {/* Add/Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-all"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-0 overflow-hidden transform transition-all">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900">
                {editingId ? 'Edit Reward' : 'Create New Reward'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Reward Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none font-medium transition-all"
                  placeholder='e.g., "$50 Amazon Gift Card"'
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none font-medium transition-all resize-none"
                  placeholder="Describe what the user will receive..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Points Cost *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.pointsCost}
                    onChange={(e) => setFormData({ ...formData, pointsCost: Math.max(1, parseInt(e.target.value) || 0) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val)) setFormData({ ...formData, quantity: -1 });
                      else setFormData({ ...formData, quantity: Math.max(-1, val) });
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-900 outline-none font-medium"
                    placeholder="-1 for unlimited"
                  />
                  <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-wide">Use -1 for unlimited</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="peer sr-only"
                  />
                  <label htmlFor="isActive" className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isActive ? 'translate-x-6' : ''}`}></span>
                  </label>
                </div>
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                  Reward is Active
                </label>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg"
                >
                  {submitting ? 'Saving...' : 'Save Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rewards List */}
      <div className="space-y-4">
        {rewards.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold text-lg">No rewards created yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first reward to get started</p>
          </div>
        ) : (
          rewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{reward.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${reward.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                      {reward.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {reward.description && (
                    <p className="text-sm text-gray-500 mb-3">{reward.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-400 text-xs uppercase">Cost:</span>
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold text-xs">{reward.pointsCost} pts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-400 text-xs uppercase">Stock:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-xs ${reward.quantity === 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {reward.quantity === -1 ? 'Unlimited' : reward.quantity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenForm(reward)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
