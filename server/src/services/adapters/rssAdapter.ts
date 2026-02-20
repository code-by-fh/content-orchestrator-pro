import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

export class RssAdapter implements PlatformAdapter {
    platform = Platform.RSS;
    name = 'RSS Feed';
    couldAutoPublish = true;

    async publish(article: Article): Promise<PublishResult> {
        console.log(`[RssAdapter] Adding article to RSS feed: ${article.title}`);

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    platformId: `rss_${article.slug || Date.now()}`
                });
            }, 800);
        });
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string): Promise<boolean> {
        console.log(`[RssAdapter] Simulating removal from RSS for: ${platformId}`);
        return true;
    }
}
