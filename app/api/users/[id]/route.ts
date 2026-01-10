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
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profilePicture: true,
        createdAt: true,
        teamMembers: {
          include: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
        activities: {
          select: { id: true, description: true, date: true, status: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (params.id !== auth.userId && auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, role, profilePicture } = body;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(role && { role }),
        ...(profilePicture && { profilePicture }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profilePicture: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (params.id === auth.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
