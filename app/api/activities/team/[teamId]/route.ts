import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
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
    const memberId = searchParams.get('memberId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10);

    // Validate page and limit
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const skip = (validPage - 1) * validLimit;

    // Check if the user is a team member (lead or admin)
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: auth.userId,
          teamId: params.teamId,
        },
      },
    });

    // Allow if user is team lead, team admin, or admin role
    if (!teamMember && auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'You do not have permission to view team activities' }, { status: 403 });
    }

    // Only team leads and team admins (or system admins) can view team activities
    if (teamMember && !teamMember.isLead && teamMember.role !== 'team_admin' && auth.userRole !== 'admin') {
      return NextResponse.json({ error: 'You do not have permission to view team activities' }, { status: 403 });
    }

    // Get all team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: params.teamId },
      include: { user: { select: { id: true, username: true, email: true, role: true } } },
    });

    // Filter out admin users
    const nonAdminMembers = teamMembers.filter((m: typeof teamMembers[0]) => m.user.role !== 'admin');
    let memberIds = nonAdminMembers.map((m: typeof nonAdminMembers[0]) => m.user.id);

    // Server-side member filtering
    if (memberId) {
      // Verify that the requested memberId is a valid team member
      const isValidMember = nonAdminMembers.some((m: typeof nonAdminMembers[0]) => m.user.id === memberId);
      if (!isValidMember) {
        return NextResponse.json({ error: 'Invalid member ID for this team' }, { status: 400 });
      }
      // Filter to only the requested member
      memberIds = [memberId];
    }

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

    // Get total count
    const total = await prisma.activity.count({
      where: whereClause,
    });

    // Get activities of all team members with pagination
    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: validLimit,
    });

    const totalPages = Math.ceil(total / validLimit);

    return NextResponse.json({
      team: {
        id: params.teamId,
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
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching team activities:', error);
    return NextResponse.json({ error: 'Failed to fetch team activities' }, { status: 500 });
  }
}
