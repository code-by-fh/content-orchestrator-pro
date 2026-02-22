import { Router } from 'express';
import { login, getMe, checkInitialSetup, registerInitialAdmin, createUser, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/setup-status', checkInitialSetup);
router.post('/register-admin', registerInitialAdmin);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/create-user', authenticateToken, createUser);
router.post('/change-password', authenticateToken, changePassword);

export default router;
