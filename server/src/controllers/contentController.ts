import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { addContentJob } from '../queue/producer';
import { extractVideoId } from '../services/youtube';

const prisma = new PrismaClient();

const createContentSchema = z.object({
    url: z.string().url(),
    type: z.enum(['YOUTUBE', 'MEDIUM']),
    title: z.string().optional(), // Optional initial title
});

export const createContent = async (req: Request, res: Response) => {
    try {
        const { url, type, title } = createContentSchema.parse(req.body);

        let slug = title ? title.toLowerCase().replace(/ /g, '-') : `draft-${Date.now()}`;

        // Simple unique check logic or rely on catch
        // Better to generate unique slug

        const article = await prisma.article.create({
            data: {
                title: title || 'New Draft',
                slug: slug,
                sourceUrl: url,
                rawTranscript: '',
                status: 'QUEUED',
            },
        });

        await addContentJob(article.id, type, url);

        res.json(article);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid request or failed to create article' });
    }
};

export const getArticles = async (req: Request, res: Response) => {
    const articles = await prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
    });
    res.json(articles);
};

export const getArticle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const article = await prisma.article.findUnique({ where: { id: id as string } });
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(article);
};

export const deleteArticle = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.article.delete({ where: { id: id as string } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete article' });
    }
};

export const updateArticle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, markdownContent, status, scheduledAt } = req.body;

    try {
        const updateData: any = {};

        if (title !== undefined) updateData.title = title;
        if (markdownContent !== undefined) updateData.markdownContent = markdownContent;
        if (status !== undefined) updateData.status = status;
        if (req.body.seoTitle !== undefined) updateData.seoTitle = req.body.seoTitle;
        if (req.body.seoDescription !== undefined) updateData.seoDescription = req.body.seoDescription;
        if (req.body.linkedinTeaser !== undefined) updateData.linkedinTeaser = req.body.linkedinTeaser;
        if (req.body.xingSummary !== undefined) updateData.xingSummary = req.body.xingSummary;

        // Handle scheduled publishing
        if (status === 'SCHEDULED' && scheduledAt) {
            updateData.scheduledAt = new Date(scheduledAt);
        }

        // Handle immediate publishing
        if (status === 'PUBLISHED') {
            updateData.publishedAt = new Date();
            updateData.scheduledAt = null; // Clear scheduled time if publishing now
        }

        // Handle unpublish/cancel: clear both dates when reverting to DRAFT
        if (status === 'DRAFT') {
            updateData.scheduledAt = null;
            updateData.publishedAt = null;
        }

        // Handle explicit scheduledAt clearing (empty string from frontend)
        if (scheduledAt === '') {
            updateData.scheduledAt = null;
        }

        const article = await prisma.article.update({
            where: { id: id as string },
            data: updateData,
        });
        res.json(article);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update article' });
    }
};
