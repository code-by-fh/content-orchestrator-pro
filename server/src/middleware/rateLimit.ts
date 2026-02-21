import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const whitelistedDomains = [
    process.env.PUBLIC_ARTICLE_BASE_URL,
    ...(process.env.WHITELISTED_DOMAINS ? process.env.WHITELISTED_DOMAINS.split(',') : [])
].filter(Boolean) as string[];

const skipWhitelisted = (req: any) => {
    const origin = req.get('Origin') || req.get('Referer');
    if (!origin) return false;

    return whitelistedDomains.some(domain => {
        try {
            const domainUrl = new URL(domain);
            const originUrl = new URL(origin);
            return domainUrl.hostname === originUrl.hostname;
        } catch (e) {
            return origin.includes(domain);
        }
    });
};

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: skipWhitelisted,
});

export const rssLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    skip: skipWhitelisted,
});

export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 login requests per hour
    message: 'Too many login attempts from this IP, please try again after an hour',
});
