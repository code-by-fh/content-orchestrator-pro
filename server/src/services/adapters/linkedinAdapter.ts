import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

export class LinkedInAdapter implements PlatformAdapter {
    platform = Platform.LINKEDIN;
    name = 'LinkedIn';
    couldAutoPublish = true;

    async publish(article: Article, accessToken?: string): Promise<PublishResult> {
        console.log(`[LinkedInAdapter] Simulating posting for: ${article.title}`);

        if (!article.linkedinTeaser) {
            return { success: false, error: 'LinkedIn teaser is missing.' };
        }

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, platformId: `li_${Date.now()}` });
            }, 1000);
        });
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string): Promise<boolean> {
        console.log(`[LinkedInAdapter] Simulating unpublishing for: ${platformId}`);
        return true;
    }
}
