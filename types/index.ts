export interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  wfhLimitPerMonth?: number;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  isLead?: boolean;
  user: {
    id: string;
    username: string;
    role?: string;
  };
}

export interface Activity {
  id: string;
  userId: string;
  date: string;
  time?: string;
  subject: string;
  description: string;
  status: 'Done' | 'InProgress' | 'Blocked';
  blockedReason?: string;
  isWfh?: boolean;
  project?: string;
  user: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PokerSession {
  id: string;
  teamId: string;
  storyName: string;
  description?: string;
  status: 'voting' | 'revealed' | 'completed';
  finalPoints?: number;
  team: {
    id: string;
    name: string;
  };
  votes: Vote[];
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  pokerSessionId: string;
  userId: string;
  points: number;
  user: {
    id: string;
    username: string;
  };
}
