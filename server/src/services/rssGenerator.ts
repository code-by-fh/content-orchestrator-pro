import { Feed } from 'feed';
import MarkdownIt from 'markdown-it';
import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();
const md = new MarkdownIt();

export const generateRssFeed = async () => {
    const articles = await prisma.article.findMany({
        where: {
            publications: {
                some: {
                    platform: Platform.RSS,
                    status: 'PUBLISHED'
                }
            }
        },
        include: {
            publications: {
                where: {
                    platform: Platform.RSS,
                    status: 'PUBLISHED'
                },
                orderBy: { publishedAt: 'desc' },
                take: 1
            }
        },
        orderBy: { createdAt: 'desc' },
    });

    const feed = new Feed({
        title: "Content Orchestrator Pro Feed",
        description: "Automated content derived from various sources.",
        id: process.env.BACKEND_URL || "http://localhost:3003/",
        link: process.env.BACKEND_URL || "http://localhost:3003/",
        language: "en",
        copyright: "All rights reserved 2026",
        updated: articles[0]?.publications[0]?.publishedAt || new Date(),
        generator: "Content Orchestrator Pro",
    });

    articles.forEach((article) => {
        const htmlContent = article.markdownContent ? md.render(article.markdownContent) : '';

        const lang = (article.publications[0]?.language || 'de').toLowerCase();
        const baseUrl = process.env.PUBLIC_ARTICLE_BASE_URL || 'http://localhost:5173';
        const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        feed.addItem({
            title: article.title,
            id: article.id,
            link: `${formattedBaseUrl}/${lang}/blog/${article.slug}`,
            description: article.linkedinTeaser || article.title,
            content: htmlContent,
            date: article.publications[0]?.publishedAt || article.createdAt,
        });
    });

    return feed.rss2();
};
