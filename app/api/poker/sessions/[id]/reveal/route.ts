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

    const session = await prisma.pokerSession.update({
      where: { id: params.id },
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

    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to reveal votes' }, { status: 500 });
  }
}
