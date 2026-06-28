import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import UserModel from '../models/User';
import { AppError, logger } from '@remote-support/shared-utils';

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access_secret_key_123456';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key_123456';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

const generateAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ sub: userId, role }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

const generateRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ sub: userId, role }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      throw new AppError('Please provide email, name, and password', 400);
    }

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      throw new AppError('User already exists with this email', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await UserModel.create({
      email,
      name,
      role: role || 'support_engineer',
      passwordHash,
      verifyToken,
      verifyTokenExpires,
    });

    logger.info(`User registered: ${user.email} with role: ${user.role}`);

    // Normally we would send email verification here. We will print the link for local testing.
    logger.info(`Email Verification Token for ${email}: ${verifyToken}`);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Please verify your email.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email address before logging in.', 403);
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cookieToken = req.cookies?.refreshToken;
    const bodyToken = req.body?.refreshToken;
    const token = cookieToken || bodyToken;

    if (!token) {
      throw new AppError('Refresh token is required', 400);
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await UserModel.findById(decoded.sub);
    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid refresh token session', 401);
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id, user.role);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    const user = await UserModel.findOne({
      verifyToken: token,
      verifyTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    user.isEmailVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Please provide an email address', 400);
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      // Return 200 even if user not found for security reasons
      res.status(200).json({
        status: 'success',
        message: 'If a user with that email exists, a password reset link has been sent.',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    logger.info(`Password Reset Token for ${email}: ${resetToken}`);

    res.status(200).json({
      status: 'success',
      message: 'If a user with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError('Please provide token and new password', 400);
    }

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = undefined; // Invalidate current sessions
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (token) {
      const user = await UserModel.findOne({ refreshToken: token });
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
    }

    res.clearCookie('refreshToken');
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Google Login Integration Ready
export const googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { googleToken, email, name, googleId } = req.body;

    if (!email || !name || !googleId) {
      throw new AppError('Incomplete Google authentication payload', 400);
    }

    // In a real application, you would verify the Google OAuth token using Google Auth Library
    // const ticket = await googleClient.verifyIdToken({ idToken: googleToken, audience: CLIENT_ID });
    // const payload = ticket.getPayload();

    let user = await UserModel.findOne({ email });

    if (!user) {
      user = await UserModel.create({
        email,
        name,
        googleId,
        isEmailVerified: true, // Google accounts are pre-verified
        role: 'support_engineer',
      });
    } else if (!user.googleId) {
      // Link Google Account if logging in with matching email
      user.googleId = googleId;
      user.isEmailVerified = true;
      await user.save();
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
