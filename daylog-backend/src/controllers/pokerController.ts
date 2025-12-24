import { Response, Request } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Interface for participants
interface Participant {
  name: string;
  card: number | null;
  revealed: boolean;
}

interface AnonymousSession {
  id: string;
  creatorName: string;
  participants: Participant[];
  showResults: boolean;
  createdAt: Date;
  hostName?: string;
}

// Anonymous Poker Session Endpoints (no auth required)
export const createAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id, creatorName } = req.body;
    
    const participants: Participant[] = [{
      name: creatorName,
      card: null,
      revealed: false
    }];
    
    // Save to database
    const session = await prisma.anonymousPokerSession.create({
      data: {
        id,
        creatorName,
        participants: participants as any,
        showResults: false,
      }
    });
    
    res.status(201).json({
      id: session.id,
      creatorName: session.creatorName,
      participants: session.participants as unknown as Participant[],
      showResults: session.showResults,
      hostName: creatorName
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const getAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.anonymousPokerSession.findUnique({
      where: { id }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      id: session.id,
      creatorName: session.creatorName,
      participants: session.participants as unknown as Participant[],
      showResults: session.showResults,
      hostName: session.creatorName
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
};

export const joinAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerName } = req.body;
    
    const session = await prisma.anonymousPokerSession.findUnique({
      where: { id }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const participants = session.participants as unknown as Participant[];
    
    // Check if player already exists
    const existingPlayer = participants.find(p => p.name === playerName);
    if (!existingPlayer) {
      participants.push({
        name: playerName,
        card: null,
        revealed: false
      });
    }
    
    // Update database
    await prisma.anonymousPokerSession.update({
      where: { id },
      data: {
        participants: participants as any
      }
    });
    
    res.json({
      id: session.id,
      creatorName: session.creatorName,
      participants: participants,
      showResults: session.showResults,
      hostName: session.creatorName
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join session' });
  }
};

export const voteAnonymous = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerName, card, revealed } = req.body;
    
    const session = await prisma.anonymousPokerSession.findUnique({
      where: { id }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    let participants = session.participants as unknown as Participant[];
    
    // Update participant's vote
    participants = participants.map(p => 
      p.name === playerName ? { ...p, card, revealed } : p
    );
    
    await prisma.anonymousPokerSession.update({
      where: { id },
      data: { participants: participants as any }
    });
    
    res.json({
      id: session.id,
      creatorName: session.creatorName,
      participants: participants,
      showResults: session.showResults,
      hostName: session.creatorName
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
};

export const revealAllAnonymous = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.anonymousPokerSession.findUnique({
      where: { id }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    let participants = session.participants as unknown as Participant[];
    participants = participants.map(p => ({ ...p, revealed: true }));
    
    const updated = await prisma.anonymousPokerSession.update({
      where: { id },
      data: {
        participants: participants as any,
        showResults: true
      }
    });
    
    res.json({
      id: updated.id,
      creatorName: updated.creatorName,
      participants: updated.participants as unknown as Participant[],
      showResults: updated.showResults,
      hostName: updated.creatorName
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reveal cards' });
  }
};

export const resetAnonymousSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.anonymousPokerSession.findUnique({
      where: { id }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    let participants = session.participants as unknown as Participant[];
    participants = participants.map(p => ({ 
      ...p, 
      card: null, 
      revealed: false 
    }));
    
    const updated = await prisma.anonymousPokerSession.update({
      where: { id },
      data: {
        participants: participants as any,
        showResults: false
      }
    });
    
    res.json({
      id: updated.id,
      creatorName: updated.creatorName,
      participants: updated.participants as unknown as Participant[],
      showResults: updated.showResults,
      hostName: updated.creatorName
    });
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
