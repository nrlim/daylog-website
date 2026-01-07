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

    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ activity });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get activity' }, { status: 500 });
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

    const body = await request.json();
    const { subject, description, status, blockedReason, isWfh, teamId } = body;

    // Get current activity to check if WFH flag is being added
    const currentActivity = await prisma.activity.findUnique({
      where: { id: params.id },
    });

    if (!currentActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // If changing to WFH and wasn't WFH before, check limit
    if (isWfh && !currentActivity.isWfh && teamId) {
      const activityDate = currentActivity.date;
      const month = activityDate.getMonth() + 1;
      const year = activityDate.getFullYear();

      const existingWfhRecord = await prisma.wFHRecord.findUnique({
        where: {
          userId_teamId_date: {
            userId: auth.userId,
            teamId,
            date: activityDate,
          },
        },
      });

      if (!existingWfhRecord) {
        const wfhCount = await prisma.wFHRecord.count({
          where: {
            userId: auth.userId,
            teamId,
            month,
            year,
          },
        });

        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { wfhLimitPerMonth: true },
        });

        const limit = team?.wfhLimitPerMonth || 3;

        if (wfhCount >= limit) {
          return NextResponse.json({
            error: `WFH limit exceeded. You have used ${wfhCount}/${limit} WFH days this month.`,
            wfhUsed: wfhCount,
            wfhLimit: limit,
          }, { status: 403 });
        }

        await prisma.wFHRecord.create({
          data: {
            userId: auth.userId,
            teamId,
            date: activityDate,
            month,
            year,
          },
        });
      }
    }

    // If removing WFH flag, delete WFH record
    if (!isWfh && currentActivity.isWfh && teamId) {
      const activityDate = currentActivity.date;
      await prisma.wFHRecord.deleteMany({
        where: {
          userId: auth.userId,
          teamId,
          date: activityDate,
        },
      });
    }

    const updateData: any = {};
    if (subject !== undefined) {
      updateData.subject = subject;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (blockedReason !== undefined) {
      updateData.blockedReason = blockedReason;
    }
    if (isWfh !== undefined) {
      updateData.isWfh = isWfh;
    }

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ activity });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
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

    await prisma.activity.delete({ where: { id: params.id } });

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}
