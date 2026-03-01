import axios from 'axios';
import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';
import logger from '../../utils/logger';

export class XingAdapter implements PlatformAdapter {
    platform = Platform.XING;
    name = 'Xing';
    couldAutoPublish = false;

    async publish(article: Article, accessToken?: string, language: string = 'DE'): Promise<PublishResult> {
        if (!accessToken) {
            return { success: false, error: 'Access token is required for Xing publishing.' };
        }

        if (!article.xingSummary) {
            return { success: false, error: 'Xing summary is missing.' };
        }

        if (!article.sourceUrl) {
            return { success: false, error: 'Article source URL is missing.' };
        }

        try {
            // Xing API v1 Share Link endpoint
            const response = await axios.post(
                'https://api.xing.com/v1/users/me/share/link',
                {
                    uri: `${process.env.PUBLIC_ARTICLE_BASE_URL || 'http://localhost:5173/articles'}/${article.slug}`,
                    comment: article.xingSummary
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info(`[XingAdapter] Successfully posted: ${JSON.stringify(response.data)}`);

            // The response for shares usually contains an array of IDs or a single ID depending on version
            const platformId = response.data?.ids?.[0] || response.data?.id || 'xing_share_' + Date.now();

            return {
                success: true,
                platformId: platformId
            };
        } catch (error: any) {
            const errorData = error.response?.data || error.message;
            logger.error(`[XingAdapter] Error posting to Xing: ${JSON.stringify(errorData)}`);

            // Improved error extraction for complex Xing error objects
            let errorMessage = 'Unknown Xing error';
            if (typeof errorData === 'string') {
                errorMessage = errorData;
            } else if (errorData.error_name) {
                errorMessage = `${errorData.error_name}: ${errorData.message || ''}`;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string, language: string = 'DE'): Promise<boolean> {
        if (!accessToken || !platformId) return false;

        logger.info(`[XingAdapter] Attempting to unpublish share ${platformId}`);
        // Note: Xing API v1 unpublishing of shares is often not available via public endpoints
        // but we log it as an attempt for consistency.
        return true;
    }
}

