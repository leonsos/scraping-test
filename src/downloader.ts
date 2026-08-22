import fs from 'fs';
import path from 'path';
import { HttpClient } from './httpClient';
import { CONFIG } from './config';
import { Logger } from './logger';

export class Downloader {
    /**
     * Promesa de retardo común
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Escribe el stream de datos proveniente de Axios en un archivo local
     */
    private static saveStreamToFile(stream: any, filepath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(filepath);
            stream.pipe(writer);
            let error: any = null;

            writer.on('error', (err) => {
                error = err;
                writer.close();
                reject(err);
            });

            writer.on('close', () => {
                if (!error) {
                    resolve();
                }
            });
        });
    }

    /**
     * Descarga el PDF asociado al UUID con reintentos y backoff exponencial (resiliencia 429).
     */
    public static async downloadPdf(uuid: string, filename: string): Promise<string> {
        const client = HttpClient.getInstance();
        const url = `${CONFIG.DOWNLOAD_URL}?uuid=${uuid}`;
        const destPath = path.join(CONFIG.DOWNLOAD_DIR, filename);

        // Crear carpeta downloads si no existe
        if (!fs.existsSync(CONFIG.DOWNLOAD_DIR)) {
            fs.mkdirSync(CONFIG.DOWNLOAD_DIR, { recursive: true });
        }

        let attempt = 0;
        while (attempt < CONFIG.MAX_RETRIES) {
            try {
                Logger.info(`Iniciando descarga: ${filename} (Intento ${attempt + 1}/${CONFIG.MAX_RETRIES})`);

                const response = await client.get(url, {
                    responseType: 'stream',
                    // Permitir el código 429 para manejarlo preventivamente dentro de la función
                    validateStatus: (status) => status === 200 || status === 429
                });

                // Manejo del rate limiting (HTTP 429)
                if (response.status === 429) {
                    attempt++;
                    const backoff = CONFIG.BASE_BACKOFF_MS * Math.pow(2, attempt);
                    const jitter = Math.floor(Math.random() * CONFIG.JITTER_MAX_MS);
                    const sleepTime = backoff + jitter;

                    Logger.warn(`Recibido HTTP 429 (Too Many Requests). Reintentando en ${sleepTime}ms...`);
                    await this.sleep(sleepTime);
                    continue;
                }

                // Si fue exitoso, guardarlo
                await this.saveStreamToFile(response.data, destPath);
                Logger.info(`Archivo descargado con éxito: ${filename}`);
                return destPath;
            } catch (err: any) {
                attempt++;
                Logger.error(`Error de red/sistema durante descarga de UUID: ${uuid} (Intento ${attempt})`, err);

                if (attempt >= CONFIG.MAX_RETRIES) {
                    throw new Error(`Se superó el límite de reintentos (${CONFIG.MAX_RETRIES}) para la descarga del PDF.`);
                }

                // Pequeño retardo lineal para fallos imprevistos de red
                await this.sleep(CONFIG.BASE_BACKOFF_MS);
            }
        }

        throw new Error('Fallo de descarga indefinido.');
    }
}
