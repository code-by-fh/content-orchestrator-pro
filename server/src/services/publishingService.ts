import { PrismaClient, Platform, Article } from '@prisma/client';
import { PlatformAdapter } from './adapters/types';
import { XingAdapter } from './adapters/xingAdapter';
import { LinkedInAdapter } from './adapters/linkedinAdapter';
import { RssAdapter } from './adapters/rssAdapter';
import { MediumAdapter } from './adapters/mediumAdapter';

const prisma = new PrismaClient();

class PublishingService {
    private adapters: Map<Platform, PlatformAdapter> = new Map();

    constructor() {
        this.registerAdapter(new XingAdapter());
        this.registerAdapter(new LinkedInAdapter());
        this.registerAdapter(new RssAdapter());
        this.registerAdapter(new MediumAdapter());
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

    async publishToPlatform(articleId: string, platform: Platform, accessToken?: string) {
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
            where: { articleId_platform: { articleId, platform } },
            create: { articleId, platform, status: 'PENDING' },
            update: { status: 'PENDING', errorMessage: null }
        });

        const result = await adapter.publish(article, accessToken);

        if (result.success) {
            await prisma.publication.update({
                where: { articleId_platform: { articleId, platform } },
                data: {
                    status: 'PUBLISHED',
                    platformId: result.platformId,
                    publishedAt: new Date()
                }
            });

        } else {
            await prisma.publication.update({
                where: { articleId_platform: { articleId, platform } },
                data: {
                    status: 'ERROR',
                    errorMessage: result.error
                }
            });
        }

        return result;
    }

    async unpublishFromPlatform(articleId: string, platform: Platform, accessToken?: string) {
        const pub = await prisma.publication.findUnique({
            where: { articleId_platform: { articleId, platform } }
        });

        if (!pub || !pub.platformId) {
            // Already unpublished or never published
            return true;
        }

        const adapter = this.adapters.get(platform);
        if (adapter) {
            await adapter.unpublish(articleId, pub.platformId, accessToken);
        }

        await prisma.publication.update({
            where: { articleId_platform: { articleId, platform } },
            data: {
                status: 'PENDING',
                platformId: null
            }
        });

        return true;
    }
}

export const publishingService = new PublishingService();
