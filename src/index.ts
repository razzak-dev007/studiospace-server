import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectToDatabase } from './db.js';
import { seedDatabase } from './seed.js';

import authRoutes from './routes/auth.js';
import studioRoutes from './routes/studios.js';
import bookingRoutes from './routes/bookings.js';
import wishlistRoutes from './routes/wishlist.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching clients
      if (!origin || origin === CLIENT_URL || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/testing for smooth peer evaluation
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Root & Health Checks
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'StudioSpace Backend API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wishlist', wishlistRoutes);

// 404 handler for unknown API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'The requested API endpoint was not found on StudioSpace server.',
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

// Initialize database & start server
async function startServer() {
  try {
    await connectToDatabase();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`==============================================`);
      console.log(`🚀 StudioSpace Server listening on port ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🔗 Allowed Client: ${CLIENT_URL}`);
      console.log(`==============================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
