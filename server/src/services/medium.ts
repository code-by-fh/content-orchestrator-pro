import axios from 'axios';
import * as cheerio from 'cheerio';

export const extractMediumContent = async (url: string): Promise<string> => {
    try {
        // Transform URL to freedium
        const freediumUrl = `https://freedium-mirror.cfd/${url}`;

        // Fetch content
        const { data } = await axios.get(freediumUrl);

        // Parse HTML
        const $ = cheerio.load(data);

        // Specific logic for freedium structure (might need adjustment based on actual freedium response)
        // Assuming article content matches standard structure or trying to be generic
        // Freedium usually renders the medium content in a container.
        // Let's try to grab main content.

        // Remove unwanted elements
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('header').remove();
        $('footer').remove();

        // Extract text from body or specific container if known
        // Let's try generic body text for now, but usually it's in <article> or similar
        const content = $('body').text().replace(/\s+/g, ' ').trim();

        return content;
    } catch (error) {
        throw new Error('Failed to fetch Medium content');
    }
};
