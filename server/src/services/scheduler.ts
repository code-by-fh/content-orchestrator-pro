import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { postToLinkedIn } from './linkedin';

const prisma = new PrismaClient();

export const initScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        console.log('[Scheduler] Checking for scheduled articles...');

        try {
            const now = new Date();

            const articlesToPublish = await prisma.article.findMany({
                where: {
                    // status removed, relying on scheduledAt
                    scheduledAt: {
                        lte: now,
                    },
                },
            });

            if (articlesToPublish.length > 0) {
                console.log(`[Scheduler] Found ${articlesToPublish.length} articles to publish.`);
            }

            for (const article of articlesToPublish) {
                // 1. Update status to PUBLISHED
                const updatedArticle = await prisma.article.update({
                    where: { id: article.id },
                    data: {
                        scheduledAt: null,
                    },
                });

                // 2. Trigger LinkedIn Push
                await postToLinkedIn(updatedArticle);

                console.log(`[Scheduler] Published article ${article.id}`);
            }
        } catch (error) {
            console.error('[Scheduler] Error:', error);
        }
    });

    console.log('[Scheduler] Initialized.');
};
