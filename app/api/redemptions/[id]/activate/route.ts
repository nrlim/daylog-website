import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

// POST activate a reward for current month (user activates their redeemed reward)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the redemption
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

    // Only owner can activate their reward
    if (redemption.userId !== auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Reward must be approved to activate
    if (redemption.status !== 'approved') {
      return NextResponse.json(
        { error: 'Reward must be approved before activation' },
        { status: 400 }
      );
    }

    // Already activated
    if (redemption.isActivated) {
      return NextResponse.json({ error: 'Reward already activated' }, { status: 400 });
    }

    // Only WFH rewards can be activated (check if reward name contains "wfh" or similar)
    const isWfhReward = redemption.reward.name.toLowerCase().includes('wfh');
    
    if (!isWfhReward) {
      return NextResponse.json(
        { error: 'This reward type cannot be activated' },
        { status: 400 }
      );
    }

    // Get current month/year
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    // Extract quota amount from reward name (e.g., "WFH Day +1" -> 1)
    const quotaMatch = redemption.reward.name.match(/\+(\d+)/);
    const quotaDays = quotaMatch ? parseInt(quotaMatch[1]) : 1;

    // Create or update UserWFHQuota for current month
    const wfhQuota = await prisma.userWFHQuota.upsert({
      where: {
        userId_month_year: {
          userId: redemption.userId,
          month,
          year,
        },
      },
      create: {
        userId: redemption.userId,
        month,
        year,
        totalQuota: quotaDays,
      },
      update: {
        totalQuota: {
          increment: quotaDays,
        },
      },
    });

    // Mark redemption as activated
    const updatedRedemption = await prisma.redemption.update({
      where: { id: params.id },
      data: {
        isActivated: true,
        activatedAt: new Date(),
        status: 'completed', // Auto-complete when activated
      },
      include: {
        reward: true,
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return NextResponse.json({
      redemption: updatedRedemption,
      wfhQuota,
      message: `WFH quota updated! You now have ${wfhQuota.totalQuota} additional WFH day(s) for ${month}/${year}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to activate reward' }, { status: 500 });
  }
}
