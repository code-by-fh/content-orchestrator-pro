const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const articles = await prisma.article.findMany({
        include: { publications: true }
    });
    console.log('Total articles:', articles.length);
    articles.forEach(a => {
        console.log(`- ${a.title} (${a.status})`);
        a.publications.forEach(p => {
            console.log(`  - ${p.platform}: ${p.status}`);
        });
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
