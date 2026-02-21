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
const port = process.env.PORT || 3003;

app.use(helmet());
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

// Serve static files from client/dist
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Handle SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
