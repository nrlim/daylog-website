import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

// GET all rewards (admins see all, members see only active and in-stock)
export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let where: any = {};

    if (auth.userRole === 'admin') {
      // Admins see all rewards
      where = {};
    } else {
      // Members only see active rewards that are in stock
      where = {
        isActive: true,
        OR: [
          { quantity: -1 }, // Unlimited rewards
          { quantity: { gt: 0 } }, // Rewards with quantity > 0
        ],
      };
    }

    const rewards = await prisma.reward.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        pointsCost: true,
        quantity: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rewards });
  } catch (error: any) {
    console.error('Failed to fetch rewards:', error);
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 });
  }
}

// POST create new reward (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create rewards' }, { status: 403 });
    }

    const { name, description, pointsCost, quantity, isActive } = await request.json();

    if (!name || !pointsCost) {
      return NextResponse.json({ error: 'Name and points cost are required' }, { status: 400 });
    }

    if (pointsCost < 1) {
      return NextResponse.json({ error: 'Points cost must be greater than 0' }, { status: 400 });
    }

    const reward = await prisma.reward.create({
      data: {
        name,
        description: description || null,
        pointsCost,
        quantity: quantity || -1,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ reward }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create reward:', error);
    return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 });
  }
}
