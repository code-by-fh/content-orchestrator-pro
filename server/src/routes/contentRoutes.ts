import { Router } from 'express';
import { createContent, getArticles, getArticle, deleteArticle, updateArticle } from '../controllers/contentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, createContent);
router.get('/', authenticateToken, getArticles);
router.get('/:id', authenticateToken, getArticle);
router.put('/:id', authenticateToken, updateArticle);
router.delete('/:id', authenticateToken, deleteArticle);

export default router;
