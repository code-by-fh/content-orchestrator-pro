import { Router } from 'express';
import { createContent, getArticles, getArticle, deleteArticle, updateArticle, publishToPlatform, unpublishFromPlatform, unpublishAllPlatforms } from '../controllers/contentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, createContent);
router.get('/', authenticateToken, getArticles);
router.get('/:id', authenticateToken, getArticle);
router.put('/:id', authenticateToken, updateArticle);
router.delete('/:id', authenticateToken, deleteArticle);
router.post('/:id/publish', authenticateToken, publishToPlatform);
router.post('/:id/unpublish', authenticateToken, unpublishFromPlatform);
router.post('/:id/unpublish-all', authenticateToken, unpublishAllPlatforms);



export default router;

