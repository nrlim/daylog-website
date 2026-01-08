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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Manage Rewards</h2>
        <button
          onClick={() => handleOpenForm()}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          + Add Reward
        </button>
      </div>

      {/* Add/Edit Modal */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingId ? 'Edit Reward' : 'Create New Reward'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reward Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Coffee Voucher"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Reward description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Points Cost *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.pointsCost}
                    onChange={(e) => setFormData({ ...formData, pointsCost: Math.max(1, parseInt(e.target.value) || 0) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity (-1 for unlimited)
                  </label>
                  <input
                    type="number"
                    min="-1"
                    value={formData.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val)) {
                        setFormData({ ...formData, quantity: -1 });
                      } else {
                        setFormData({ ...formData, quantity: Math.max(-1, val) });
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 10 or -1 for unlimited"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use -1 for unlimited stock</p>
                </div>

                <div className="flex items-center gap-3 py-2 border-t border-gray-200">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Active Reward
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Rewards List */}
      <div className="space-y-3">
        {rewards.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No rewards created yet</p>
        ) : (
          rewards.map((reward) => (
            <div
              key={reward.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        reward.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {reward.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {reward.description && (
                    <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-amber-600 font-medium">{reward.pointsCost} pts</span>
                    <span className="text-gray-600">
                      {reward.quantity === -1 ? 'Unlimited' : `${reward.quantity} available`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenForm(reward)}
                    className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
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
