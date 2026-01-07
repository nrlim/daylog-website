import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get all teams
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        wfhLimitPerMonth: true,
        members: {
          select: {
            id: true,
            userId: true,
            isLead: true,
            user: {
              select: { id: true, username: true, email: true, role: true },
            },
          },
        },
      },
    });

    // Build date filter
    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Get all activities
    const activities = await prisma.activity.findMany({
      where: whereClause,
      select: { userId: true, status: true },
    });

    // Get all WFH records
    const wfhRecords = await prisma.wFHRecord.findMany({
      select: { userId: true },
    });

    // Get all poker sessions
    const pokerSessions = await prisma.pokerSession.findMany({
      select: { teamId: true, status: true },
    });

    // Calculate system metrics
    const totalActivities = activities.length;
    const completedActivities = activities.filter((a: any) => a.status === 'Done').length;
    const totalMembers = teams.reduce((sum: number, t: any) => sum + t.members.length, 0);

    // Calculate per-team stats
    const teamStats = teams.map((team: any) => {
      const teamMemberIds = team.members.map((m: any) => m.userId);
      const teamActivities = activities.filter((a: any) => teamMemberIds.includes(a.userId));
      const teamMembers = team.members.filter((m: any) => m.user.role !== 'admin');
      const teamWfh = wfhRecords.filter((w: any) =>
        teamMemberIds.includes(w.userId)
      );
      const teamPokerSessions = pokerSessions.filter((p: any) => p.teamId === team.id);

      return {
        teamId: team.id,
        teamName: team.name,
        memberCount: teamMembers.length,
        stats: {
          totalActivities: teamActivities.length,
          completedActivities: teamActivities.filter((a: any) => a.status === 'Done').length,
          completionRate:
            teamActivities.length > 0
              ? ((teamActivities.filter((a: any) => a.status === 'Done').length / teamActivities.length) * 100).toFixed(1)
              : '0',
          blockedTasks: teamActivities.filter((a: any) => a.status === 'blocked').length,
          wfhDays: teamWfh.length,
          pokerSessions: teamPokerSessions.length,
          completedPokerSessions: teamPokerSessions.filter((p: any) => p.status === 'completed').length,
        },
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      systemStats: {
        totalTeams: teams.length,
        totalMembers,
        totalActivities,
        completedActivities,
        completionRate:
          totalActivities > 0
            ? ((completedActivities / totalActivities) * 100).toFixed(1)
            : '0',
        totalWfhDays: wfhRecords.length,
        totalPokerSessions: pokerSessions.length,
      },
      teams: teamStats.sort((a: any, b: any) =>
        b.stats.totalActivities - a.stats.totalActivities
      ),
    });
  } catch (error: any) {
    console.error('Error generating system report:', error);
    return NextResponse.json(
      { error: 'Failed to generate system report' },
      { status: 500 }
    );
  }
}
