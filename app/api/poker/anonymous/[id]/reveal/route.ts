import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
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

    let participants = session.participants as unknown as any[];
    participants = participants.map(p => ({ ...p, revealed: true }));

    const updated = await prisma.anonymousPokerSession.update({
      where: { id: params.id },
      data: {
        participants: participants as any,
        showResults: true
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
    return NextResponse.json({ error: 'Failed to reveal cards' }, { status: 500 });
  }
}
