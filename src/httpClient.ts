import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { CONFIG } from './config';
import { Logger } from './logger';

export class HttpClient {
    private static instance: AxiosInstance | null = null;
    private static cookieJar: CookieJar | null = null;

    public static getJar(): CookieJar {
        if (!this.cookieJar) {
            this.cookieJar = new CookieJar();
        }
        return this.cookieJar;
    }

    public static getInstance(): AxiosInstance {
        if (!this.instance) {
            const jar = this.getJar();

            const client = axios.create({
                baseURL: CONFIG.BASE_URL,
                jar,
                withCredentials: true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Pragma': 'no-cache'
                }
            });

            // Sanitizar cookies eliminando el atributo Secure para que el agente siempre las envíe
            client.interceptors.response.use((response) => {
                const setCookie = response.headers['set-cookie'];
                if (setCookie && Array.isArray(setCookie)) {
                    response.headers['set-cookie'] = setCookie.map(cookie =>
                        cookie.replace(/;\s*Secure\b/gi, '')
                    );
                }
                return response;
            }, (error) => {
                if (error && error.response) {
                    const setCookie = error.response.headers['set-cookie'];
                    if (setCookie && Array.isArray(setCookie)) {
                        error.response.headers['set-cookie'] = setCookie.map(cookie =>
                            cookie.replace(/;\s*Secure\b/gi, '')
                        );
                    }
                }
                return Promise.reject(error);
            });

            // Decorar el cliente de Axios con soporte para CookieJar
            this.instance = wrapper(client);

            // Interceptor para logger y delay preventivo de rate limiting
            this.instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
                // Convertir URL a absoluta si es relativa para asegurar compatibilidad de cookies
                if (config.url && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
                    const base = config.baseURL || CONFIG.BASE_URL;
                    config.url = base.replace(/\/+$/, '') + '/' + config.url.replace(/^\/+/, '');
                }

                Logger.debug(`Enviando ${config.method?.toUpperCase()} a ${config.url}`);
                Logger.debug(`Cabeceras salientes: ${JSON.stringify(config.headers)}`);
                // Delay dinámico preventivo para imitar tiempos de lectura humanos
                await new Promise((resolve) => setTimeout(resolve, CONFIG.REQUEST_DELAY_MS));
                return config;
            });
        }

        return this.instance;
    }

    public static resetSession(): void {
        this.instance = null;
        this.cookieJar = null;
        Logger.info('Sesión HTTP y cookies reiniciadas.');
    }
}
