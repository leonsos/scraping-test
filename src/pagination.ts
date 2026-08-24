import qs from 'qs';
import { HttpClient } from './httpClient';
import { CONFIG, CorteJudicial } from './config';
import { JsfSession } from './jsfSession';
import { XmlPartial } from './xmlPartial';
import { Logger } from './logger';

export class Pagination {
    /**
     * Cambia a una página de resultados específica usando la solicitud AJAX de RichFaces.
     * Retorna el HTML del fragmento de la tabla de resultados.
     */
    public static async goToPage(
        pageNumber: number,
        query: string = CONFIG.SEARCH_QUERY,
        corte: CorteJudicial = CONFIG.SEARCH_CORTE
    ): Promise<string> {
        Logger.info(`Navegando hacia la página de resultados: ${pageNumber}`);
        const client = HttpClient.getInstance();
        const viewState = JsfSession.getViewState();

        // Payload de RichFaces 4.x para eventos de datascroller onscroll
        const body = {
            'formBuscador': 'formBuscador',
            'javax.faces.ViewState': viewState,
            'formBuscador:txtBusqueda': query,
            'formBuscador:buCorte': corte,
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

            // Parámetros obligatorios de RichFaces AJAX
            'javax.faces.source': 'formBuscador:data1',
            'javax.faces.partial.event': 'rich:datascroller:onscroll',
            'javax.faces.partial.execute': 'formBuscador:data1 @component',
            'javax.faces.partial.render': 'formBuscador:panel formBuscador:data1',
            'formBuscador:data1:page': pageNumber.toString(),
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

            // El servidor retorna XML parcial
            const { htmlMap } = XmlPartial.parse(response.data);

            // Intentar obtener el fragmento de la tabla, priorizando el panel que contiene los registros
            let tableHtml = htmlMap['formBuscador:panel'] || htmlMap['formBuscador:data1'];

            if (!tableHtml) {
                // Fallback: Buscar otra clave del panel actualizada
                const key = Object.keys(htmlMap).find((k) => k.startsWith('formBuscador'));
                if (key) {
                    tableHtml = htmlMap[key];
                }
            }

            if (!tableHtml) {
                throw new Error(
                    `La respuesta AJAX de JSF no contenía el HTML del panel de resultados. IDs actualizados: ${Object.keys(
                        htmlMap
                    ).join(', ')}`
                );
            }

            return tableHtml;
        } catch (err: any) {
            Logger.error(`Error navegando a la página de resultados ${pageNumber}`, err);
            throw err;
        }
    }
}
