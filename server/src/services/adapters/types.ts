import { Article, Platform } from '@prisma/client';

export interface PublishResult {
    success: boolean;
    platformId?: string;
    error?: string;
}

export interface PlatformAdapter {
    platform: Platform;
    name: string;
    couldAutoPublish: boolean;
    publish(article: Article, accessToken?: string): Promise<PublishResult>;
    unpublish(articleId: string, platformId: string, accessToken?: string): Promise<boolean>;
}

