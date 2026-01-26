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
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-gray-900">Award Points</h2>
        <p className="text-gray-500 font-medium">Recognize your team members for their contributions</p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Select Member */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            1. Select Team Member
          </label>
          <div className="relative">
            <div className={`
              flex items-center gap-3 p-3 bg-gray-50 border transition-all rounded-xl
              ${showDropdown || searchQuery ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-200'}
            `}>
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-400">
                {selectedMember ? (
                  <span className="font-bold text-blue-600 text-lg">{selectedMember.username[0].toUpperCase()}</span>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                )}
              </div>
              <input
                type="text"
                placeholder={selectedMember ? selectedMember.username : "Search by name or email..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value && selectedMember) {
                    // Allow clearing selection by clearing text if needed, strictly optionally logic here
                    // But mostly we keep selection until replaced
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                className="flex-1 bg-transparent border-none outline-none font-medium placeholder:text-gray-400 text-gray-900"
              />
              {selectedMember && (
                <button onClick={() => { setSelectedMember(null); setSearchQuery(''); }} className="p-1 hover:bg-gray-200 rounded-full text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-64 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {memberLoading ? (
                  <div className="p-4 text-center text-gray-400 text-sm font-medium">Loading members...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm font-medium">No members found.</div>
                ) : (
                  <div className="p-1">
                    {filteredMembers.map(member => (
                      <button
                        key={member.id}
                        onClick={() => {
                          setSelectedMember(member);
                          setSearchQuery('');
                          setShowDropdown(false);
                        }}
                        className="w-full text-left flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg group transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {member.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{member.username}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                        {member.points !== undefined && (
                          <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                            {member.points} pts
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Points & Reason (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              2. Points Amount
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="5000"
                value={points === 0 ? '' : points}
                onChange={(e) => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-black text-xl text-gray-900 placeholder:text-gray-300"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">PTS</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[50, 100, 200, 500].map(val => (
                <button key={val} onClick={() => setPoints(val)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-colors">
                  +{val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              3. Reason (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Great work on..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium resize-none text-sm"
            />
          </div>
        </div>

        {/* Step 3: Action */}
        <div className="pt-4">
          <button
            onClick={handleGivePoints}
            disabled={loading || !selectedMember || points <= 0}
            className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <span>Confirm & Send Points</span>
                <svg className="w-5 h-5 opacity-70" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
