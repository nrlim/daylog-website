'use client';

import { useState, useEffect } from 'react';
import { pointsAPI, userAPI } from '@/lib/api';
import { useNotificationStore } from '@/lib/store';

interface User {
  id: string;
  username: string;
  email?: string;
  points?: number;
}

export default function ManagePointsPanel() {
  const [members, setMembers] = useState<User[]>([]);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const { addNotification } = useNotificationStore();

  // Fetch all members
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setMemberLoading(true);
    try {
      const response = await userAPI.getUsers();
      
      // Handle different response formats
      let users = [];
      if (response.data?.users) {
        users = response.data.users;
      } else if (Array.isArray(response.data)) {
        users = response.data;
      } else if (response.data) {
        users = Object.values(response.data).filter(item => typeof item === 'object');
      }
      
      // Filter out admins - keep all members
      const filteredMembers = users.filter((user: any) => user && user.role !== 'admin');
      setMembers(filteredMembers);
      
      if (filteredMembers.length === 0) {
        addNotification({
          type: 'info',
          title: 'Info',
          message: 'No members found to manage',
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch members:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to load members',
      });
    } finally {
      setMemberLoading(false);
    }
  };

  const handleGivePoints = async () => {
    if (!selectedMember) {
      addNotification({
        type: 'warning',
        title: 'Warning',
        message: 'Please select a member',
      });
      return;
    }

    if (points <= 0) {
      addNotification({
        type: 'warning',
        title: 'Warning',
        message: 'Points must be greater than 0',
      });
      return;
    }

    setLoading(true);
    try {
      await pointsAPI.givePoints(selectedMember.id, points, description);
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Gave ${points} points to ${selectedMember.username}`,
      });
      setPoints(0);
      setDescription('');
      setSelectedMember(null);
      setSearchQuery('');
      setShowDropdown(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Failed to give points:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to give points',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Member Selection and Details */}
        <div className="space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Member <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={selectedMember ? selectedMember.username : "Search member..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow-lg z-10">
                  {memberLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600"></div>
                      <p className="mt-2 text-xs">Loading...</p>
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {members.length === 0 ? 'No members available' : 'No members found'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedMember(member);
                            setSearchQuery('');
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors duration-150"
                        >
                          <p className="font-medium text-gray-900 text-sm">{member.username}</p>
                          {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Points Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Points to Award <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={points}
              onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="Enter points"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">Enter a value between 1 and 1000</p>
          </div>
        </div>

        {/* Right Column - Selected Member and Description */}
        <div className="space-y-4">
          {/* Selected Member Display */}
          {selectedMember ? (
            <div className="flex items-center justify-between bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                  {selectedMember.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selectedMember.username}</p>
                  {selectedMember.email && <p className="text-xs text-gray-500">{selectedMember.email}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-blue-100 rounded transition-colors"
                aria-label="Remove selection"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
              No member selected
            </div>
          )}

          {/* Description Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why are you giving these points?"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleGivePoints}
          disabled={loading || !selectedMember || points <= 0}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Giving...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <span>Give Points</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
