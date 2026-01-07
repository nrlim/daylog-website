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
    const { finalPoints } = body;

    const session = await prisma.pokerSession.update({
      where: { id: params.id },
      data: {
        status: 'completed',
        finalPoints,
      },
    });

    return NextResponse.json({ session });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 });
  }
}
