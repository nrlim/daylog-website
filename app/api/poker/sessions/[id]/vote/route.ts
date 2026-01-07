import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

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
    const { points } = body;

    const vote = await prisma.vote.upsert({
      where: {
        pokerSessionId_userId: {
          pokerSessionId: params.id,
          userId: auth.userId,
        },
      },
      update: { points },
      create: {
        pokerSessionId: params.id,
        userId: auth.userId,
        points,
      },
    });

    return NextResponse.json({ vote });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}
