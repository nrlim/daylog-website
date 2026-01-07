import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await prisma.anonymousPokerSession.findUnique({
      where: { id: params.id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      creatorName: session.creatorName,
      participants: session.participants as unknown as any[],
      showResults: session.showResults,
      hostName: session.creatorName
    });
  } catch (error: any) {
    console.error('Failed to get session:', error);
    return NextResponse.json({ error: 'Failed to get session', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { playerName, card, revealed, action } = body;

    const session = await prisma.anonymousPokerSession.findUnique({
      where: { id: params.id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let participants = session.participants as unknown as any[];
    let showResults = session.showResults;

    if (action === 'reset') {
      // Reset all cards but keep participants
      participants = participants.map(p => ({ ...p, card: null, revealed: false }));
      showResults = false;
    } else if (card !== undefined) {
      // Update vote
      participants = participants.map(p =>
        p.name === playerName ? { ...p, card, revealed } : p
      );
    } else {
      // Join session
      const existingPlayer = participants.find(p => p.name === playerName);
      if (!existingPlayer) {
        participants.push({
          name: playerName,
          card: null,
          revealed: false
        });
      }
    }

    const updated = await prisma.anonymousPokerSession.update({
      where: { id: params.id },
      data: {
        participants: participants as any,
        showResults: showResults
      }
    });

    return NextResponse.json({
      id: updated.id,
      creatorName: updated.creatorName,
      participants: updated.participants as unknown as any[],
      showResults: updated.showResults,
      hostName: updated.creatorName
    });
  } catch (error: any) {
    console.error('Failed to update session:', error);
    return NextResponse.json({ error: 'Failed to update session', details: error.message }, { status: 500 });
  }
}
