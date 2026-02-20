import { Feed } from 'feed';
import MarkdownIt from 'markdown-it';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const md = new MarkdownIt();

export const generateRssFeed = async () => {
    const articles = await prisma.article.findMany({
        where: {
            publications: {
                some: { status: 'PUBLISHED' }
            }
        },
        include: {
            publications: {
                where: { status: 'PUBLISHED' },
                orderBy: { publishedAt: 'desc' },
                take: 1
            }
        },
        orderBy: { createdAt: 'desc' }, // Fallback sort, though ideally sorted by publication date
    });

    console.log(articles);
    const feed = new Feed({
        title: "Content Orchestrator Pro Feed",
        description: "Automated content derived from various sources.",
        id: "http://localhost:3000/", // Replace with actual domain
        link: "http://localhost:3000/",
        language: "en", // or de
        copyright: "All rights reserved 2026",
        updated: articles[0]?.publications[0]?.publishedAt || new Date(),
        generator: "Content Orchestrator Pro",
    });

    articles.forEach((article) => {
        const htmlContent = article.markdownContent ? md.render(article.markdownContent) : '';

        feed.addItem({
            title: article.title,
            id: article.id,
            link: `http://localhost:5173/articles/${article.id}`, // Link to frontend
            description: article.linkedinTeaser || article.title,
            content: htmlContent,
            date: article.publications[0]?.publishedAt || article.createdAt,
        });
    });

    return feed.rss2();
};
