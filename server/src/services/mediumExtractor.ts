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

        // Specific logic for freedium structure
        // Freedium usually renders the medium content in a container.

        // Remove unwanted elements
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('header').remove();
        $('footer').remove();

        // Extract text from body
        const content = $('body').text().replace(/\s+/g, ' ').trim();

        return content;
    } catch (error) {
        throw new Error('Failed to fetch Medium content');
    }
};
