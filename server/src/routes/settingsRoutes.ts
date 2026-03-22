import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticateToken, async (_req: Request, res: Response) => {
    try {
        let settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
        if (!settings) {
            settings = await prisma.appSettings.create({ data: { id: 'singleton' } });
        }
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/', authenticateToken, async (req: any, res: Response) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    try {
        const { useOpenRouter, openrouterApiKey, openrouterModel, openrouterBaseUrl } = req.body;
        const settings = await prisma.appSettings.upsert({
            where: { id: 'singleton' },
            update: { useOpenRouter, openrouterApiKey, openrouterModel, openrouterBaseUrl },
            create: { id: 'singleton', useOpenRouter, openrouterApiKey, openrouterModel, openrouterBaseUrl },
        });
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
