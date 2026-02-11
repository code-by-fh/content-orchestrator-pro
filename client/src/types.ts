export type ArticleStatus = 'DRAFT' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'SCHEDULED' | 'PUBLISHED' | 'ERROR';

export interface Article {
    id: string;
    title: string;
    slug: string;
    sourceUrl: string;
    rawTranscript: string;
    markdownContent?: string;
    linkedinTeaser?: string;
    xingSummary?: string;
    status: ArticleStatus;
    scheduledAt?: string;
    publishedAt?: string;
    createdAt: string;
}

export interface User {
    id: string;
    username: string;
}
