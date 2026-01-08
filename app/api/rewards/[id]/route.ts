import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

// GET reward by ID (admin)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can view reward details' }, { status: 403 });
    }

    const reward = await prisma.reward.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json({ reward });
  } catch (error: any) {
    console.error('Failed to fetch reward:', error);
    return NextResponse.json({ error: 'Failed to fetch reward' }, { status: 500 });
  }
}

// PUT update reward (admin only)
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
      return NextResponse.json({ error: 'Only admins can update rewards' }, { status: 403 });
    }

    const { name, description, pointsCost, quantity, isActive } = await request.json();

    const reward = await prisma.reward.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(pointsCost && { pointsCost }),
        ...(quantity !== undefined && { quantity }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ reward });
  } catch (error: any) {
    console.error('Failed to update reward:', error);
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 });
  }
}

// DELETE reward (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete rewards' }, { status: 403 });
    }

    await prisma.reward.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Reward deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete reward:', error);
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 });
  }
}
