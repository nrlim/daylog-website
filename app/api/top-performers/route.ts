import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/backend/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Get top performers set by admin for this month
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();

    const topPerformersRecords = await prisma.topPerformer.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
      orderBy: {
        rank: 'asc',
      },
    });

    // Format response
    const performers = topPerformersRecords.map((record) => ({
      id: record.id,
      userId: record.userId,
      rank: record.rank,
      points: 0, // Placeholder for display
      activityCount: 0, // Placeholder
      user: {
        id: record.user.id,
        username: record.user.username,
        profilePicture: record.user.profilePicture,
      },
    }));

    return NextResponse.json({
      performers,
      calculation: {
        period: `${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`,
        scoringMethod: 'Manually Set by Admin',
        teams: 'All Teams',
        topCount: 3,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top performers' },
      { status: 500 }
    );
  }
}

// POST: Admin sets top performers
export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth || auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { rank, userId } = await request.json();

    if (!rank || !userId || ![1, 2, 3].includes(rank)) {
      return NextResponse.json(
        { error: 'Invalid rank or userId. Rank must be 1, 2, or 3' },
        { status: 400 }
      );
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get user to verify exists and get a team
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMembers: {
          select: { teamId: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get first team or use a default
    const userTeamId = user.teamMembers[0]?.teamId || '';
    
    if (!userTeamId) {
      return NextResponse.json(
        { error: 'User must be a member of at least one team' },
        { status: 400 }
      );
    }

    // Remove existing top performer at this rank for this month
    await prisma.topPerformer.deleteMany({
      where: {
        rank,
        month: currentMonth,
        year: currentYear,
      },
    });

    // Create new top performer record
    const topPerformer = await prisma.topPerformer.create({
      data: {
        userId,
        rank,
        month: currentMonth,
        year: currentYear,
        teamId: userTeamId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      topPerformer: {
        id: topPerformer.id,
        rank: topPerformer.rank,
        user: topPerformer.user,
      },
    });
  } catch (error) {
    console.error('Error setting top performer:', error);
    return NextResponse.json(
      { error: 'Failed to set top performer' },
      { status: 500 }
    );
  }
}
