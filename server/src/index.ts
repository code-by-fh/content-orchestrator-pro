import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/authRoutes';
import contentRoutes from './routes/contentRoutes';
import distributionRoutes from './routes/distributionRoutes';
import { generalLimiter } from './middleware/rateLimit';
import { initScheduler } from './services/scheduler';

dotenv.config();

// Initialize Scheduler
initScheduler();

const app = express();
// Enable trust proxy so rate limit works correctly behind proxies (e.g. Docker/Nginx/CapRover)
app.set('trust proxy', 1);
const port = process.env.PORT || 3003;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Apply general rate limiter
app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api', distributionRoutes);

const uploadsPath = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
import fs from 'fs';
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/uploads', express.static(uploadsPath));

// Handle all other routing
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
