import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

// Define the log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        // Mask sensitive data (this is a basic example, adapt to your specific keys)
        const maskSensitive = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return obj;

            const masked = { ...obj };
            const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'gemini', 'auth'];

            for (const key in masked) {
                if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
                    masked[key] = '***MASKED***';
                } else if (typeof masked[key] === 'object') {
                    masked[key] = maskSensitive(masked[key]);
                }
            }
            return masked;
        };

        let metaString = '';
        if (Object.keys(meta).length > 0) {
            metaString = `\n${JSON.stringify(maskSensitive(meta), null, 2)}`;
        }

        return `${timestamp} [${level.toUpperCase()}]: ${message} ${stack || ''} ${metaString}`;
    })
);

// Configure the daily rotate file transport
const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs', 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '3d', // Retain logs for 3 days
    level: 'info', // Adjust as needed
});

// Configure the console transport
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        logFormat
    ),
    level: 'debug', // Adjust for local development
});

// Create the logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        consoleTransport,
        fileRotateTransport,
    ],
});

export default logger;
