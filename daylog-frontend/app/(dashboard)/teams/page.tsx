'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { teamAPI } from '@/lib/api';
import { Team } from '@/types';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const response = await teamAPI.getTeams();
      setTeams(response.data.teams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    try {
      await teamAPI.deleteTeam(id);
      loadTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <Link
          href="/teams/create"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Team
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">{team.name}</h2>
            <p className="text-gray-600 mb-4">{team.description || 'No description'}</p>
            <p className="text-sm text-gray-500 mb-4">{team.members.length} members</p>
            <div className="flex space-x-2">
              <Link
                href={`/teams/${team.id}`}
                className="text-blue-500 hover:underline"
              >
                View
              </Link>
              <button
                onClick={() => handleDelete(team.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No teams yet</p>
          <Link
            href="/teams/create"
            className="text-blue-500 hover:underline"
          >
            Create your first team
          </Link>
        </div>
      )}
    </div>
  );
}
