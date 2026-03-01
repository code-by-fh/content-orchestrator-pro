import { PrismaClient, Article } from '@prisma/client';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Validation schema for the AI response
const translationResponseSchema = z.object({
    titleEn: z.string(),
    markdownContentEn: z.string(),
    linkedinTeaserEn: z.string(),
    xingSummaryEn: z.string(),
    seoTitleEn: z.string(),
    seoDescriptionEn: z.string(),
});

type TranslatedArticle = z.infer<typeof translationResponseSchema>;

// JSON schema for Gemini configuration
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        titleEn: { type: Type.STRING },
        markdownContentEn: { type: Type.STRING },
        linkedinTeaserEn: { type: Type.STRING },
        xingSummaryEn: { type: Type.STRING },
        seoTitleEn: { type: Type.STRING },
        seoDescriptionEn: { type: Type.STRING },
    },
    required: [
        'titleEn',
        'markdownContentEn',
        'linkedinTeaserEn',
        'xingSummaryEn',
        'seoTitleEn',
        'seoDescriptionEn',
    ],
};

/**
 * Translates an article's German content to English using the Gemini API.
 * The results are saved to the respective `*En` fields in the database.
 * 
 * @param articleId The ID of the article to translate
 * @returns The updated article with English fields populated
 */
export async function translateArticleToEnglish(articleId: string): Promise<Article> {
    const article = await prisma.article.findUnique({
        where: { id: articleId }
    });

    if (!article) {
        throw new Error(`Article with ID ${articleId} not found.`);
    }

    // Check if it's already translated
    if (article.markdownContentEn && article.titleEn && article.seoTitleEn) {
        return article;
    }

    logger.info(`\n🌍 [Translation] Starting EN translation for article: ${articleId}`);
    const translationStart = performance.now();

    // Prepare the input text containing all DE fields
    const inputText = `
    Title: ${article.title}
    SEO Title: ${article.seoTitle || ''}
    SEO Description: ${article.seoDescription || ''}
    LinkedIn Teaser: ${article.linkedinTeaser || ''}
    XING Summary: ${article.xingSummary || ''}
    
    Markdown Content:
    ${article.markdownContent || ''}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: inputText }] }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            systemInstruction: `You are an expert translator and content marketer.
            
            Task:
            Translate the provided German article content into professional, naturally flowing English. The target audience is tech professionals, developers, and data scientists.
            
            Requirements:
            - Maintain the professional yet engaging tone of the original German text.
            - Ensure all technical terms are correctly translated to their standard English equivalents.
            - Keep the exact same Markdown formatting (headers, lists, bolding, code blocks, links).
            - Do not add or remove any information.
            - Provide translations for all metadata fields (Title, SEO Title, SEO Description, LinkedIn Teaser, XING Summary) and the main Markdown Content.
            
            Output Format (JSON strictly matching the provided schema):
            {
                "titleEn": "...",
                "seoTitleEn": "...",
                "seoDescriptionEn": "...",
                "linkedinTeaserEn": "...",
                "xingSummaryEn": "...",
                "markdownContentEn": "..."
            }
            `
        }
    });

    const text = response.text;
    if (!text) {
        throw new Error("AI returned empty translation response");
    }

    // Parse and validate
    const jsonData = JSON.parse(text);
    const translatedData = translationResponseSchema.parse(jsonData);

    // Update database with translated fields
    const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
            titleEn: translatedData.titleEn,
            markdownContentEn: translatedData.markdownContentEn,
            linkedinTeaserEn: translatedData.linkedinTeaserEn,
            xingSummaryEn: translatedData.xingSummaryEn,
            seoTitleEn: translatedData.seoTitleEn,
            seoDescriptionEn: translatedData.seoDescriptionEn,
        }
    });

    const translationTime = performance.now() - translationStart;
    logger.info(`✅ [Translation] Completed EN translation for article ${articleId} in ${translationTime.toFixed(2)}ms.`);

    return updatedArticle;
}
