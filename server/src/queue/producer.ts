import { Queue } from 'bullmq';

export const contentQueue = new Queue('content-queue', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
});

export const addContentJob = async (articleId: string, type: 'YOUTUBE' | 'MEDIUM', sourceUrl: string) => {
    await contentQueue.add('generate-content', { articleId, type, sourceUrl });
};
