import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

// POST seed WFH rewards (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create rewards' }, { status: 403 });
    }

    const wfhRewards = [
      {
        name: 'WFH Day +1',
        description: 'Redeem for 1 additional WFH day this month (personal quota)',
        pointsCost: 50,
        quantity: -1, // unlimited
        isActive: true,
      },
      {
        name: 'WFH Week +5',
        description: 'Redeem for 5 additional WFH days this month (personal quota)',
        pointsCost: 200,
        quantity: -1, // unlimited
        isActive: true,
      },
    ];

    const results = [];
    for (const rewardData of wfhRewards) {
      try {
        const existing = await prisma.reward.findFirst({
          where: { name: rewardData.name },
        });

        if (existing) {
          results.push({
            name: rewardData.name,
            status: 'already_exists',
            id: existing.id,
          });
        } else {
          const created = await prisma.reward.create({
            data: rewardData,
          });
          results.push({
            name: created.name,
            status: 'created',
            id: created.id,
          });
        }
      } catch (error: any) {
        results.push({
          name: rewardData.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      message: 'WFH rewards seeding completed',
      results,
    });
  } catch (error: any) {
    console.error('Failed to seed WFH rewards:', error);
    return NextResponse.json({ error: 'Failed to seed rewards' }, { status: 500 });
  }
}
