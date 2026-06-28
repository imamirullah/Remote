import { Request, Response, NextFunction } from 'express';
import TeamModel from '../models/Team';
import { AppError } from '@remote-support/shared-utils';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const createTeam = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    const ownerId = req.user?.id;

    if (!name || !ownerId) {
      throw new AppError('Team name is required', 400);
    }

    const team = await TeamModel.create({
      name,
      ownerId,
      members: [{ userId: ownerId, role: 'manager' }],
    });

    res.status(201).json({
      status: 'success',
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};

export const getTeams = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    // Find teams where user is owner or member
    const teams = await TeamModel.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    });

    res.status(200).json({
      status: 'success',
      results: teams.length,
      data: { teams },
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, role } = req.body;
    const team = await TeamModel.findById(req.params.teamId);

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Verify requesting user is owner or manager
    const reqMember = team.members.find((m: any) => m.userId === req.user?.id);
    const isOwner = team.ownerId === req.user?.id;
    const isManager = reqMember?.role === 'manager';

    if (!isOwner && !isManager) {
      throw new AppError('Not authorized to add members to this team', 403);
    }

    // Check if user is already a member
    if (team.members.some((m: any) => m.userId === userId)) {
      throw new AppError('User is already a member of this team', 400);
    }

    team.members.push({ userId, role: role || 'member' });
    await team.save();

    res.status(200).json({
      status: 'success',
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.body;
    const team = await TeamModel.findById(req.params.teamId);

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Verify request permission
    const isOwner = team.ownerId === req.user?.id;
    const reqMember = team.members.find((m: any) => m.userId === req.user?.id);
    const isManager = reqMember?.role === 'manager';

    if (!isOwner && !isManager && req.user?.id !== userId) {
      throw new AppError('Not authorized to remove members from this team', 403);
    }

    if (userId === team.ownerId) {
      throw new AppError('Cannot remove team owner', 400);
    }

    team.members = team.members.filter((m: any) => m.userId !== userId) as any;
    await team.save();

    res.status(200).json({
      status: 'success',
      data: { team },
    });
  } catch (error) {
    next(error);
  }
};
