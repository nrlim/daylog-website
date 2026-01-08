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

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get team WFH records
    const wfhRecords = await prisma.wFHRecord.findMany({
      where: {
        teamId: params.id,
        userId: auth.userId,
        month: currentMonth,
        year: currentYear,
      },
    });

    // Get team limit
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: { wfhLimitPerMonth: true },
    });

    // Get personal WFH quota for this month
    const personalQuota = await prisma.userWFHQuota.findUnique({
      where: {
        userId_month_year: {
          userId: auth.userId,
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    const teamLimit = team?.wfhLimitPerMonth || 3;
    const teamUsed = wfhRecords.length;
    const personalTotal = personalQuota?.totalQuota ?? 0;
    const personalUsed = personalQuota?.usedDays ?? 0;

    return NextResponse.json({
      team: {
        used: teamUsed,
        limit: teamLimit,
        remaining: Math.max(0, teamLimit - teamUsed),
      },
      personal: {
        total: personalTotal,
        used: personalUsed,
        remaining: Math.max(0, personalTotal - personalUsed),
      },
      summary: {
        totalUsed: teamUsed + personalUsed,
        totalAvailable: teamLimit + personalTotal,
      },
    });
  } catch (error: any) {
    console.error('Failed to get WFH usage:', error);
    return NextResponse.json({ error: 'Failed to get WFH usage' }, { status: 500 });
  }
}
