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

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, points: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ points: user.points });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get user points' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can give points' }, { status: 403 });
    }

    const { points, description } = await request.json();

    if (!points || points < 1 || points > 1000) {
      return NextResponse.json({ error: 'Points must be between 1 and 1000' }, { status: 400 });
    }

    // Verify recipient user exists
    const recipientUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!recipientUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create point transaction
    const transaction = await prisma.pointTransaction.create({
      data: {
        userId: params.id,
        adminId: auth.userId,
        points,
        description: description || undefined,
      },
    });

    // Update user points
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        points: {
          increment: points,
        },
      },
      select: { id: true, points: true, username: true },
    });

    return NextResponse.json({
      transaction,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Points error:', error);
    return NextResponse.json({ error: 'Failed to give points' }, { status: 500 });
  }
}
