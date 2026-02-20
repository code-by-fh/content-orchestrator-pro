import { Request, Response } from 'express';
import { PrismaClient, Platform, PublicationStatus } from '@prisma/client';
import { publishingService } from '../services/publishingService';

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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const search = req.query.search as string;
    const publishedOnly = req.query.publishedOnly === 'true';

    const where: any = {};
    if (search) {
        where.title = { contains: search };
    }
    if (publishedOnly) {
        where.publications = {
            some: { status: 'PUBLISHED' }
        };
    }

    const [articles, total] = await Promise.all([
        prisma.article.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { publications: true },
            skip: (page - 1) * limit,
            take: limit
        }),
        prisma.article.count({ where })
    ]);

    const hasNextPage = (page * limit) < total;

    // Artificial delay to make loading animations visible and prevent UI flickering
    await new Promise(resolve => setTimeout(resolve, 800));

    res.json({
        data: articles,
        meta: {
            total,
            page,
            limit,
            hasNextPage,
            nextPage: hasNextPage ? page + 1 : null
        }
    });
};

export const getArticle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const article = await prisma.article.findUnique({
        where: { id: id as string },
        include: { publications: true }
    });
    if (!article) return res.status(404).json({ message: 'Article not found' });

    // Add available platforms info
    const platforms = publishingService.getAdapters();

    res.json({ ...article, availablePlatforms: platforms });
};

export const publishToPlatform = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { platform, accessToken } = req.body;

    if (!platform || !Object.values(Platform).includes(platform)) {
        return res.status(400).json({ message: 'Invalid or missing platform' });
    }

    try {
        const result = await publishingService.publishToPlatform(id, platform as Platform, accessToken);
        if (result.success) {
            res.json({ message: `Successfully published to ${platform}`, platformId: result.platformId });
        } else {
            res.status(500).json({ message: `Failed to publish to ${platform}`, error: result.error });
        }
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

export const unpublishFromPlatform = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { platform } = req.body;

    if (!platform || !Object.values(Platform).includes(platform)) {
        return res.status(400).json({ message: 'Invalid or missing platform' });
    }

    try {
        await publishingService.unpublishFromPlatform(id, platform as Platform);
        res.json({ message: `Successfully unpublished from ${platform}` });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};


export const unpublishAllPlatforms = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const publications = await prisma.publication.findMany({
            where: { articleId: id }
        });

        for (const pub of publications) {
            await publishingService.unpublishFromPlatform(id, pub.platform);
        }

        res.json({ message: `Successfully unpublished from all platforms` });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};







export const deleteArticle = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const article = await prisma.article.findUnique({ where: { id: id as string } });

        if (article) {
            const publications = await prisma.publication.findMany({
                where: { articleId: id }
            });

            for (const pub of publications) {
                await publishingService.unpublishFromPlatform(id, pub.platform);
            }
        }

        await prisma.article.delete({ where: { id: id as string } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete article' });
    }
};


export const updateArticle = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, markdownContent, status: reqStatus, scheduledAt } = req.body;

    try {
        const updateData: any = {};

        if (title !== undefined) updateData.title = title;
        if (markdownContent !== undefined) updateData.markdownContent = markdownContent;
        if (req.body.seoTitle !== undefined) updateData.seoTitle = req.body.seoTitle;
        if (req.body.seoDescription !== undefined) updateData.seoDescription = req.body.seoDescription;
        if (req.body.linkedinTeaser !== undefined) updateData.linkedinTeaser = req.body.linkedinTeaser;
        if (req.body.xingSummary !== undefined) updateData.xingSummary = req.body.xingSummary;

        // Handle scheduled publishing
        if (reqStatus === 'SCHEDULED' && scheduledAt) {
            updateData.scheduledAt = new Date(scheduledAt);
        }

        // Handle immediate publishing
        if (reqStatus === 'PUBLISHED') {
            updateData.scheduledAt = null; // Clear scheduled time if publishing now
        }

        // Handle unpublish/cancel: clear scheduled date when reverting to DRAFT
        if (reqStatus === 'DRAFT') {
            updateData.scheduledAt = null;
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
