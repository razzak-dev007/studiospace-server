import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUsersCollection } from '../db.js';
import { verifyAuth, AuthRequest } from '../middleware/auth.js';
import { User } from '../types.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'studiospace_jwt_secret_key_2026_super_secure';

// Helper to set HTTPOnly cookie
function setAuthCookie(res: Response, token: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('studiospace_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// Password Validator helper
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }
  return { valid: true };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, photoURL, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    const emailNorm = email.trim().toLowerCase();
    const passValidation = validatePassword(password);
    if (!passValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passValidation.message,
      });
    }

    const usersCol = getUsersCollection();
    const existing = await usersCol.findOne({ email: emailNorm });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser: User = {
      name: name.trim(),
      email: emailNorm,
      password: hashedPassword,
      photoURL: photoURL?.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
      role: 'creator',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCol.insertOne(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in with your credentials.',
      userId: result.insertedId,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const emailNorm = email.trim().toLowerCase();
    const usersCol = getUsersCollection();
    const user = await usersCol.findOne({ email: emailNorm });

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password. Please verify your credentials.',
      });
    }

    const tokenPayload = {
      userId: user._id?.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    // Set Challenge 1 HTTPOnly cookie
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
    });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { name, email, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google authentication.',
      });
    }

    const emailNorm = email.trim().toLowerCase();
    const usersCol = getUsersCollection();
    let user = await usersCol.findOne({ email: emailNorm });

    if (!user) {
      // Create new user from Google profile
      const newUser: User = {
        name: name?.trim() || 'Google Creator',
        email: emailNorm,
        photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emailNorm)}`,
        role: 'creator',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await usersCol.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else if (photoURL && !user.photoURL) {
      // update photo if missing
      await usersCol.updateOne({ _id: user._id }, { $set: { photoURL, updatedAt: new Date() } });
      user.photoURL = photoURL;
    }

    const tokenPayload = {
      userId: user._id?.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: `Successfully authenticated with Google as ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during Google authentication.',
    });
  }
});

// GET /api/auth/me
router.get('/me', verifyAuth, async (req: AuthRequest, res) => {
  try {
    const usersCol = getUsersCollection();
    const user = await usersCol.findOne({ email: req.user?.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching user session.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('studiospace_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

export default router;
