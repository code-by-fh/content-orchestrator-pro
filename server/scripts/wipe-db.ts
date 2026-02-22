import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database wipe...');

    try {
        // Delete in order of dependencies
        const deletePublications = prisma.publication.deleteMany();
        const deleteArticles = prisma.article.deleteMany();
        const deleteUsers = prisma.user.deleteMany();

        // Execute sequentially or in transaction
        await prisma.$transaction([
            deletePublications,
            deleteArticles,
            deleteUsers,
        ]);

        console.log('Database wiped successfully.');
    } catch (error) {
        console.error('Error wiping database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
