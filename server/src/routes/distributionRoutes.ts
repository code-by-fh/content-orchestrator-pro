import { Router } from 'express';
import { getRssFeed } from '../controllers/rssController';
import { rssLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/rss', rssLimiter, getRssFeed);

export default router;
