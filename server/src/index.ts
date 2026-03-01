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
import logger from './utils/logger';

dotenv.config();

// Initialize Scheduler and Worker
initScheduler();
import './worker';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (required for Caprover/Nginx)
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

// Handle uploads
const uploadsPath = path.join(__dirname, '../uploads');
import fs from 'fs';
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

app.listen(port, () => {
  logger.info(`Server is running at http://localhost:${port}`);
});
