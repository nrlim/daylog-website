import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

// GET all redemptions (admin) or user's redemptions (member)
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if this is a personal view request (for "My Rewards" tab)
    const url = new URL(request.url);
    const personalView = url.searchParams.get('personal') === 'true';

    let redemptions;

    if (auth.userRole === 'admin' && !personalView) {
      // Admin gets all redemptions for management view
      redemptions = await prisma.redemption.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          userId: true,
          user: {
            select: { id: true, username: true, email: true },
          },
          reward: {
            select: { id: true, name: true, pointsCost: true, expiresAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Member or personal view - gets only current user's redemptions
      redemptions = await prisma.redemption.findMany({
        where: { userId: auth.userId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          expiresAt: true,
          reward: {
            select: { id: true, name: true, description: true, pointsCost: true, expiresAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ redemptions });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch redemptions' }, { status: 500 });
  }
}

// POST create redemption (member redeems a reward)
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { rewardId } = await request.json();

    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    // Get reward details
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    if (!reward.isActive) {
      return NextResponse.json({ error: 'Reward is no longer available' }, { status: 400 });
    }

    // Get user's current points
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { points: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has enough points
    if (user.points < reward.pointsCost) {
      return NextResponse.json(
        { error: `Insufficient points. You need ${reward.pointsCost} but have ${user.points}` },
        { status: 400 }
      );
    }

    // Check reward quantity
    if (reward.quantity !== -1 && reward.quantity <= 0) {
      return NextResponse.json({ error: 'Reward is out of stock' }, { status: 400 });
    }

    // Create redemption and deduct points
    // Set expiration to 2 months from now
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 2);

    // Create redemption as approved (redeemed, but not activated yet)
    const redemption = await prisma.redemption.create({
      data: {
        userId: auth.userId,
        rewardId,
        status: 'approved',
        expiresAt,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        reward: {
          select: { id: true, name: true, pointsCost: true, expiresAt: true },
        },
      },
    });

    // Deduct points from user
    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        points: {
          decrement: reward.pointsCost,
        },
      },
      select: { id: true, points: true },
    });

    // Decrement reward quantity if not unlimited (-1)
    if (reward.quantity !== -1) {
      await prisma.reward.update({
        where: { id: rewardId },
        data: {
          quantity: {
            decrement: 1,
          },
        },
      });
    }

    return NextResponse.json({ redemption, user: updatedUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 });
  }
}
