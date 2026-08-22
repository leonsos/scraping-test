import * as cheerio from 'cheerio';
import qs from 'qs';
import { HttpClient } from './httpClient';
import { CONFIG } from './config';
import { JsfSession } from './jsfSession';
import { Logger } from './logger';

export class Search {
    /**
     * Inicializa la sesión HTTP y extrae el ViewState inicial.
     */
    public static async bootstrap(): Promise<void> {
        Logger.info('Iniciando el bootstrap de la sesión JSF...');
        const client = HttpClient.getInstance();

        try {
            const response = await client.get(CONFIG.START_URL);
            const $ = cheerio.load(response.data);

            // El ViewState inicial suele estar en un campo oculto del formulario
            const viewState = $('input[name="javax.faces.ViewState"]').val();

            if (!viewState || typeof viewState !== 'string') {
                throw new Error('No se pudo encontrar el javax.faces.ViewState inicial en la página de inicio.');
            }

            JsfSession.setViewState(viewState);
            Logger.info('Sesión JSF inicializada con éxito.');
        } catch (err: any) {
            Logger.error('Fallo durante el bootstrap de sesión', err);
            throw err;
        }
    }

    /**
     * Envía la petición POST inicial de búsqueda y recupera el HTML de resultados.
     */
    public static async executeSearch(query: string = CONFIG.SEARCH_QUERY): Promise<string> {
        if (!JsfSession.hasViewState()) {
            await this.bootstrap();
        }

        Logger.info(`Ejecutando búsqueda inicial POST con término: "${query}"`);
        const client = HttpClient.getInstance();
        const viewState = JsfSession.getViewState();

        // Payload de búsqueda estructurado e idéntico al del navegador (Mojarra general search)
        const bodyObj: Record<string, string> = {
            'formBuscador': 'formBuscador',
            'javax.faces.ViewState': viewState,
            'formBuscador:tabpanel-value': 'general',
            'formBuscador:txtBusqueda': query,
            'formBuscador:buCorte': '1', // 1 representa a la Corte Suprema
            'formBuscador:buDistrito': '0',
            'formBuscador:buEspecialidad': '0',
            'formBuscador:buSala': '0',
            'formBuscador:buPretensionDelitoSupValue': '',
            'formBuscador:buPretensionDelitoSupInput': '',
            'formBuscador:buPretensionValue': '',
            'formBuscador:buPretensionInput': '',
            'formBuscador:buPalabraClaveValue': '',
            'formBuscador:buPalabraClaveInput': '',
            'formBuscador:buNroExpediente': '',
            'formBuscador:buAnio': '',

            // Mojarra General Search Button parameters
            'formBuscador:j_idt31': 'formBuscador:j_idt31',
            'forward': 'buscar',
            'busqueda': 'especializada',
            'formBuscador:j_idt34': '21',
            'formBuscador:j_idt35': 'DESC',
            'formBuscador:j_idt36': 'Principal',
            'formBuscador:j_idt37': '1'
        };

        try {
            // Hacemos el POST de búsqueda directamente a la página de inicio
            const targetUrl = CONFIG.BASE_URL + CONFIG.START_URL;
            const resSearch = await client.post(targetUrl, new URLSearchParams(bodyObj).toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400,
            });

            let finalHtml = '';
            if (resSearch.status === 302 && resSearch.headers.location) {
                let redirectUrl = resSearch.headers.location;
                Logger.info(`Redirección 302 detectada hacia: ${redirectUrl}`);

                // Forzar HTTPS si devuelve http
                if (redirectUrl.startsWith('http://')) {
                    redirectUrl = redirectUrl.replace('http://', 'https://');
                }

                // Seguir redirección con petición GET manual (las cookies se inyectan en el interceptor)
                const resRedirect = await client.get(redirectUrl);
                finalHtml = resRedirect.data;
            } else {
                finalHtml = resSearch.data;
            }

            const $ = cheerio.load(finalHtml);
            const nextViewState = $('input[name="javax.faces.ViewState"]').val();
            if (nextViewState && typeof nextViewState === 'string') {
                JsfSession.setViewState(nextViewState);
            } else {
                Logger.warn('No se detectó un campo ViewState en los resultados de la búsqueda.');
            }

            return finalHtml;
        } catch (err: any) {
            Logger.error(`Error al realizar búsqueda para "${query}"`, err);
            throw err;
        }
    }
}
