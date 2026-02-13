import axios from 'axios';
import { Article } from '@prisma/client';

// Interface für die Credentials
export interface XingCredentials {
    loginCookie: string;
    csrfToken: string;
    csrfChecksum: string;
    proxy?: {
        host: string;
        port: number;
        auth?: { username: string; password: string };
    };
}

/**
 * Hilfsfunktion: Extrahiert die Xing User ID aus dem Login-Cookie.
 */
function extractXingUserId(loginCookieValue: string): string | null {
    try {
        // Versuch 1: Cookie Value direkt prüfen
        if (loginCookieValue.includes('#')) {
            return loginCookieValue.split('#')[0];
        }

        // Versuch 2: Base64 Decode
        const decoded = Buffer.from(loginCookieValue, 'base64').toString('utf-8');
        if (decoded.includes('#')) {
            return decoded.split('#')[0];
        }

        const match = decoded.match(/^(\d+)/);
        return match ? match[1] : null;

    } catch (e) {
        console.error('[Xing] Failed to extract User ID from cookie', e);
        return null;
    }
}

export const postToXing = async (article: Article, credentials: XingCredentials) => {
    console.log(`[Xing] Preparing to post article: ${article.title}`);

    if (!article.xingSummary) {
        console.warn(`[Xing] No summary provided for article ${article.id}. Skipping.`);
        return false;
    }

    // 2. User ID aus dem Cookie extrahieren
    const userId = extractXingUserId(credentials.loginCookie);
    if (!userId) {
        throw new Error('[Xing] Could not extract User ID from Login Cookie. Session might be invalid.');
    }

    // 3. Request Header zusammenbauen
    // Wir bauen den kompletten Cookie-String zusammen, den Xing erwartet
    const cookieHeader = [
        `login=${credentials.loginCookie}`,
        `xing_csrf_token=${credentials.csrfToken}`,
        `xing_csrf_checksum=${credentials.csrfChecksum}`,
    ].join('; ');

    // 4. GraphQL Payload konstruieren
    // Xing nutzt "URNs" für IDs. Format: surn:x-xing:users:user:<ID>
    const actorUrn = `surn:x-xing:users:user:${userId}`;
    const audienceUrn = `surn:x-xing:contacts:network:${userId}`; // Sichtbarkeit: Mein Netzwerk

    const graphqlData = {
        operationName: "CommboxCreatePosting",
        variables: {
            actorGlobalId: actorUrn,
            comment: "", // Das Feld 'comment' bleibt oft leer, Text kommt in 'commentArticleV1'
            commentArticleV1: [
                {
                    articleParagraph: {
                        text: article.xingSummary
                    }
                }
            ],
            // Optional: Link hinzufügen, falls sourceUrl existiert
            links: article.sourceUrl ? [{
                url: article.sourceUrl,
                // Xing holt sich Titel/Bild normalerweise automatisch via Scraper
            }] : null,
            images: null, // Bilder müssten erst separat hochgeladen werden (komplexerer Flow)
            videos: null,
            polls: null,
            publicationStrategy: "NOW",
            visibility: "PUBLIC", // Oder "NETWORK_ONLY"
            audience: [audienceUrn]
        },
        query: `
            mutation CommboxCreatePosting($actorGlobalId: GlobalID!, $audience: [GlobalID!], $comment: String!, $commentArticleV1: [ArticlesCreateArticleBlocksInput!], $images: [PostingsCreateImageAttachmentInput!], $polls: [PostingsCreatePollAttachmentInput!], $links: [PostingsCreateLinkAttachmentInput!], $publicationStrategy: PostingPublicationStrategy, $publishAt: Date, $videos: [PostingsCreateVideoAttachmentInput!], $visibility: PostingsVisibility) {
                postingsCreatePosting(
                    input: {actorGlobalId: $actorGlobalId, audience: $audience, comment: $comment, commentArticleV1: $commentArticleV1, images: $images, links: $links, polls: $polls, publicationStrategy: $publicationStrategy, publishAt: $publishAt, videos: $videos, visibility: $visibility}
                ) {
                    success {
                        globalId
                        activityId
                        visibility
                        __typename
                    }
                    error {
                        message
                        details
                        __typename
                    }
                    __typename
                }
            }
        `
    };

    try {
        const response = await axios.post('https://www.xing.com/graphql/api', graphqlData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'Accept-Language': 'de',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://www.xing.com',
                'Referer': 'https://www.xing.com/discover/your-posts',
                // WICHTIG: Token muss im Header UND im Cookie sein
                'x-csrf-token': credentials.csrfToken,
                'Cookie': cookieHeader
            },
            // Falls du Proxy-Support brauchst:
            proxy: credentials.proxy ? {
                host: credentials.proxy.host,
                port: credentials.proxy.port,
                auth: credentials.proxy.auth
            } : false
        });

        // 5. Response prüfen
        const data = response.data;

        // Prüfen auf GraphQL Fehler (z.B. Syntax)
        if (data.errors) {
            console.error('[Xing] GraphQL Error:', JSON.stringify(data.errors));
            return false;
        }

        // Prüfen auf Xing-spezifische Fehler im Success-Objekt
        const result = data.data?.postingsCreatePosting;
        if (result?.error) {
            console.error('[Xing] Posting Error:', result.error.message, result.error.details);

            // Check auf Session Expiry
            if (result.error.message.includes('Auth') || result.error.message.includes('Session')) {
                console.error('[Xing] SESSION EXPIRED! Bitte Cookies erneuern.');
            }
            return false;
        }

        if (result?.success) {
            console.log(`[Xing] Successfully posted! Activity ID: ${result.success.activityId}`);
            return true;
        }

        return false;

    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 302) {
                console.error('[Xing] Request was redirected (302). Session is likely invalid/expired.');
            } else {
                console.error(`[Xing] HTTP Error: ${error.response?.status} - ${error.response?.statusText}`);
                console.error('Details:', error.response?.data);
            }
        } else {
            console.error('[Xing] Unknown Error:', error);
        }
        return false;
    }
};

export const deleteFromXing = async (article: Article, credentials: XingCredentials) => {
    // Hinweis: Löschen erfordert die ActivityID, die man beim Erstellen zurückbekommt.
    // Diese müsste idealerweise am Artikel in der DB gespeichert werden.
    console.log(`[Xing] Delete logic not implemented yet for ${article.title}`);
    return true;
};