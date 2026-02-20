import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { extractMediumContent } from './services/medium';
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

    try {
        // Status processing removed

        let rawText = '';

        // Extraktions-Logik
        if (type === 'YOUTUBE') {
            const videoId = sourceUrl.match(/(?:v=|\/)([\w-]{11})(?:\?|&|\/|$)/)?.[1];
            if (!videoId) throw new Error('Ungültige YouTube URL');

            rawText = await new Promise<string>((resolve, reject) => {
                const scriptPath = path.join(__dirname, '../scripts/extract_transcript.py');
                exec(`python "${scriptPath}" "${videoId}"`, (error, stdout, stderr) => {
                    if (error) return reject(new Error(stderr));
                    const res = JSON.parse(stdout);
                    res.success ? resolve(res.text) : reject(new Error(res.error));
                });
            });
        } else if (type === 'MEDIUM') {
            rawText = await extractMediumContent(sourceUrl);
        }

        // KI-Generierung (Wichtig: await benutzen!)
        const validatedData = await generateArticleContent(rawText);

        // Update Datenbank
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
                rawTranscript: rawText
            },
        });

    } catch (error: any) {
        console.error(`Job failed: ${error.message}`);
        console.error(`Status update to ERROR for ${articleId} removed due to schema change`);
        throw error;
    }
}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
    },
});