import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const sessions = await prisma.pokerSession.findMany({
      where: teamId ? { teamId } : undefined,
      include: {
        team: {
          select: { id: true, name: true },
        },
        votes: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get poker sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, creatorName, teamId, storyName, description } = body;

    // Get or create a team for the user
    let team;
    if (teamId) {
      // Use the provided teamId
      team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
    } else {
      // Find user's first team or create a default one
      const userTeam = await prisma.teamMember.findFirst({
        where: { userId: auth.userId },
        include: { team: true },
      });

      if (userTeam) {
        team = userTeam.team;
      } else {
        // Create a default team if user doesn't have one
        team = await prisma.team.create({
          data: {
            name: `${auth.redmineUsername || 'User'}'s Team`,
            description: 'Default team',
            wfhLimitPerMonth: 3,
          },
        });

        // Add user to the team
        await prisma.teamMember.create({
          data: {
            userId: auth.userId,
            teamId: team.id,
            role: 'member',
            isLead: false,
          },
        });
      }
    }

    // Create the poker session
    const session = await prisma.pokerSession.create({
      data: {
        teamId: team.id,
        storyName: storyName || creatorName || `Poker Session by ${creatorName}`,
        description: description || '',
      },
    });

    return NextResponse.json({ session, sessionId: session.id }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create poker session:', error);
    return NextResponse.json({ error: 'Failed to create poker session', details: error.message }, { status: 500 });
  }
}
