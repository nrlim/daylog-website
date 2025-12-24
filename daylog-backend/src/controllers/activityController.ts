import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { date, description, status } = req.body;
    
    const activity = await prisma.activity.create({
      data: {
        userId: req.userId!,
        date: new Date(date),
        description,
        status,
      },
    });
    
    res.status(201).json({ activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    const where: any = {};
    
    if (userId) {
      where.userId = userId as string;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
    
    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
      orderBy: { date: 'desc' },
    });
    
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activities' });
  }
};

export const getActivityById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
};

export const updateActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description, status } = req.body;
    
    const activity = await prisma.activity.update({
      where: { id },
      data: { description, status },
    });
    
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
};

export const deleteActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.activity.delete({ where: { id } });
    
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};
