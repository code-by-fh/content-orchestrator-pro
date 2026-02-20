import axios from 'axios';
import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

export class XingAdapter implements PlatformAdapter {
    platform = Platform.XING;
    name = 'Xing';
    couldAutoPublish = false;

    async publish(article: Article, accessToken?: string): Promise<PublishResult> {
        if (!accessToken) {
            return { success: false, error: 'Access token is required for Xing publishing.' };
        }

        if (!article.xingSummary) {
            return { success: false, error: 'Xing summary is missing for this article.' };
        }

        try {
            const response = await axios.post(
                'https://api.xing.com/v1/users/me/share/link',
                {
                    uri: article.sourceUrl, // Assuming sourceUrl is the article link
                    comment: article.xingSummary
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[XingAdapter] Successfully posted:', response.data);
            return {
                success: true,
                platformId: response.data?.id || 'unknown'
            };
        } catch (error: any) {
            const errorData = error.response?.data || error.message;
            console.error('[XingAdapter] Error posting to Xing:', errorData);
            return {
                success: false,
                error: typeof errorData === 'string' ? errorData : JSON.stringify(errorData)
            };
        }
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string): Promise<boolean> {
        console.log(`[XingAdapter] Simulating unpublishing for: ${platformId}`);
        return true;
    }
}
