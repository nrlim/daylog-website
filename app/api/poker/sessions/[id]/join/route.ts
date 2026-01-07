import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { playerName } = body;

    if (!playerName) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    // Get the session
    const session = await prisma.pokerSession.findUnique({
      where: { id: params.id },
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
      return NextResponse.json({ error: 'Poker session not found' }, { status: 404 });
    }

    // Create or update vote for this user (join the session)
    const existingVote = await prisma.vote.findUnique({
      where: {
        pokerSessionId_userId: {
          pokerSessionId: params.id,
          userId: auth.userId,
        },
      },
    });

    if (!existingVote) {
      try {
        await prisma.vote.create({
          data: {
            pokerSessionId: params.id,
            userId: auth.userId,
            points: 0, // Default points
          },
        });
      } catch (voteError: any) {
        console.error('Failed to create vote:', voteError);
        return NextResponse.json({ 
          error: 'Failed to join session',
          details: voteError.message 
        }, { status: 500 });
      }
    }

    // Get updated session with all votes
    const updatedSession = await prisma.pokerSession.findUnique({
      where: { id: params.id },
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

    if (!updatedSession) {
      return NextResponse.json({ error: 'Session not found after join' }, { status: 404 });
    }

    // Return session data with participants
    const participants = updatedSession.votes.map((vote) => ({
      name: vote.user.username || 'Unknown',
      card: vote.points || 0,
      revealed: updatedSession.status === 'revealed',
    }));

    return NextResponse.json({
      sessionId: updatedSession.id,
      participants,
      showResults: updatedSession.status === 'revealed',
      creatorName: 'Unknown',
      teamId: updatedSession.teamId,
    });
  } catch (error: any) {
    console.error('Failed to join poker session:', error);
    return NextResponse.json({ error: 'Failed to join poker session', details: error.message }, { status: 500 });
  }
}
