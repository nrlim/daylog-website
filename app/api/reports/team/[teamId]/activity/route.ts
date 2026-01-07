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

    const teamId = params.teamId;
    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');
    const memberId = request.nextUrl.searchParams.get('memberId');

    // Verify user is admin or team lead (but not team_admin)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        teamMembers: {
          where: { teamId },
          include: { team: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Global admin can access
    if (user.role !== 'admin') {
      // Non-admin must be team lead (not team_admin, not regular member)
      if (
        user.teamMembers.length === 0 ||
        !user.teamMembers[0].isLead ||
        user.teamMembers[0].role === 'team_admin'
      ) {
        return NextResponse.json({ error: 'Only team leads and admins can view activity reports' }, { status: 403 });
      }
    }

    // Get team details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, wfhLimitPerMonth: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Build query filters
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.date = { gte: new Date(startDate) };
    }
    if (endDate) {
      if (dateFilter.date) {
        dateFilter.date.lte = new Date(endDate);
      } else {
        dateFilter.date = { lte: new Date(endDate) };
      }
    }

    // Get team members
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        teamId,
      },
      include: {
        user: true,
      },
    });

    // Filter out admin users from the report
    const filteredTeamMembers = teamMembers.filter((m: any) => m.user.role !== 'admin');
    const memberIds = filteredTeamMembers.map((m: any) => m.userId);

    // Get activities for the team
    let activitiesQuery: any = {
      where: {
        userId: {
          in: memberIds,
        },
        ...dateFilter,
      },
      include: {
        user: true,
      },
    };

    if (memberId) {
      activitiesQuery.where.userId = memberId;
    }

    const activities = await prisma.activity.findMany(activitiesQuery);

    // Get WFH records for the team
    let wfhQuery: any = {
      where: {
        teamId,
        userId: {
          in: memberIds,
        },
      },
    };

    if (startDate && endDate) {
      wfhQuery.where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const wfhRecords = await prisma.wFHRecord.findMany(wfhQuery);

    // Calculate statistics per member
    const memberStats = filteredTeamMembers.map((member: any) => {
      const memberActivities = activities.filter(
        (a: any) => a.userId === member.userId
      );
      const completedActivities = memberActivities.filter(
        (a: any) => a.status === 'Done'
      );
      
      // Count WFH days, excluding duplicates on the same date
      const memberWfhRecords = wfhRecords.filter(
        (w: any) => w.userId === member.userId
      );
      
      // Get unique WFH dates per member (count each day only once)
      const uniqueWfhDates = new Set(
        memberWfhRecords.map((w: any) => w.date.toISOString().split('T')[0])
      );
      const memberWfhDays = uniqueWfhDates.size;
      
      const completionRate =
        memberActivities.length > 0
          ? (completedActivities.length / memberActivities.length) * 100
          : 0;

      return {
        userId: member.userId,
        name: member.user.username || '',
        email: member.user.email || '',
        role: member.role || 'member',
        totalActivities: memberActivities.length,
        completedActivities: completedActivities.length,
        wfhDays: memberWfhDays,
        completionRate: completionRate,
        lastActivityDate: memberActivities.length > 0
          ? memberActivities[memberActivities.length - 1].date
          : null,
      };
    });

    // Calculate team summary - use unique WFH dates
    const totalActivities = activities.length;
    const completedActivities = activities.filter(
      (a: any) => a.status === 'Done'
    ).length;
    
    // Count unique WFH days across all team members
    const uniqueWfhDatesSet = new Set(
      wfhRecords.map((w: any) => `${w.userId}-${w.date.toISOString().split('T')[0]}`)
    );
    const totalWfhDays = uniqueWfhDatesSet.size;

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        wfhLimitPerMonth: team.wfhLimitPerMonth,
      },
      members: memberStats.map((m: any) => {
        // Get member's activities sorted by date (most recent first)
        const memberActivities = activities
          .filter((a: any) => a.userId === m.userId)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return {
          memberId: m.userId,
          username: m.name || 'Unknown User',
          email: m.email || '',
          role: m.role,
          isLead: false,
          stats: {
            totalActivities: m.totalActivities,
            wfhDays: m.wfhDays,
            completedTasks: m.completedActivities,
            inProgressTasks: memberActivities.filter((a: any) => a.status === 'InProgress').length,
            blockedTasks: memberActivities.filter((a: any) => a.status === 'Blocked').length,
            completionRate: String(m.completionRate.toFixed(1)),
          },
          activities: memberActivities.map((a: any) => ({
            id: a.id,
            subject: a.subject,
            description: a.description,
            status: a.status,
            date: a.date,
            isWfh: a.isWfh || false,
            time: a.time,
            blockedReason: a.blockedReason,
            project: a.project || null,
          })),
        };
      }),
      summary: {
        totalMembers: filteredTeamMembers.length,
        totalActivities,
        totalWfhDays,
        averageCompletionRate: String(
          totalActivities > 0
            ? ((completedActivities / totalActivities) * 100).toFixed(1)
            : '0.0'
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching activity report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
