const { generateRssFeed } = require('./src/services/rss');
const { PrismaClient } = require('@prisma/client');

async function test() {
    try {
        const xml = await generateRssFeed();
        console.log('XML Length:', xml.length);
        console.log('XML Content Preview:', xml.substring(0, 500));

        const itemCount = (xml.match(/<item>/g) || []).length;
        console.log('Item count in XML:', itemCount);
    } catch (e) {
        console.error('FAILED:', e);
    }
}

test().catch(console.error);
