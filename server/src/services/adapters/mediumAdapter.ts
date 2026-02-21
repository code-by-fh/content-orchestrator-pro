import axios from 'axios';
import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

export class MediumAdapter implements PlatformAdapter {
    platform = Platform.MEDIUM;
    name = 'Medium';
    couldAutoPublish = true;

    async publish(article: Article, accessToken?: string, language: string = 'DE'): Promise<PublishResult> {
        if (!accessToken) {
            return { success: false, error: 'Medium requires an integration token.' };
        }

        if (!article.markdownContent) {
            return { success: false, error: 'Article has no content to publish.' };
        }

        try {
            // 1. Get User ID
            const meResponse = await axios.get('https://api.medium.com/v1/me', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const authorId = meResponse.data.data.id;

            // 2. Post content
            const postResponse = await axios.post(
                `https://api.medium.com/v1/users/${authorId}/posts`,
                {
                    title: article.title,
                    contentFormat: 'markdown',
                    content: article.markdownContent,
                    canonicalUrl: `${process.env.PUBLIC_ARTICLE_BASE_URL || 'http://localhost:5173/articles'}/${article.slug}`,
                    publishStatus: 'public'
                },
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            return {
                success: true,
                platformId: postResponse.data.data.id
            };
        } catch (error: any) {
            const errorData = error.response?.data || error.message;
            console.error('[MediumAdapter] Error:', errorData);
            return {
                success: false,
                error: typeof errorData === 'string' ? errorData : JSON.stringify(errorData)
            };
        }
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string, language: string = 'DE'): Promise<boolean> {
        // Medium API does not officially support unpublishing via their public API v1
        console.warn('[MediumAdapter] Unpublishing not supported by Medium API v1');
        return false;
    }
}

