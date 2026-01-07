import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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

    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get poker session' }, { status: 500 });
  }
}
