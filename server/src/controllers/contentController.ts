import { Request, Response } from 'express';
import { PrismaClient, Platform, PublicationStatus } from '@prisma/client';
import { publishingService } from '../services/publishingService';

import { z } from 'zod';
import { addContentJob } from '../queue/producer';
import logger from '../utils/logger';

const prisma = new PrismaClient();

const createContentSchema = z.object({
    url: z.string().url(),
    type: z.enum(['YOUTUBE', 'MEDIUM']),
    title: z.string().optional(), // Optional initial title
});

export const createContent = async (req: Request, res: Response) => {
    try {
        const { url, type, title } = createContentSchema.parse(req.body);

        logger.info(`[Content] Received request to generate article from ${type} URL: ${url}`);

        let slug = title ? title.toLowerCase().replace(/ /g, '-') : `draft-${Date.now()}`;

        const article = await prisma.article.create({
            data: {
                title: title || 'New Draft',
                slug: slug,
                sourceUrl: url,
                rawTranscript: '',
                processingStatus: 'PENDING',
            },
        });


        await addContentJob(article.id, type, url);

        logger.info(`[Content] Successfully queued job for new article (ID: ${article.id})`);

        res.json(article);
    } catch (error: any) {
        logger.error(`[Content] Create article error: ${error.message || 'Unknown error'}`);
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

    const platforms = publishingService.getAdapters();

    res.json({ ...article, availablePlatforms: platforms });
};

export const publishToPlatform = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { platform, accessToken, language = 'DE' } = req.body;

    if (!platform || !Object.values(Platform).includes(platform)) {
        return res.status(400).json({ message: 'Invalid or missing platform' });
    }

    if (language !== 'DE' && language !== 'EN') {
        return res.status(400).json({ message: 'Invalid language' });
    }

    try {
        let currentArticle = await prisma.article.findUnique({
            where: { id: id as string }
        });

        if (!currentArticle) {
            return res.status(404).json({ message: 'Article not found' });
        }

        if (language === 'EN') {
            if (!currentArticle.markdownContentEn || !currentArticle.titleEn || !currentArticle.seoTitleEn) {
                const { translateArticleToEnglish } = await import('../services/translationService');
                currentArticle = await translateArticleToEnglish(id);
            }
        }

        const result = await publishingService.publishToPlatform(id, platform as Platform, accessToken, language);
        if (result.success) {
            res.json({ message: `Successfully published to ${platform} in ${language}`, platformId: result.platformId });
        } else {
            res.status(500).json({ message: `Failed to publish to ${platform}`, error: result.error });
        }
    } catch (error: any) {
        logger.error(`[Content] Publish to platform error: ${error.message || 'Unknown error'}`);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

export const unpublishFromPlatform = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { platform, language = 'DE' } = req.body;

    if (!platform || !Object.values(Platform).includes(platform)) {
        return res.status(400).json({ message: 'Invalid or missing platform' });
    }

    try {
        await publishingService.unpublishFromPlatform(id, platform as Platform, undefined, language);
        res.json({ message: `Successfully unpublished from ${platform} in ${language}` });
    } catch (error: any) {
        logger.error(`[Content] Unpublish from platform error: ${error.message || 'Unknown error'}`);
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
            await publishingService.unpublishFromPlatform(id, pub.platform, undefined, pub.language);
        }

        res.json({ message: `Successfully unpublished from all platforms` });
    } catch (error: any) {
        logger.error(`[Content] Unpublish all error: ${error.message || 'Unknown error'}`);
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
                await publishingService.unpublishFromPlatform(id, pub.platform, undefined, pub.language);
            }
        }

        await prisma.article.delete({ where: { id: id as string } });
        res.status(204).send();
    } catch (error: any) {
        logger.error(`[Content] Delete article error: ${error.message || 'Unknown error'}`);
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
        if (req.body.ogImageUrl !== undefined) updateData.ogImageUrl = req.body.ogImageUrl;
        if (req.body.category !== undefined) updateData.category = req.body.category;

        if (reqStatus === 'SCHEDULED' && scheduledAt) {
            updateData.scheduledAt = new Date(scheduledAt);
        }

        if (reqStatus === 'PUBLISHED') {
            updateData.scheduledAt = null; // Clear scheduled time if publishing now
        }

        if (reqStatus === 'DRAFT') {
            updateData.scheduledAt = null;
        }

        if (scheduledAt === '') {
            updateData.scheduledAt = null;
        }

        const article = await prisma.article.update({
            where: { id: id as string },
            data: updateData,
        });
        res.json(article);
    } catch (error: any) {
        logger.error(`[Content] Update article error: ${error.message || 'Unknown error'}`);
        res.status(500).json({ message: 'Failed to update article' });
    }
};

export const reprocessArticle = async (req: Request, res: Response) => {
    const { id } = req.params;
    logger.info(`[Content] Received request to reprocess article (ID: ${id})`);

    try {
        const article = await prisma.article.findUnique({ where: { id: id as string } });
        if (!article) return res.status(404).json({ message: 'Article not found' });

        await prisma.article.update({
            where: { id },
            data: { processingStatus: 'PENDING' }
        });

        let type: 'YOUTUBE' | 'MEDIUM' = 'YOUTUBE';
        if (article.sourceUrl.includes('medium.com')) {
            type = 'MEDIUM';
        }

        await addContentJob(article.id, type, article.sourceUrl);

        logger.info(`[Content] Successfully re-queued job for article (ID: ${article.id})`);

        res.json({ message: 'Re-processing started' });
    } catch (error: any) {
        logger.error(`[Content] Reprocess article error: ${error.message || 'Unknown error'}`);
        res.status(500).json({ message: 'Failed to re-process article' });
    }
};

export const getShareUrl = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { platform, language } = req.query;

    try {
        const article = await prisma.article.findUnique({ where: { id: id as string } });
        if (!article) return res.status(404).json({ message: 'Article not found' });

        const lang = ((language as string) || 'DE').toLowerCase();
        const baseUrl = process.env.PUBLIC_ARTICLE_BASE_URL || "http://localhost:5173";
        const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const randomV = Math.random().toString(36).substring(2, 8);
        const publicArticleUrl = `${formattedBaseUrl}/${lang}/blog/${article.slug}?v=${randomV}`;

        let shareUrl = '';
        if (platform === 'XING') {
            shareUrl = `https://www.xing.com/spi/shares/new?url=${encodeURIComponent(publicArticleUrl)}`;
        } else if (platform === 'LINKEDIN') {
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicArticleUrl)}`;
        } else if (platform === 'RSS') {
            const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
            shareUrl = `${backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl}/api/rss`;
        } else {
            shareUrl = publicArticleUrl;
        }

        res.json({ shareUrl });
    } catch (error: any) {
        logger.error(`[Content] Get share URL error: ${error.message || 'Unknown error'}`);
        res.status(500).json({ message: 'Failed to generate share URL' });
    }
};

export const uploadImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileName = req.file.filename;
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const imageUrl = `${baseUrl}/uploads/${fileName}`;

        res.json({ imageUrl });
    } catch (error: any) {
        logger.error(`[Content] Upload image error: ${error.message || 'Unknown error'}`);
        res.status(500).json({ message: 'Failed to upload image' });
    }
};
