import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { extractMediumContent } from './services/mediumExtractor';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import path from 'path';

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 1. Zod Schema (Wichtig für die Runtime-Validierung)
const aiResponseSchema = z.object({
    markdownContent: z.string(),
    linkedinTeaser: z.string(),
    xingSummary: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    slug: z.string(),
});

type ValidatedArticle = z.infer<typeof aiResponseSchema>;

// 2. JSON Schema für Gemini
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        markdownContent: { type: Type.STRING },
        linkedinTeaser: { type: Type.STRING },
        xingSummary: { type: Type.STRING },
        seoTitle: { type: Type.STRING },
        seoDescription: { type: Type.STRING },
        slug: { type: Type.STRING },
    },
    required: ['markdownContent', 'linkedinTeaser', 'xingSummary', 'seoTitle', 'seoDescription', 'slug'],
};

// 3. Robuste KI-Funktion
async function generateArticleContent(rawText: string): Promise<ValidatedArticle> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: rawText }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            systemInstruction: `Handle als erfahrener Content-Marketer und Copywriter.
            
            Aufgabe:
            Erstelle einen SEO-optimierten Fachartikel im Markdown-Format aus dem bereitgestellten Transkript.

            Anforderungen:
            - Zielgruppe: Fachpublikum (Entwickler, Data Scientists, Tech-affine Leser)
            - Tonalität: Professionell, sachlich, locker (kein steifes Deutsch)
            - Struktur: H1 (Titel), H2 (Kapitel), H3 (Unterkapitel), Bullet Points, Code-Beispiele
            - SEO: Relevante Keywords natürlich einbauen, keine Keyword-Stuffing
            - Formatierung: Markdown (keine HTML-Tags)
            - Länge: mindestens so viele Wörter wie im Transkript vorhanden sind
            
            Zusätzliche Outputs (halte dich dabei IMMER an die beschriebene Tonalität und Zielgruppe und gebe diese IMMER in der JSON zurück):
            - LinkedIn Teaser: Kurzer, knackiger Text (ca. 2-3 Sätze) für LinkedIn
            - Xing Summary: Etwas längere Zusammenfassung für Xing
            - SEO Title: Optimierter Titel für Suchmaschinen
            - SEO Description: Ein ansprechender Meta-Description-Text (max. 160 Zeichen)
            - Slug: URL-freundlicher Slug
            
            Wichtige Hinweise:
            - Achte auf korrekte Fachbegriffe
            - Erkläre komplexe Konzepte verständlich
            - Füge relevante Code-Beispiele ein, wenn es passt
            - Füge relevante Bilder ein, wenn es passt
            - Strukturiere den Text logisch und lesefreundlich
            - Vermeide Wiederholungen
            - Halte dich an die deutsche Sprache
            
            Input:
            {rawText}
            
            Output-Format (JSON):
            {
                "markdownContent": "...",
                "linkedinTeaser": "...",
                "xingSummary": "...",
                "seoTitle": "...",
                "seoDescription": "...",
                "slug": "..."
            }`
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
        const dbStart = performance.now();
        await prisma.article.update({
            where: { id: articleId },
            data: { processingStatus: 'PROCESSING' }
        });
        const initialDbTime = performance.now() - dbStart;
        console.log(`[Status Update] Set to PROCESSING in ${initialDbTime.toFixed(2)}ms`);

        let rawText = '';

        // --- Step 1: Extraction ---
        console.log(`\n⏳ [Step 1: Extraction] Starting ${type} text extraction...`);
        const extractionStart = performance.now();

        if (type === 'YOUTUBE') {
            const videoId = sourceUrl.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/)?.[1];
            if (!videoId) throw new Error('Ungültige YouTube URL');

            rawText = await new Promise<string>((resolve, reject) => {
                const scriptPath = path.join(__dirname, '../scripts/extract_transcript.py');
                const execStart = performance.now();
                exec(`python "${scriptPath}" "${videoId}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`[Extraction Error] Python script failed after ${(performance.now() - execStart).toFixed(2)}ms: ${stderr}`);
                        return reject(new Error(stderr));
                    }
                    const res = JSON.parse(stdout);
                    res.success ? resolve(res.text) : reject(new Error(res.error));
                });
            });
        } else if (type === 'MEDIUM') {
            rawText = await extractMediumContent(sourceUrl);
        }

        const extractionTime = performance.now() - extractionStart;
        console.log(`✅ [Step 1: Extraction] Completed in ${extractionTime.toFixed(2)}ms. Extracted ${rawText.length} characters.`);

        // --- Step 2: AI Generation ---
        console.log(`\n🧠 [Step 2: AI Generation] Sending content to Gemini...`);
        const generationStart = performance.now();
        const validatedData = await generateArticleContent(rawText);
        const generationTime = performance.now() - generationStart;

        console.log(`✅ [Step 2: AI Generation] Completed in ${generationTime.toFixed(2)}ms.`);

        // --- Step 3: Database Update ---
        console.log(`\n💾 [Step 3: DB Update] Saving results to database...`);
        const finalDbStart = performance.now();

        await prisma.article.update({
            where: { id: articleId },
            data: {
                markdownContent: validatedData.markdownContent,
                linkedinTeaser: validatedData.linkedinTeaser,
                xingSummary: validatedData.xingSummary,
                title: validatedData.seoTitle, // keep title as seoTitle for now
                seoTitle: validatedData.seoTitle,
                seoDescription: validatedData.seoDescription,
                slug: validatedData.slug,
                rawTranscript: rawText,
                processingStatus: 'COMPLETED'
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
    },
});