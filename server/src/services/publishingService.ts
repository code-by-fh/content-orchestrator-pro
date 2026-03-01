import { Platform, PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { LinkedInAdapter } from './adapters/linkedinAdapter';
import { MediumAdapter } from './adapters/mediumAdapter';
import { RssAdapter } from './adapters/rssAdapter';
import { PlatformAdapter } from './adapters/types';
import { WebhookAdapter } from './adapters/webhookAdapter';
import { XingAdapter } from './adapters/xingAdapter';
import logger from '../utils/logger';

const prisma = new PrismaClient();

async function uploadLocalImageToCMS(localUrl: string, altText: string, articleTitle: string): Promise<string | null> {
    const cmsUrl = process.env.CONTENT_MANAGEMENT_IMAGE_URL;
    const cmsToken = process.env.CONTENT_MANAGEMENT_TOKEN;

    if (!cmsUrl || !cmsToken || !localUrl.includes('/uploads/')) {
        return null;
    }

    try {
        const fileName = localUrl.substring(localUrl.lastIndexOf('/') + 1);
        const filePath = path.join(__dirname, '../../uploads', fileName);

        if (!fs.existsSync(filePath)) {
            logger.error(`Local file not found for upload: ${filePath}`);
            return null;
        }

        const baseUrl = new URL(cmsUrl).origin;
        const ext = path.extname(fileName).toLowerCase();

        let mimeType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.svg') mimeType = 'image/svg+xml';

        let baseName = (altText && altText.length > 2 && altText.toLowerCase() !== 'image') ? altText : articleTitle;
        const seoName = baseName.toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        const seoFileName = `${seoName}${ext}`;

        const fileBuffer = await fs.promises.readFile(filePath);
        const blob = new Blob([fileBuffer], { type: mimeType });

        const formData = new FormData();
        formData.append('title', altText || articleTitle);
        formData.append('filename_download', seoFileName);
        formData.append('file', blob, seoFileName);

        const response = await fetch(cmsUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cmsToken}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Request failed with status code ${response.status}`);
        }

        const result = await response.json();
        const imageId = result?.data?.id;

        if (imageId) {
            const newImageUrl = `${baseUrl}/assets/${imageId}/${seoFileName}`;

            try {
                if (fs.existsSync(filePath)) {
                    fs.promises.unlink(filePath).catch(e => logger.error(`Failed to unlink local image: ${e.message}`));
                }
            } catch (e: any) {
                logger.error(`Failed to delete local file: ${e.message}`);
            }

            return newImageUrl;
        }
    } catch (error: any) {
        console.error(`Failed to upload local image ${localUrl} to CMS:`, error.message);
    }

    return null;
}

async function processImages(articleId: string, markdownContent: string | null, language: string, articleTitle: string): Promise<string | null> {
    logger.info(`Processing images for article ${articleId}`);
    const cmsUrl = process.env.CONTENT_MANAGEMENT_IMAGE_URL;
    const cmsToken = process.env.CONTENT_MANAGEMENT_TOKEN;

    if (!cmsUrl || !cmsToken || !markdownContent) {
        return markdownContent;
    }

    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let newMarkdownContent = markdownContent;
    let hasChanges = false;

    const matches = Array.from(markdownContent.matchAll(imageRegex));

    for (const match of matches) {
        const fullMatch = match[0];
        const altText = match[1];
        const url = match[2];

        if (url.includes('/uploads/')) {
            const newImageUrl = await uploadLocalImageToCMS(url, altText, articleTitle);
            if (newImageUrl) {
                newMarkdownContent = newMarkdownContent.replace(fullMatch, `![${altText}](${newImageUrl})`);
                hasChanges = true;
            }
        }
    }

    if (hasChanges) {
        if (language === 'EN') {
            await (prisma.article as any).update({ where: { id: articleId }, data: { markdownContentEn: newMarkdownContent } });
        } else {
            await prisma.article.update({ where: { id: articleId }, data: { markdownContent: newMarkdownContent } });
        }
    }

    return newMarkdownContent;
}

class PublishingService {
    private adapters: Map<Platform, PlatformAdapter> = new Map();

    constructor() {
        this.registerAdapter(new XingAdapter());
        this.registerAdapter(new LinkedInAdapter());
        this.registerAdapter(new RssAdapter());
        this.registerAdapter(new MediumAdapter());
        this.registerAdapter(new WebhookAdapter());
    }

    private registerAdapter(adapter: PlatformAdapter) {
        this.adapters.set(adapter.platform, adapter);
    }

    getAdapters() {
        return Array.from(this.adapters.values()).map(a => ({
            platform: a.platform,
            name: a.name,
            couldAutoPublish: a.couldAutoPublish
        }));
    }

    async publishToPlatform(articleId: string, platform: Platform, accessToken?: string, language: string = 'DE') {
        const article = await prisma.article.findUnique({
            where: { id: articleId }
        });

        if (!article) {
            throw new Error(`Article ${articleId} not found`);
        }

        const adapter = this.adapters.get(platform);
        if (!adapter) {
            throw new Error(`No adapter found for platform ${platform}`);
        }

        await prisma.publication.upsert({
            where: { articleId_platform_language: { articleId, platform, language: language as any } },
            create: { articleId, platform, language: language as any, status: 'PENDING' },
            update: { status: 'PENDING', errorMessage: null }
        });

        // Use correct article content based on language selection
        let publishedArticle: any = {
            ...article,
            title: language === 'EN' ? (article.titleEn || article.title) : article.title,
            seoTitle: language === 'EN' ? (article.seoTitleEn || article.seoTitle) : article.seoTitle,
            seoDescription: language === 'EN' ? (article.seoDescriptionEn || article.seoDescription) : article.seoDescription,
            markdownContent: language === 'EN' ? (article.markdownContentEn || article.markdownContent) : article.markdownContent,
            linkedinTeaser: language === 'EN' ? (article.linkedinTeaserEn || article.linkedinTeaser) : article.linkedinTeaser,
            xingSummary: language === 'EN' ? (article.xingSummaryEn || article.xingSummary) : article.xingSummary,
        };

        // Handle ogImageUrl if it's a local upload
        if (publishedArticle.ogImageUrl && publishedArticle.ogImageUrl.includes('/uploads/')) {
            logger.info('Uploading ogImageUrl to CMS...');
            const newOgImageUrl = await uploadLocalImageToCMS(
                publishedArticle.ogImageUrl,
                `${publishedArticle.title} OG Image`,
                publishedArticle.title
            );

            if (newOgImageUrl) {
                publishedArticle.ogImageUrl = newOgImageUrl;
                // Update the database so we don't upload it again next time
                await prisma.article.update({
                    where: { id: articleId },
                    data: { ogImageUrl: newOgImageUrl }
                });
            }
        }

        const newMarkdown = await processImages(articleId, publishedArticle.markdownContent, language, publishedArticle.title);
        publishedArticle.markdownContent = newMarkdown;

        const result = await adapter.publish(publishedArticle as any, accessToken, language);

        if (result.success) {
            await prisma.publication.update({
                where: { articleId_platform_language: { articleId, platform, language: language as any } },
                data: {
                    status: 'PUBLISHED',
                    platformId: result.platformId,
                    publishedAt: new Date()
                }
            });

        } else {
            await prisma.publication.update({
                where: { articleId_platform_language: { articleId, platform, language: language as any } },
                data: {
                    status: 'ERROR',
                    errorMessage: result.error
                }
            });
        }

        return result;
    }

    async unpublishFromPlatform(articleId: string, platform: Platform, accessToken?: string, language: string = 'DE') {
        const pub = await prisma.publication.findUnique({
            where: { articleId_platform_language: { articleId, platform, language: language as any } }
        });

        if (!pub || !pub.platformId) {
            return true;
        }

        const adapter = this.adapters.get(platform);
        if (adapter) {
            await adapter.unpublish(articleId, pub.platformId, accessToken, language);
        }

        await prisma.publication.update({
            where: { articleId_platform_language: { articleId, platform, language: language as any } },
            data: {
                status: 'PENDING',
                platformId: null
            }
        });

        return true;
    }
}

export const publishingService = new PublishingService();
