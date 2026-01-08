import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

// PUT update redemption status (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update redemption status' }, { status: 403 });
    }

    const { status } = await request.json();

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const redemption = await prisma.redemption.findUnique({
      where: { id: params.id },
      include: {
        reward: true,
        user: true,
      },
    });

    if (!redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    // If rejecting an approved redemption, refund points
    if (status === 'rejected' && redemption.status === 'approved') {
      await prisma.user.update({
        where: { id: redemption.userId },
        data: {
          points: {
            increment: redemption.reward.pointsCost,
          },
        },
      });
    }

    const updatedRedemption = await prisma.redemption.update({
      where: { id: params.id },
      data: { status },
      include: {
        reward: true,
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    return NextResponse.json({ redemption: updatedRedemption });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update redemption' }, { status: 500 });
  }
}

// DELETE redemption (user can delete pending redemption)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const redemption = await prisma.redemption.findUnique({
      where: { id: params.id },
      include: { reward: true },
    });

    if (!redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    // Only owner or admin can delete
    if (redemption.userId !== auth.userId && auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can only delete pending redemptions
    if (redemption.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending redemptions' },
        { status: 400 }
      );
    }

    // Refund points and restore reward quantity if not unlimited
    // Refund points
    await prisma.user.update({
      where: { id: redemption.userId },
      data: {
        points: {
          increment: redemption.reward.pointsCost,
        },
      },
    });

    // Restore reward quantity if it's not unlimited (-1)
    if (redemption.reward.quantity !== -1) {
      await prisma.reward.update({
        where: { id: redemption.rewardId },
        data: {
          quantity: {
            increment: 1,
          },
        },
      });
    }

    // Delete the redemption
    await prisma.redemption.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Redemption cancelled and points refunded' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to cancel redemption' }, { status: 500 });
  }
}
