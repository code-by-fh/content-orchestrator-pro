import { Queue } from 'bullmq';

export const contentQueue = new Queue('content-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    },
});

export const addContentJob = async (
    articleId: string,
    type: 'YOUTUBE' | 'MEDIUM' | 'CUSTOM',
    sourceUrl: string,
    options?: { additionalInstructions?: string; useRawTranscript?: boolean }
) => {
    await contentQueue.add('generate-content', {
        articleId,
        type,
        sourceUrl,
        additionalInstructions: options?.additionalInstructions,
        useRawTranscript: options?.useRawTranscript,
    }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false
    });
};
