import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';
import logger from '../../utils/logger';

export class RssAdapter implements PlatformAdapter {
    platform = Platform.RSS;
    name = 'RSS Feed';
    couldAutoPublish = true;

    async publish(article: Article, _accessToken?: string, language: string = 'DE'): Promise<PublishResult> {
        logger.info(`[RssAdapter] Article "${article.title}" is now eligible for the RSS feed.`);

        return {
            success: true,
            platformId: article.slug || article.id
        };
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string, language: string = 'DE'): Promise<boolean> {
        logger.info(`[RssAdapter] Article with ID ${articleId} removed from RSS eligibility.`);
        return true;
    }
}

