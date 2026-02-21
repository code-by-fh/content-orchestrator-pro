
export type Platform = 'XING' | 'LINKEDIN' | 'MEDIUM' | 'RSS' | 'WEBHOOK';

export type PublicationStatus = 'PENDING' | 'PUBLISHED' | 'ERROR';

export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Publication {
    id: string;
    platform: Platform;
    status: PublicationStatus;
    platformId?: string;
    errorMessage?: string;
    publishedAt?: string;
}

export interface AvailablePlatform {
    platform: Platform;
    name: string;
    couldAutoPublish: boolean;
}

export interface Article {
    id: string;
    title: string;
    slug: string;
    sourceUrl: string;
    rawTranscript: string;
    markdownContent?: string;
    linkedinTeaser?: string;
    xingSummary?: string;
    seoTitle?: string;
    seoDescription?: string;
    processingStatus: ProcessingStatus;

    scheduledAt?: string;
    createdAt: string;
    publications: Publication[];
    availablePlatforms?: AvailablePlatform[];
}


export interface User {
    id: string;
    username: string;
}
