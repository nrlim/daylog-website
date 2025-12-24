import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    
    const team = await prisma.team.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: req.userId!,
            role: 'team_admin',
          },
        },
      },
    });
    
    res.status(201).json({ team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
};

export const getTeams = async (req: AuthRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: req.userId,
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
    
    res.json({ teams });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get teams' });
  }
};

export const getTeamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
      },
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get team' });
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const team = await prisma.team.update({
      where: { id },
      data: { name, description },
    });
    
    res.json({ team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' });
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.team.delete({ where: { id } });
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId,
      },
    });
    
    res.status(201).json({ member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;
    
    await prisma.teamMember.delete({
      where: { id: memberId },
    });
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};
