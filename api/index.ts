// This file is the Vercel serverless entry point for the Express app.
// Vercel looks for files in the /api folder and wraps them as serverless functions.

import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectToDatabase } from '../src/db.js';
import { seedDatabase } from '../src/seed.js';

import authRoutes from '../src/routes/auth.js';
import studioRoutes from '../src/routes/studios.js';
import bookingRoutes from '../src/routes/bookings.js';
import wishlistRoutes from '../src/routes/wishlist.js';

dotenv.config();

const app = express();

// Allow requests from anywhere (Vercel serverless — CORS handled per-request)
app.use(
  cors({
    origin: true, // reflects the request origin — safe for credential-based auth
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Root health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'StudioSpace Backend API',
    version: '1.0.0',
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
  });
});

// Mount all routes
app.use('/api/auth', authRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wishlist', wishlistRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'The requested API endpoint was not found.',
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.',
  });
});

// Connect to DB once (Vercel keeps functions warm between requests)
let isDbConnected = false;
const handler = async (req: any, res: any) => {
  if (!isDbConnected) {
    await connectToDatabase();
    await seedDatabase();
    isDbConnected = true;
  }
  return app(req, res);
};

export default handler;
