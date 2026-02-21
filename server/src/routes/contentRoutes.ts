import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { createContent, deleteArticle, getArticle, getArticles, getShareUrl, publishToPlatform, reprocessArticle, unpublishAllPlatforms, unpublishFromPlatform, updateArticle, uploadImage } from '../controllers/contentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

router.post('/', authenticateToken, createContent);
router.get('/', authenticateToken, getArticles);
router.get('/:id', authenticateToken, getArticle);
router.put('/:id', authenticateToken, updateArticle);
router.delete('/:id', authenticateToken, deleteArticle);
router.post('/:id/reprocess', authenticateToken, reprocessArticle);
router.post('/:id/publish', authenticateToken, publishToPlatform);
router.post('/:id/unpublish', authenticateToken, unpublishFromPlatform);
router.post('/:id/unpublish-all', authenticateToken, unpublishAllPlatforms);
router.get('/:id/share-url', authenticateToken, getShareUrl);
router.post('/upload-image', authenticateToken, upload.single('image'), uploadImage);

export default router;

