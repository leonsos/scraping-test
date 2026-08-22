import fs from 'fs';
import path from 'path';
import qs from 'qs';
import { HttpClient } from '../src/httpClient';
import { CONFIG } from '../src/config';
import { JsfSession } from '../src/jsfSession';
import { Search } from '../src/search';
import { XmlPartial } from '../src/xmlPartial';
import { Logger } from '../src/logger';

async function main() {
    Logger.info('Iniciando prueba de múltiples configuraciones de render para paginación...');

    const client = HttpClient.getInstance();
    const jar = HttpClient.getJar();

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

    // 1. Bootstrap y búsqueda
    await Search.bootstrap();
    await Search.executeSearch('la casa');

    const viewState = JsfSession.getViewState();
    Logger.info(`Búsqueda inicial ejecutada. ViewState: ${viewState}`);

    // Lista de valores para javax.faces.partial.render que queremos probar
    const renderOptions = [
        'formBuscador:panel formBuscador:data1',
        'formBuscador:panealJur formBuscador:data1',
        'formBuscador:panealJur',
        'formBuscador:panel',
        'formBuscador:repeat',
        'formBuscador:data1 @component',
        'formBuscador:panealJur @all'
    ];

    for (const renderVal of renderOptions) {
        Logger.info(`---------------------------------------`);
        Logger.info(`Probando renderVal: "${renderVal}"`);

        const body = {
            'formBuscador': 'formBuscador',
            'javax.faces.ViewState': viewState,
            'formBuscador:txtBusqueda': 'la casa',
            'formBuscador:buCorte': '1',
            'formBuscador:buDistrito': '0',
            'formBuscador:buEspecialidad': '0',
            'formBuscador:buPretensionValue': '',
            'formBuscador:buPretensionInput': '',
            'formBuscador:buPalabraClaveValue': '',
            'formBuscador:buPalabraClaveInput': '',
            'formBuscador:buNroExpediente': '',
            'formBuscador:buSala': '0',
            'formBuscador:buPretensionDelitoSupValue': '',
            'formBuscador:buPretensionDelitoSupInput': '',
            'formBuscador:buTipoRecurso': '0',
            'formBuscador:buTipoResolucion': '0',
            'formBuscador:buTipoResolucionInput': '-- Todos --',
            'formBuscador:buAnio': '',
            'formBuscador:buOrden': '21',
            'formBuscador:buOrdenForma': 'DESC',

            'javax.faces.source': 'formBuscador:data1',
            'javax.faces.partial.event': 'rich:datascroller:onscroll',
            'javax.faces.partial.execute': 'formBuscador:data1 @component',
            'javax.faces.partial.render': renderVal,
            'formBuscador:data1:page': '2',
            'org.richfaces.ajax.component': 'formBuscador:data1',
            'formBuscador:data1': 'formBuscador:data1',
            'AJAX:EVENTS_COUNT': '1',
            'javax.faces.partial.ajax': 'true',
        };

        try {
            const response = await client.post(CONFIG.RESULT_URL, qs.stringify(body), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'faces-request': 'partial/ajax',
                },
            });

            const { htmlMap } = XmlPartial.parse(response.data);
            const keys = Object.keys(htmlMap);
            Logger.info(`IDs actualizados en la respuesta XML: [${keys.join(', ')}]`);

            // Probar si contiene algún botón "Ver" en alguno de los fragmentos devueltos
            let verButtonsCount = 0;
            const cheerio = require('cheerio');
            for (const key of keys) {
                const fragmentHtml = htmlMap[key];
                const $ = cheerio.load(fragmentHtml);
                const buttons = $('[title="Ver"]');
                if (buttons.length > 0) {
                    verButtonsCount += buttons.length;
                    Logger.info(`¡ÉXITO! Encontrados ${buttons.length} botones "Ver" bajo la clave "${key}"`);
                }
            }

            if (verButtonsCount > 0) {
                Logger.info(`-> CONFIGURACIÓN EXITOSA: "${renderVal}"`);
                break; // Parar si encontramos una válida
            }
        } catch (e: any) {
            Logger.error(`Error con renderVal "${renderVal}":`, e.message);
        }
    }
}

main();
