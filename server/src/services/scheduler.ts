import cron from 'node-cron';
import { PrismaClient, Platform } from '@prisma/client';
import { publishingService } from './publishingService';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const initScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        logger.info('[Scheduler] Checking for scheduled articles...');

        try {
            const now = new Date();

            const articlesToPublish = await prisma.article.findMany({
                where: {
                    scheduledAt: {
                        lte: now,
                    },
                },
            });

            if (articlesToPublish.length > 0) {
                logger.info(`[Scheduler] Found ${articlesToPublish.length} articles to publish.`);
            }

            for (const article of articlesToPublish) {
                // 1. Mark as no longer scheduled (avoid re-processing)
                await prisma.article.update({
                    where: { id: article.id },
                    data: {
                        scheduledAt: null,
                    },
                });

                // 2. Trigger Publication via PublishingService for all configured platforms
                // Currently defaults to LinkedIn if it was a single postToLinkedIn call before
                // but we could make this more dynamic based on user intent.
                // For now, keeping original intent (LinkedIn) but via the proper service.

                await publishingService.publishToPlatform(article.id, Platform.LINKEDIN);

                logger.info(`[Scheduler] Published article ${article.id} to LinkedIn`);
            }
        } catch (error: any) {
            logger.error(`[Scheduler] Error: ${error.message}`);
        }
    });

    console.log('[Scheduler] Initialized.');
};
