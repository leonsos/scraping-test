import fs from 'fs';
import path from 'path';
import { HttpClient } from '../src/httpClient';
import { JsfSession } from '../src/jsfSession';
import { Search } from '../src/search';
import { Logger } from '../src/logger';
import { CONFIG } from '../src/config';

async function main() {
    // Hookear https.request para ver las cabeceras reales que viajan por el socket TCP
    const https = require('https');
    const originalRequest = https.request;
    https.request = function (options: any, callback: any) {
        Logger.info(`[HTTPS SOCKET REQUEST] ${options.method} ${options.host || options.hostname}${options.path}`);
        Logger.info(`[HTTPS SOCKET HEADERS] ${JSON.stringify(options.headers || options.getHeaders?.() || {})}`);
        return originalRequest.apply(this, arguments);
    };

    try {
        Logger.info('Iniciando volcado de HTML de producción...');

        // 1. Session Bootstrap
        const client = HttpClient.getInstance();
        const jar = HttpClient.getJar();

        // Inyectar manualmente cookies del jar en las cabeceras de Axios
        client.interceptors.request.use(async (config) => {
            let requestUrl = config.url || '';
            if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
                requestUrl = new URL(requestUrl, 'https://jurisprudencia.pj.gob.pe').toString();
            }
            const cookiesStr = await jar.getCookieString(requestUrl);
            if (cookiesStr) {
                config.headers = config.headers || {};
                config.headers['Cookie'] = cookiesStr;
                Logger.info(`[MANUAL COOKIE INJECT] Inyectando: ${cookiesStr}`);
            }
            return config;
        });

        const initRes = await client.get('https://jurisprudencia.pj.gob.pe/jurisprudenciaweb/faces/page/inicio.xhtml');

        Logger.info(`Cabeceras de la respuesta GET inicial: ${JSON.stringify(initRes.headers)}`);

        // Imprimir cookies iniciales
        Logger.info(`Cookies después de GET inicial (JSON): ${JSON.stringify(jar.toJSON())}`);

        // Extraer ViewState
        const match = initRes.data.match(/id="javax\.faces\.ViewState"\s+value="([^"]+)"/);
        const viewState = match ? match[1] : '';
        JsfSession.setViewState(viewState);
        Logger.info(`Sesión cargada. ViewState inicial: ${viewState}`);

        // 2. Ejecutar búsqueda con "la casa" simulando el botón de búsqueda general en inicio.xhtml
        Logger.info(`Ejecutando búsqueda inicial POST con término: "la casa"`);
        const searchBodyObj: Record<string, string> = {
            'formBuscador': 'formBuscador',
            'javax.faces.ViewState': viewState,
            'formBuscador:tabpanel-value': 'general',
            'formBuscador:txtBusqueda': 'la casa',
            'formBuscador:buCorte': '1',
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

        const resSearch = await client.post('https://jurisprudencia.pj.gob.pe/jurisprudenciaweb/faces/page/inicio.xhtml', new URLSearchParams(searchBodyObj).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400
        });

        Logger.info(`Código de estado de la búsqueda: ${resSearch.status}`);
        Logger.info(`Cookies después de POST inicial: ${JSON.stringify(jar.getCookiesSync('https://jurisprudencia.pj.gob.pe/jurisprudenciaweb'))}`);
        Logger.info(`Headers de respuesta: ${JSON.stringify(resSearch.headers)}`);

        let searchHtml = '';
        if (resSearch.status === 302 && resSearch.headers.location) {
            let redirectUrl = resSearch.headers.location;
            Logger.info(`Redirección 302 detectada hacia: ${redirectUrl}`);

            // Forzar HTTPS si la URL devuelta es http://
            if (redirectUrl.startsWith('http://')) {
                redirectUrl = redirectUrl.replace('http://', 'https://');
                Logger.info(`Convertido a HTTPS: ${redirectUrl}`);
            }

            // Hacer el GET manual para seguir la redirección
            const resRedirect = await client.get(redirectUrl);
            Logger.info(`Cookies después de redirección GET: ${JSON.stringify(jar.getCookiesSync('https://jurisprudencia.pj.gob.pe/jurisprudenciaweb'))}`);
            searchHtml = resRedirect.data;
        } else {
            searchHtml = resSearch.data;
        }

        // 3. Escribir a disco
        const dest = path.join(__dirname, '../data/dump_real.html');
        fs.writeFileSync(dest, searchHtml, 'utf8');
        Logger.info(`HTML Real guardado con éxito en: ${dest}`);

        // Guardar el nuevo ViewState en sesión para propósitos del log
        const cheerio = require('cheerio');
        const $ = cheerio.load(searchHtml);
        const nextViewState = $('input[name="javax.faces.ViewState"]').val();
        Logger.info(`Nuevo ViewState después de búsqueda: ${nextViewState}`);
    } catch (err: any) {
        Logger.error('Error durante el volcado de HTML', err);
    }
}

main();
