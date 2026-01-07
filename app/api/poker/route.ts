import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Anonymous Poker Session Endpoints (no auth required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, creatorName } = body;

    const participants: any[] = [{
      name: creatorName,
      card: null,
      revealed: false
    }];

    const session = await prisma.anonymousPokerSession.create({
      data: {
        id,
        creatorName,
        participants: participants as any,
        showResults: false,
      }
    });

    return NextResponse.json({
      id: session.id,
      creatorName: session.creatorName,
      participants: session.participants as unknown as any[],
      showResults: session.showResults,
      hostName: creatorName
    }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'Failed to create session', details: error.message }, { status: 500 });
  }
}
