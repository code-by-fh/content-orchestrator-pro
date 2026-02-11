import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
});

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            // For demo purposes, create user if not exists (or return 401)
            // The requirement didn't specify registration, so I'll assume pre-seeded or auto-create for simplicity in dev
            // Let's implement auto-registration for dev convenience if user count is 0?
            // Or just fail.
            // Requirement: "User: id, username, passwordHash".
            // I'll return 401 for safety.
            // Wait, how does the user get created? I should probably add a register implementation or seed script.
            // But for now, let's just stick to 401.
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
        res.json({ token });
    } catch (error) {
        res.status(400).json({ message: 'Invalid request' });
    }
};

export const getMe = async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.sendStatus(404);
        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.sendStatus(500);
    }
};
