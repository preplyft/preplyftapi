import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import ServerlessHttp from 'serverless-http';

import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import routes from './routes/route';
import { notFound, errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & utility middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Global rate limiter ─────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
  })
);

// Stricter rate limit on auth endpoints
app.use(
  '/api/v1/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many auth attempts, please try again later.' },
  })
);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.get("/", (req, res) => {
  res.json({ message: "Hello from Vercel 🚀" });
});

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/api/v1', routes);



// ── Error handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ───────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  await connectRedis();
  app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/api/v1`);
});
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default ServerlessHttp(app);
