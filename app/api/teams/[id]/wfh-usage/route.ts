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

    const wfhRecords = await prisma.wFHRecord.findMany({
      where: {
        teamId: params.id,
        userId: auth.userId,
        month: currentMonth,
        year: currentYear,
      },
    });

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: { wfhLimitPerMonth: true },
    });

    return NextResponse.json({
      used: wfhRecords.length,
      limit: team?.wfhLimitPerMonth || 3,
      remaining: Math.max(0, (team?.wfhLimitPerMonth || 3) - wfhRecords.length),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get WFH usage' }, { status: 500 });
  }
}
