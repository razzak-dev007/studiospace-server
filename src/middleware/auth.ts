import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'studiospace_jwt_secret_key_2026_super_secure';

export function verifyAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Challenge 1: Check HTTPOnly cookie first, then fallback to Authorization header
    let token = req.cookies?.studiospace_token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided. Please log in.',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      name: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.',
    });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.studiospace_token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        name: string;
        role: string;
      };
      req.user = decoded;
    }
  } catch {
    // ignore token error for optional auth
  }
  next();
}
