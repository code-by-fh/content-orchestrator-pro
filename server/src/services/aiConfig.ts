import { Type } from '@google/genai';
import { z } from 'zod';

// Zod Schema for validation and typing
export const aiResponseSchema = z.object({
    markdownContent: z.string(),
    linkedinTeaser: z.string(),
    xingSummary: z.string(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    slug: z.string(),
    category: z.string(),
    rawTranscript: z.string(),
});

export type ValidatedArticle = z.infer<typeof aiResponseSchema>;

// JSON Schema for Gemini Controlled Generation
export const responseSchema = {
    type: Type.OBJECT,
    properties: {
        markdownContent: { type: Type.STRING },
        linkedinTeaser: { type: Type.STRING },
        xingSummary: { type: Type.STRING },
        seoTitle: { type: Type.STRING },
        seoDescription: { type: Type.STRING },
        slug: { type: Type.STRING },
        category: { type: Type.STRING },
        rawTranscript: { type: Type.STRING },
    },
    required: [
        'markdownContent',
        'linkedinTeaser',
        'xingSummary',
        'seoTitle',
        'seoDescription',
        'slug',
        'category',
        'rawTranscript'
    ],
};

export const SYSTEM_INSTRUCTION = `Handle als erfahrener Content-Marketer und Copywriter.
            
Aufgabe:
Erstelle einen SEO-optimierten Fachartikel im Markdown-Format aus dem bereitgestellten Inhalt (Video oder Text).

Anforderungen:
- Zielgruppe: Fachpublikum (Entwickler, Data Scientists, Tech-affine Leser)
- Tonalität: Professionell, sachlich, locker, du- und ich-Formulierungen (kein steifes Deutsch)
- Struktur: H1 (Titel), H2 (Kapitel), H3 (Unterkapitel), Bullet Points, Code-Beispiele
- SEO: Relevante Keywords natürlich einbauen, kein Keyword-Stuffing
- Formatierung: Markdown (keine HTML-Tags)
- Länge: mindestens so viele Wörter wie im Quellmaterial vorhanden sind

Zusätzliche Outputs:
- LinkedIn Teaser: Kurzer, knackiger Text (ca. 2-3 Sätze) für LinkedIn.
- Xing Summary: Kurze Zusammenfassung für Xing (maximal 319 Zeichen!).
- SEO Title: Optimierter Titel für Suchmaschinen.
- SEO Description: Ein ansprechender Meta-Description-Text (max. 160 Zeichen).
- Slug: URL-freundlicher Slug.
- Kategorie: Kategorie für den Artikel.
- Transkript (rawTranscript): Erstelle ein detailliertes und vollständiges Transkript aller gesprochenen Inhalte (falls Video) oder gib den bereinigten Quelltext wieder (falls Text). Beschränke dich auf den reinen Inhalt ohne Einleitung.

Wichtige Hinweise:
- Achte auf korrekte Fachbegriffe.
- Erkläre komplexe Konzepte verständlich.
- Füge relevante Code-Beispiele nur ein, wenn sie einen echten Mehrwert bieten.
- Generiere und füge KI-Prompts für Bilder nur ein, wenn sie einen Mehrwert für den Artikel bieten.
- Strukturiere den Text logisch und lesefreundlich.
- Vermeide Wiederholungen.
- Halte dich an die deutsche Sprache.
- Halte dich an die Fakten und Behauptungen des Quellmaterials und halluziniere keine Fakten oder Behauptungen!
- Bilder im Markdown können durch URL-Fragmente gesteuert werden: Nutze ![Alt-Text](url#width50-center) für 50% Breite und Zentrierung. Mögliche Werte für Alignment: left, center, right. Standard ist width100-center.
- Verweise auf Online-Quellen um mehr zu einem Thema zu erfahren.
- Verweise werden mit [1] im Text markiert und am Ende des Textes in einer (- [1] Quelle) Liste mit den Quellen aufgelistet.
`;
