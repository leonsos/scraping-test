import fs from 'fs';
import path from 'path';
import { HttpClient } from '../src/httpClient';
import { CONFIG } from '../src/config';
import { JsfSession } from '../src/jsfSession';
import { Search } from '../src/search';
import { Pagination } from '../src/pagination';
import { Logger } from '../src/logger';

async function main() {
    Logger.info('Iniciando prueba de paginación AJAX...');

    const client = HttpClient.getInstance();
    const jar = HttpClient.getJar();

    // Reutilizar el interceptor de cookies
    client.interceptors.request.use(async (config) => {
        let requestUrl = config.url || '';
        if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
            requestUrl = new URL(requestUrl, 'https://jurisprudencia.pj.gob.pe').toString();
        }
        const cookiesStr = await jar.getCookieString(requestUrl);
        if (cookiesStr) {
            config.headers = config.headers || {};
            config.headers['Cookie'] = cookiesStr;
        }
        return config;
    });

    // 1. Bootstrap
    await Search.bootstrap();

    // 2. Search
    const searchHtml = await Search.executeSearch('la casa');

    // Guardar ViewState actual
    const currentViewState = JsfSession.getViewState();
    Logger.info(`Búsqueda inicial ejecutada. ViewState: ${currentViewState}`);

    // Pruebas de paginación
    try {
        Logger.info('Intentando avanzar a la página 2...');
        const page2Html = await Pagination.goToPage(2, 'la casa');

        fs.writeFileSync(path.join(__dirname, '../data/page2_ajax.html'), page2Html, 'utf8');
        Logger.info('Fragmento HTML para página 2 guardado en data/page2_ajax.html');

        // Intentar parsear con Cheerio
        const cheerio = require('cheerio');
        const $ = cheerio.load(page2Html);
        const verButtons = $('[title="Ver"]');
        Logger.info(`Botones "Ver" encontrados en el fragmento de la página 2: ${verButtons.length}`);
    } catch (e: any) {
        Logger.error('Fallo en la prueba de paginación AJAX:', e);
    }
}

main();
