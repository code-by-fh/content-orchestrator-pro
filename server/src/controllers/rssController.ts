import { Request, Response } from 'express';
import { generateRssFeed } from '../services/rss';

export const getRssFeed = async (req: Request, res: Response) => {
    try {
        const xml = await generateRssFeed();
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating feed');
    }
};
