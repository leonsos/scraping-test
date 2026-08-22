import { XMLParser } from 'fast-xml-parser';
import { Logger } from './logger';
import { JsfSession } from './jsfSession';

export interface ParseResult {
    htmlMap: Record<string, string>; // Mapea id de update -> contenido HTML CDATA
    viewState?: string;
}

export class XmlPartial {
    /**
     * Parsea la respuesta XML parcial de RichFaces/JSF y extrae el HTML y el viewState
     */
    public static parse(xmlString: string): ParseResult {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseAttributeValue: false
        });

        const htmlMap: Record<string, string> = {};
        let viewState: string | undefined;

        try {
            const jsonObj = parser.parse(xmlString);

            const partialResponse = jsonObj['partial-response'];
            if (!partialResponse) {
                throw new Error('Estructura XML parcial inválida: Falta <partial-response>');
            }

            const changes = partialResponse.changes;
            if (!changes || !changes.update) {
                Logger.warn('No se encontraron bloques <update> en los cambios de JSF.');
                return { htmlMap };
            }

            // RichFaces puede retornar un objeto o un array de objetos <update>
            const updates = Array.isArray(changes.update) ? changes.update : [changes.update];

            for (const update of updates) {
                const id = update['@_id'];
                const content = update['#text'] || '';

                if (id) {
                    htmlMap[id] = content;
                    if (id === 'javax.faces.ViewState') {
                        viewState = content;
                        JsfSession.setViewState(content);
                    }
                }
            }
        } catch (err: any) {
            Logger.error('Error procesando XML partial-response de JSF', err);
            throw err;
        }

        return { htmlMap, viewState };
    }
}
