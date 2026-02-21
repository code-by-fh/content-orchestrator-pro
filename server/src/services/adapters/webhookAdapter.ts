import axios from 'axios';
import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

/**
 * Generic Webhook Adapter based on Portfolio Webhook API documentation.
 */
export class WebhookAdapter implements PlatformAdapter {
    platform = Platform.WEBHOOK;
    name = 'Portfolio Webhook';
    couldAutoPublish = true;

    private getApiConfig() {
        return {
            url: process.env.WEBHOOK_URL || 'http://localhost:3000/api/posts/push',
            apiKey: process.env.WEBHOOK_API_KEY || ''
        };
    }

    async publish(article: Article, _accessToken?: string): Promise<PublishResult> {
        if (!article.markdownContent) {
            return { success: false, error: 'Article has no content to publish.' };
        }

        const config = this.getApiConfig();
        if (!config.apiKey) {
            return { success: false, error: 'WEBHOOK_API_KEY is not configured.' };
        }

        // Format date to YYYY-MM-DD
        const publishDate = article.scheduledAt || article.createdAt || new Date();
        const dateString = publishDate.toISOString().split('T')[0];

        try {
            const payload = {
                title: article.title,
                slug: article.slug,
                date: dateString,
                content: article.markdownContent,
                category: 'General', // Default as per documentation
                excerpt: article.seoDescription || article.xingSummary || '',
                locale: 'de' // Default as per documentation
            };


            await axios.post(
                config.url,
                payload,
                {
                    headers: {
                        'x-api-key': config.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                platformId: article.slug
            };
        } catch (error: any) {
            const errorData = error.response?.data || error.message;
            console.error('[WebhookAdapter] Publish Error:', errorData);

            let errorMessage = 'Unknown error';
            if (error.response?.status === 401) errorMessage = 'Unauthorized: API Key invalid';
            else if (error.response?.status === 429) errorMessage = 'Rate limit exceeded';
            else if (typeof errorData === 'string') errorMessage = errorData;
            else if (errorData.message) errorMessage = errorData.message;
            else errorMessage = JSON.stringify(errorData);

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    async unpublish(_articleId: string, platformId: string, _accessToken?: string): Promise<boolean> {
        const config = this.getApiConfig();
        if (!config.apiKey) {
            console.error('[WebhookAdapter] Unpublish Error: WEBHOOK_API_KEY not configured');
            return false;
        }

        try {
            await axios.delete(config.url, {
                params: {
                    slug: platformId,
                    locale: 'de'
                },
                headers: {
                    'x-api-key': config.apiKey
                }
            });
            return true;
        } catch (error: any) {
            const errorData = error.response?.data || error.message;
            console.error('[WebhookAdapter] Unpublish Error:', errorData);
            return false;
        }
    }
}
