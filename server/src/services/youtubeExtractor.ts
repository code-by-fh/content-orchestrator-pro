import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { aiResponseSchema, responseSchema, SYSTEM_INSTRUCTION, ValidatedArticle } from './aiConfig';
import logger from '../utils/logger';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractYoutubeTranscript(videoUrl: string): Promise<ValidatedArticle> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in the environment variables.");
    }

    const prompt = `Input:
Link zum YouTube Video: ${videoUrl}`;

    const ytVideo = {
        fileData: {
            fileUri: videoUrl,
            mimeType: 'video/mp4',
        },
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [ytVideo, { text: prompt }],
            config: {
                mediaResolution: 'MEDIA_RESOLUTION_LOW' as any,
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                systemInstruction: SYSTEM_INSTRUCTION,
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("AI hat keine Antwort zurückgegeben.");
        }

        const jsonData = JSON.parse(text);
        return aiResponseSchema.parse(jsonData);
    } catch (error: any) {
        logger.error(`[YouTube Extractor Error] Failed to process ${videoUrl}: ${error.message}`);
        throw new Error(`Fehler bei der Analyse des YouTube Videos: ${error.message || 'Unbekannter Fehler'}`);
    }
}
