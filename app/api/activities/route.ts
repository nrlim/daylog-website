import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';
import { config } from '@/lib/backend/config';
import { RequestValidator, ValidationError } from '@/lib/backend/validation';
import { handleError, ConflictError } from '@/lib/backend/errors';

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, role: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ activities });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get activities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate request body
    const validationErrors = RequestValidator.validateActivityCreate(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const { date, time, subject, description, status, isWfh, teamId, project } = body;

    // Check WFH limit if activity is marked as WFH
    if (isWfh && teamId) {
      const activityDate = new Date(date);
      const month = activityDate.getMonth() + 1;
      const year = activityDate.getFullYear();

      // Check if WFH record already exists for this date
      const existingWfhRecord = await prisma.wFHRecord.findUnique({
        where: {
          userId_teamId_date: {
            userId: auth.userId,
            teamId,
            date: activityDate,
          },
        },
      });

      // Only create WFH record if it doesn't exist
      if (!existingWfhRecord) {
        // Count current WFH records for this month
        const wfhCount = await prisma.wFHRecord.count({
          where: {
            userId: auth.userId,
            teamId,
            month,
            year,
          },
        });

        // Get team WFH limit
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { wfhLimitPerMonth: true },
        });

        const limit = team?.wfhLimitPerMonth ?? config.defaultWfhLimitPerMonth;

        // Check if adding this WFH day would exceed the limit
        if (wfhCount >= limit) {
          return NextResponse.json({
            error: `WFH limit exceeded. You have used ${wfhCount}/${limit} WFH days this month.`,
            wfhUsed: wfhCount,
            wfhLimit: limit,
          }, { status: 403 });
        }

        // Create WFH record
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

    // Create activity
    const activity = await prisma.activity.create({
      data: {
        userId: auth.userId,
        date: new Date(date),
        time: time || null,
        subject,
        description,
        status,
        isWfh: isWfh || false,
        project: project || null,
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
