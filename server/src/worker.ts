import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import dotenv from 'dotenv';
import { extractMediumContent } from './services/mediumExtractor';
import { extractYoutubeTranscript } from './services/youtubeExtractor';
import { aiResponseSchema, responseSchema, SYSTEM_INSTRUCTION, ValidatedArticle } from './services/aiConfig';

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Robuste KI-Funktion
async function generateArticleContent(rawText: string): Promise<ValidatedArticle> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: rawText }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            systemInstruction: SYSTEM_INSTRUCTION,
        }
    });

    const text = response.text;
    if (!text) throw new Error("AI hat keinen Text zurückgegeben");

    // Sicherer Parse-Vorgang
    const jsonData = JSON.parse(text);
    return aiResponseSchema.parse(jsonData);
}

// 4. Worker Implementierung
const worker = new Worker('content-queue', async (job: Job) => {
    const { articleId, type, sourceUrl } = job.data;
    const jobStartTime = performance.now();

    console.log(`\n======================================================`);
    console.log(`🚀 [Job Started] Article ID: ${articleId} | Type: ${type}`);
    console.log(`======================================================`);

    try {
        const article = await prisma.article.findUnique({ where: { id: articleId } });
        if (!article) {
            console.warn(`⚠️ [Job Skipped] Article ${articleId} not found in database. It might have been deleted.`);
            return;
        }

        const dbStart = performance.now();
        await prisma.article.update({
            where: { id: articleId },
            data: { processingStatus: 'PROCESSING' }
        });
        const initialDbTime = performance.now() - dbStart;
        console.log(`[Status Update] Set to PROCESSING in ${initialDbTime.toFixed(2)}ms`);

        let validatedData: ValidatedArticle;
        let extractionTime = 0;
        let generationTime = 0;

        // --- Step 1 & 2: Content Acquisition ---
        if (type === 'YOUTUBE') {
            const videoId = sourceUrl.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/)?.[1];
            if (!videoId) throw new Error('Ungültige YouTube URL');

            console.log(`\n⏳ [Step 1&2: Extraction & Generation] Starting YouTube processing...`);
            const processStart = performance.now();
            validatedData = await extractYoutubeTranscript(sourceUrl);
            extractionTime = performance.now() - processStart;
            generationTime = 0; // Integrated in extraction/processing for YT
            console.log(`✅ [Step 1&2] Completed in ${extractionTime.toFixed(2)}ms.`);
        } else if (type === 'MEDIUM') {
            console.log(`\n⏳ [Step 1: Extraction] Starting Medium text extraction...`);
            const extractionStart = performance.now();
            const rawText = await extractMediumContent(sourceUrl);
            extractionTime = performance.now() - extractionStart;
            console.log(`✅ [Step 1: Extraction] Completed in ${extractionTime.toFixed(2)}ms. Extracted ${rawText.length} characters.`);

            console.log(`\n🧠 [Step 2: AI Generation] Sending characters to Gemini...`);
            const generationStart = performance.now();
            validatedData = await generateArticleContent(rawText);
            generationTime = performance.now() - generationStart;
            console.log(`✅ [Step 2: AI Generation] Completed in ${generationTime.toFixed(2)}ms.`);
        } else {
            throw new Error(`Unsupported type: ${type}`);
        }

        // --- Step 3: Database Update ---
        console.log(`\n💾 [Step 3: DB Update] Saving results to database...`);
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
        console.log(`✅ [Step 3: DB Update] Completed in ${finalDbTime.toFixed(2)}ms.`);

        // --- Summary ---
        const totalJobTime = performance.now() - jobStartTime;

        // Find longest step
        const steps = [
            { name: 'Extraction', duration: extractionTime },
            { name: 'AI Generation', duration: generationTime },
            { name: 'Database Update', duration: finalDbTime + initialDbTime }
        ];
        const longestStep = steps.reduce((prev, current) => (prev.duration > current.duration) ? prev : current);

        console.log(`\n📊 ========== GENERATION SUMMARY ==========`);
        console.log(`Total Time:      ${totalJobTime.toFixed(2)}ms`);
        console.log(`Longest Step:    ${longestStep.name} (${longestStep.duration.toFixed(2)}ms)`);
        console.table(steps.map(s => ({ Step: s.name, "Duration (ms)": s.duration.toFixed(2) })));
        console.log(`===========================================\n`);

    } catch (error: any) {
        const totalFailTime = performance.now() - jobStartTime;
        console.error(`\n❌ [Job Failed] Failed after ${totalFailTime.toFixed(2)}ms: ${error.message}`);

        try {
            await prisma.article.update({
                where: { id: articleId },
                data: { processingStatus: 'FAILED' }
            });
        } catch (dbError) {
            console.error('Failed to update article status to FAILED', dbError);
        }
        throw error;
    }
}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
    },
});