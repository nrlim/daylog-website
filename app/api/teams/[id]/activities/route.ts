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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Check if the user is a team lead
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: auth.userId,
          teamId: params.id,
        },
      },
    });

    if (!teamMember || (!teamMember.isLead && teamMember.role !== 'team_admin')) {
      return NextResponse.json({ error: 'You do not have permission to view team activities' }, { status: 403 });
    }

    // Get all team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: params.id },
      include: { user: { select: { id: true, username: true, email: true, role: true } } },
    });

    // Filter out admin users
    const nonAdminMembers = teamMembers.filter((m: typeof teamMembers[0]) => m.user.role !== 'admin');
    const memberIds = nonAdminMembers.map((m: typeof nonAdminMembers[0]) => m.user.id);

    // Build query for activities
    const whereClause: any = {
      userId: { in: memberIds },
    };

    if (date) {
      const startDateObj = new Date(date);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + 1);
      whereClause.date = {
        gte: startDateObj,
        lt: endDateObj,
      };
    } else if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      team: {
        id: params.id,
        memberCount: nonAdminMembers.length,
      },
      members: nonAdminMembers.map((m: typeof nonAdminMembers[0]) => ({
        id: m.user.id,
        username: m.user.username,
        email: m.user.email,
        role: m.role,
        isLead: m.isLead,
      })),
      activities,
    });
  } catch (error: any) {
    console.error('Error fetching team activities:', error);
    return NextResponse.json({ error: 'Failed to fetch team activities' }, { status: 500 });
  }
}
