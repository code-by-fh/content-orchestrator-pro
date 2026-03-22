import axios from 'axios';
import * as cheerio from 'cheerio';

export const extractMediumContent = async (url: string): Promise<string> => {
    try {
        const freediumUrl = `https://freedium-mirror.cfd/${url}`;

        const { data } = await axios.get(freediumUrl, { timeout: 60000 });

        const $ = cheerio.load(data);

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
