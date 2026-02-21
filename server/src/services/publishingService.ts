import { PrismaClient, Platform, Article } from '@prisma/client';
import { PlatformAdapter } from './adapters/types';
import { XingAdapter } from './adapters/xingAdapter';
import { LinkedInAdapter } from './adapters/linkedinAdapter';
import { RssAdapter } from './adapters/rssAdapter';
import { MediumAdapter } from './adapters/mediumAdapter';
import { WebhookAdapter } from './adapters/webhookAdapter';

const prisma = new PrismaClient();

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

        // 1. Create or update publication record to PENDING
        await prisma.publication.upsert({
            where: { articleId_platform_language: { articleId, platform, language: language as any } },
            create: { articleId, platform, language: language as any, status: 'PENDING' },
            update: { status: 'PENDING', errorMessage: null }
        });

        // Use correct article content based on language selection
        const publishedArticle = {
            ...article,
            title: language === 'EN' ? (article.titleEn || article.title) : article.title,
            seoTitle: language === 'EN' ? (article.seoTitleEn || article.seoTitle) : article.seoTitle,
            seoDescription: language === 'EN' ? (article.seoDescriptionEn || article.seoDescription) : article.seoDescription,
            markdownContent: language === 'EN' ? (article.markdownContentEn || article.markdownContent) : article.markdownContent,
            linkedinTeaser: language === 'EN' ? (article.linkedinTeaserEn || article.linkedinTeaser) : article.linkedinTeaser,
            xingSummary: language === 'EN' ? (article.xingSummaryEn || article.xingSummary) : article.xingSummary,
        };

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
            // Already unpublished or never published
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
