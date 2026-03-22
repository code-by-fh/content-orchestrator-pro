import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import dotenv from 'dotenv';
import { extractMediumContent } from './services/mediumExtractor';
import { extractYoutubeTranscript } from './services/youtubeExtractor';
import { aiResponseSchema, responseSchema, SYSTEM_INSTRUCTION, OPENROUTER_JSON_SUFFIX, buildSystemInstruction, ValidatedArticle } from './services/aiConfig';
import logger from './utils/logger';
import { repairTruncatedJson } from './utils/jsonHelper';

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateArticleContent(rawText: string, settings: any, additionalInstructions?: string): Promise<ValidatedArticle> {
    const systemInstruction = buildSystemInstruction(additionalInstructions);

    if (settings?.useOpenRouter && settings?.openrouterApiKey) {
        logger.info(`🤖 [AI] Using OpenRouter (model: ${settings.openrouterModel})`);
        const openai = new OpenAI({
            apiKey: settings.openrouterApiKey,
            baseURL: settings.openrouterBaseUrl || 'https://openrouter.ai/api/v1',
        });

        const response = await openai.chat.completions.create({
            model: settings.openrouterModel || 'openai/gpt-4o-mini',
            messages: [
                { role: 'system', content: systemInstruction + OPENROUTER_JSON_SUFFIX },
                { role: 'user', content: rawText },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 8000, // Adjusted max tokens for OpenRouter
        });

        const text = response.choices[0]?.message?.content;
        if (!text) throw new Error("OpenRouter hat keinen Text zurückgegeben");

        let jsonData;
        try {
            jsonData = JSON.parse(text);
        } catch (e) {
            logger.warn(`🤖 [AI] Truncated OpenRouter JSON detected, attempting repair...`);
            const repaired = repairTruncatedJson(text);
            jsonData = JSON.parse(repaired);
        }

        return aiResponseSchema.parse(jsonData);
    } else {
        logger.info(`🤖 [AI] Using Gemini (model: gemini-2.5-flash)`);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: rawText }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction,
                maxOutputTokens: 8192,
            }
        });

        const text = response.text;
        if (!text) throw new Error("AI hat keinen Text zurückgegeben");

        let jsonData;
        try {
            jsonData = JSON.parse(text);
        } catch (e) {
            logger.warn(`🤖 [AI] Truncated JSON detected, attempting repair...`);
            const repaired = repairTruncatedJson(text);
            jsonData = JSON.parse(repaired);
        }

        return aiResponseSchema.parse(jsonData);
    }
}

const worker = new Worker('content-queue', async (job: Job) => {
    const { articleId, type, sourceUrl, additionalInstructions, useRawTranscript } = job.data;
    const jobStartTime = performance.now();

    logger.info(`\n======================================================`);
    logger.info(`🚀 [Job Started] Article ID: ${articleId} | Type: ${type}`);
    logger.info(`======================================================`);

    try {
        const [article, settings] = await Promise.all([
            prisma.article.findUnique({ where: { id: articleId } }),
            prisma.appSettings.findUnique({ where: { id: 'singleton' } }),
        ]);

        if (!article) {
            logger.warn(`⚠️ [Job Skipped] Article ${articleId} not found in database. It might have been deleted.`);
            return;
        }

        const dbStart = performance.now();
        await prisma.article.update({
            where: { id: articleId },
            data: { processingStatus: 'PROCESSING' }
        });
        const initialDbTime = performance.now() - dbStart;
        logger.info(`[Status Update] Set to PROCESSING in ${initialDbTime.toFixed(2)}ms`);

        let validatedData: ValidatedArticle;
        let extractionTime = 0;
        let generationTime = 0;

        // Content Acquisition
        if (useRawTranscript && article.rawTranscript) {
            // Regeneration: use stored transcript directly, skip re-extraction
            logger.info(`\n🔄 [Step 1: Skipped] Using stored rawTranscript (${article.rawTranscript.length} chars).`);
            if (additionalInstructions) {
                logger.info(`📝 Additional instructions: "${additionalInstructions.substring(0, 100)}${additionalInstructions.length > 100 ? '...' : ''}"`);
            }

            logger.info(`\n🧠 [Step 2: AI Generation] Regenerating from rawTranscript...`);
            const generationStart = performance.now();
            validatedData = await generateArticleContent(article.rawTranscript, settings, additionalInstructions);
            // Preserve the original transcript since we're regenerating from it
            validatedData = { ...validatedData, rawTranscript: article.rawTranscript };
            generationTime = performance.now() - generationStart;
            logger.info(`✅ [Step 2: AI Generation] Completed in ${generationTime.toFixed(2)}ms.`);
        } else if (type === 'YOUTUBE') {
            const videoId = sourceUrl.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/)?.[1];
            if (!videoId) throw new Error('Ungültige YouTube URL');

            logger.info(`\n⏳ [Step 1&2: Extraction & Generation] Starting YouTube processing...`);
            const processStart = performance.now();
            validatedData = await extractYoutubeTranscript(sourceUrl);
            extractionTime = performance.now() - processStart;
            generationTime = 0; // Integrated in extraction/processing for YT
            logger.info(`✅ [Step 1&2] Completed in ${extractionTime.toFixed(2)}ms.`);
        } else if (type === 'MEDIUM') {
            logger.info(`\n⏳ [Step 1: Extraction] Starting Medium text extraction...`);
            const extractionStart = performance.now();
            const rawText = await extractMediumContent(sourceUrl);
            extractionTime = performance.now() - extractionStart;
            logger.info(`✅ [Step 1: Extraction] Completed in ${extractionTime.toFixed(2)}ms. Extracted ${rawText.length} characters.`);

            logger.info(`\n🧠 [Step 2: AI Generation] Sending characters to AI...`);
            const generationStart = performance.now();
            validatedData = await generateArticleContent(rawText, settings);
            generationTime = performance.now() - generationStart;
            logger.info(`✅ [Step 2: AI Generation] Completed in ${generationTime.toFixed(2)}ms.`);
        } else if (type === 'CUSTOM') {
            logger.info(`\n📝 [Step 1: Custom Text] Using provided text (${article.rawTranscript?.length || 0} chars).`);
            validatedData = await generateArticleContent(article.rawTranscript || '', settings);
            extractionTime = 0;
            generationTime = 0; // generateArticleContent returns the data
        } else {
            throw new Error(`Unsupported type: ${type}`);
        }

        // Database Update
        logger.info(`\n💾 [Step 3: DB Update] Saving results to database...`);
        const finalDbStart = performance.now();

        await prisma.article.update({
            where: { id: articleId },
            data: {
                markdownContent: validatedData.markdownContent,
                linkedinTeaser: validatedData.linkedinTeaser,
                xingSummary: validatedData.xingSummary,
                title: validatedData.seoTitle,
                seoTitle: validatedData.seoTitle,
                seoDescription: validatedData.seoDescription,
                slug: validatedData.slug,
                category: validatedData.category,
                rawTranscript: validatedData.rawTranscript,
                processingStatus: 'DRAFT'
            },
        });

        const finalDbTime = performance.now() - finalDbStart;
        logger.info(`✅ [Step 3: DB Update] Completed in ${finalDbTime.toFixed(2)}ms.`);

        // Summary
        const totalJobTime = performance.now() - jobStartTime;

        // Find longest step
        const steps = [
            { name: 'Extraction', duration: extractionTime },
            { name: 'AI Generation', duration: generationTime },
            { name: 'Database Update', duration: finalDbTime + initialDbTime }
        ];
        const longestStep = steps.reduce((prev, current) => (prev.duration > current.duration) ? prev : current);

        logger.info(`\n📊 ========== GENERATION SUMMARY ==========`);
        logger.info(`Total Time:      ${totalJobTime.toFixed(2)}ms`);
        logger.info(`Longest Step:    ${longestStep.name} (${longestStep.duration.toFixed(2)}ms)`);
        logger.info(JSON.stringify(steps.map(s => ({ Step: s.name, "Duration (ms)": s.duration.toFixed(2) })), null, 2));
        logger.info(`===========================================\n`);

    } catch (error: any) {
        const totalFailTime = performance.now() - jobStartTime;
        logger.error(`\n❌ [Job Failed] Failed after ${totalFailTime.toFixed(2)}ms: ${error.message}`);

        try {
            await prisma.article.update({
                where: { id: articleId },
                data: { processingStatus: 'FAILED' }
            });
        } catch (dbError: any) {
            logger.error(`Failed to update article status to FAILED: ${dbError.message}`);
        }
        throw error;
    }
}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
    },
    lockDuration: 600000,
});