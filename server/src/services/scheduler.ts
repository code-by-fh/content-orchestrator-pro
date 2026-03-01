import cron from 'node-cron';
import { PrismaClient, Platform } from '@prisma/client';
import { publishingService } from './publishingService';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export const initScheduler = () => {
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
                await prisma.article.update({
                    where: { id: article.id },
                    data: {
                        scheduledAt: null,
                    },
                });

                await publishingService.publishToPlatform(article.id, Platform.LINKEDIN);

                logger.info(`[Scheduler] Published article ${article.id} to LinkedIn`);
            }
        } catch (error: any) {
            logger.error(`[Scheduler] Error: ${error.message}`);
        }
    });

    logger.info('[Scheduler] Initialized.');
};
