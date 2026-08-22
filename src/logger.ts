import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';

// Asegurar que exista la carpeta de datos
if (!fs.existsSync(CONFIG.DATA_DIR)) {
    fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
}

const logFile = path.join(CONFIG.DATA_DIR, 'scraper.log');

export class Logger {
    private static formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    public static info(message: string): void {
        const formatted = Logger.formatMessage('INFO', message);
        console.log(`\x1b[32m${formatted}\x1b[0m`); // Verde
        try {
            fs.appendFileSync(logFile, formatted + '\n');
        } catch { }
    }

    public static warn(message: string): void {
        const formatted = Logger.formatMessage('WARN', message);
        console.warn(`\x1b[33m${formatted}\x1b[0m`); // Amarillo
        try {
            fs.appendFileSync(logFile, formatted + '\n');
        } catch { }
    }

    public static error(message: string, error?: any): void {
        let errorMsg = message;
        if (error) {
            errorMsg += ` - ${error.stack || error.message || error}`;
        }
        const formatted = Logger.formatMessage('ERROR', errorMsg);
        console.error(`\x1b[31m${formatted}\x1b[0m`); // Rojo
        try {
            fs.appendFileSync(logFile, formatted + '\n');
        } catch { }
    }

    public static debug(message: string): void {
        const formatted = Logger.formatMessage('DEBUG', message);
        console.log(`\x1b[36m${formatted}\x1b[0m`); // Cian
        try {
            fs.appendFileSync(logFile, formatted + '\n');
        } catch { }
    }
}
