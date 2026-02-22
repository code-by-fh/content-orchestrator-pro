import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const prisma = new PrismaClient();

const loginSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(6),
});

export const checkInitialSetup = async (req: Request, res: Response) => {
    try {
        const userCount = await prisma.user.count();
        res.json({ needsSetup: userCount === 0 });
    } catch (error: any) {
        res.status(500).json({ message: 'Error checking setup', error: error.message });
    }
};

export const registerInitialAdmin = async (req: Request, res: Response) => {
    try {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return res.status(400).json({ message: 'Initial setup already completed' });
        }

        const { username, password } = loginSchema.parse(req.body);
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                role: Role.ADMIN,
            },
        });

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors.map(e => ({ path: e.path, message: e.message }))
            });
        }
        res.status(400).json({ message: 'Invalid request' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors.map(e => ({ path: e.path, message: e.message }))
            });
        }
        res.status(400).json({ message: 'Invalid request' });
    }
};

export const getMe = async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.sendStatus(404);
        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (error: any) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

export const createUser = async (req: any, res: Response) => {
    if (req.user.role !== Role.ADMIN) {
        return res.status(403).json({ message: 'Only admins can create users' });
    }

    try {
        const { username, password, role } = z.object({
            username: z.string().min(3),
            password: z.string().min(6),
            role: z.nativeEnum(Role).optional(),
        }).parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                role: role || Role.USER,
            },
        });

        res.json({
            message: 'User created successfully',
            user: { id: user.id, username: user.username, role: user.role }
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors.map(e => ({ path: e.path, message: e.message }))
            });
        }
        res.status(400).json({ message: 'Invalid request' });
    }
};

export const changePassword = async (req: any, res: Response) => {
    try {
        const { oldPassword, newPassword } = z.object({
            oldPassword: z.string(),
            newPassword: z.string().min(6),
        }).parse(req.body);

        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: 'Unauthorized: No user info in token' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const validPassword = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid current password' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
        console.error('Password change error:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: error.errors.map(e => ({ path: e.path, message: e.message }))
            });
        }
        res.status(400).json({ message: error.message || 'Invalid request' });
    }
};
