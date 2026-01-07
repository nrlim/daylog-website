import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/backend/middleware/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: auth.userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    const formattedTeams = teams.map((team: typeof teams[0]) => ({
      ...team,
      members: team.members.map((member: typeof team.members[0]) => ({
        userId: member.userId,
        role: member.role,
        isLead: member.isLead,
        user: member.user,
      })),
    }));

    return NextResponse.json({ teams: formattedTeams });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get teams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authMiddleware(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    const team = await prisma.team.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: auth.userId,
            role: 'team_admin',
          },
        },
      },
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
