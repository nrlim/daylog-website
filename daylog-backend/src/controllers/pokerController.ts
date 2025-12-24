import { Response, Request } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// In-memory storage for anonymous poker sessions (use Redis in production)
interface Participant {
  name: string;
  card: number | null;
  revealed: boolean;
}

interface AnonymousSession {
  id: string;
  participants: Participant[];
  showResults: boolean;
  createdAt: Date;
}

const anonymousSessions = new Map<string, AnonymousSession>();

// Anonymous Poker Session Endpoints (no auth required)
export const createAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id, creatorName } = req.body;
    
    const session: AnonymousSession = {
      id,
      participants: [{
        name: creatorName,
        card: null,
        revealed: false
      }],
      showResults: false,
      createdAt: new Date()
    };
    
    anonymousSessions.set(id, session);
    
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const getAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = anonymousSessions.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
};

export const joinAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerName } = req.body;
    
    const session = anonymousSessions.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Check if player already exists
    const existingPlayer = session.participants.find(p => p.name === playerName);
    if (!existingPlayer) {
      session.participants.push({
        name: playerName,
        card: null,
        revealed: false
      });
    }
    
    anonymousSessions.set(id, session);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to join session' });
  }
};

export const voteAnonymous = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerName, card, revealed } = req.body;
    
    const session = anonymousSessions.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Update participant's vote
    session.participants = session.participants.map(p => 
      p.name === playerName ? { ...p, card, revealed } : p
    );
    
    anonymousSessions.set(id, session);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
};

export const revealAllAnonymous = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = anonymousSessions.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.showResults = true;
    session.participants = session.participants.map(p => ({ ...p, revealed: true }));
    
    anonymousSessions.set(id, session);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reveal cards' });
  }
};

export const resetAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = anonymousSessions.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    session.showResults = false;
    session.participants = session.participants.map(p => ({ 
      ...p, 
      card: null, 
      revealed: false 
    }));
    
    anonymousSessions.set(id, session);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset session' });
  }
};

// Authenticated Poker Session Endpoints (original)
export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId, storyName, description } = req.body;
    
    const session = await prisma.pokerSession.create({
      data: {
        teamId,
        storyName,
        description,
      },
    });
    
    res.status(201).json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create poker session' });
  }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.query;
    
    const sessions = await prisma.pokerSession.findMany({
      where: teamId ? { teamId: teamId as string } : undefined,
      include: {
        team: {
          select: { id: true, name: true },
        },
        votes: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get poker sessions' });
  }
};

export const getSessionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.pokerSession.findUnique({
      where: { id },
      include: {
        team: {
          select: { id: true, name: true },
        },
        votes: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Poker session not found' });
    }
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get poker session' });
  }
};

export const vote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { points } = req.body;
    
    const vote = await prisma.vote.upsert({
      where: {
        pokerSessionId_userId: {
          pokerSessionId: id,
          userId: req.userId!,
        },
      },
      update: { points },
      create: {
        pokerSessionId: id,
        userId: req.userId!,
        points,
      },
    });
    
    res.json({ vote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit vote' });
  }
};

export const revealVotes = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.pokerSession.update({
      where: { id },
      data: { status: 'revealed' },
      include: {
        votes: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reveal votes' });
  }
};

export const completeSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { finalPoints } = req.body;
    
    const session = await prisma.pokerSession.update({
      where: { id },
      data: {
        status: 'completed',
        finalPoints,
      },
    });
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
};
