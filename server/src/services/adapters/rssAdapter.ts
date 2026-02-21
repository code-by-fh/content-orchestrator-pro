import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

export class RssAdapter implements PlatformAdapter {
    platform = Platform.RSS;
    name = 'RSS Feed';
    couldAutoPublish = true;

    async publish(article: Article, _accessToken?: string, language: string = 'DE'): Promise<PublishResult> {
        // Since our RSS feed is dynamically generated from articles with status 'PUBLISHED'
        // specifically for the RSS platform, 'publishing' to RSS confirms visibility there.
        // The PublishingService will handle the status transition for the RSS publication record.

        console.log(`[RssAdapter] Article "${article.title}" is now eligible for the RSS feed.`);

        return {
            success: true,
            platformId: article.slug || article.id
        };
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string, language: string = 'DE'): Promise<boolean> {
        // Unpublishing from RSS is handled by changing the article status or deleting the publication record.
        console.log(`[RssAdapter] Article with ID ${articleId} removed from RSS eligibility.`);
        return true;
    }
}

