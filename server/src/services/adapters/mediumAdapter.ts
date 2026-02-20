import { Article, Platform } from '@prisma/client';
import { PlatformAdapter, PublishResult } from './types';

export class MediumAdapter implements PlatformAdapter {
    platform = Platform.MEDIUM;
    name = 'Medium';
    couldAutoPublish = true;

    async publish(article: Article, accessToken?: string): Promise<PublishResult> {
        console.log(`[MediumAdapter] Simulating posting for: ${article.title}`);

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, platformId: `med_${Date.now()}` });
            }, 1200);
        });
    }

    async unpublish(articleId: string, platformId: string, accessToken?: string): Promise<boolean> {
        console.log(`[MediumAdapter] Simulating unpublishing for: ${platformId}`);
        return true;
    }
}
