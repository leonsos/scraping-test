import * as cheerio from 'cheerio';
import { Logger } from './logger';

export interface DocumentoJurisprudencia {
    uuid: string;
    recurso: string;
    numeroExpediente: string;
    palabrasClave: string;
    pretensiones: string;
    normaDerechoInterno: string;
    tipoResolucion: string;
    fechaResolucion: string;
    sala: string;
    sumilla: string;
    pdfDescargado: boolean;
    rutaLocalPdf?: string;
    fechaExtraccion?: string;
}

export class ResultParser {
    /**
     * Limpia y des-escapa las entidades XML/HTML de un texto
     */
    public static htmlUnescape(str: string): string {
        return str
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&#x2F;/g, '/');
    }

    /**
     * Extrae el objeto dentro de "parameters" del onclick de RichFaces.
     * Utiliza una máquina de estados sencilla (braces stack) para soportar de manera robusta
     * comillas, escapes y caracteres impredecibles en el texto de sumilla.
     */
    public static extractParametersObject(onclickText: string): string | null {
        const target = 'parameters';
        const index = onclickText.indexOf(target);
        if (index === -1) return null;

        // Buscar la llave inicial '{' del objeto que sigue a la palabra clave "parameters"
        const braceStartIndex = onclickText.indexOf('{', index + target.length);
        if (braceStartIndex === -1) {
            return null;
        }

        let openBraces = 0;
        let inString = false;
        let stringChar = '';
        let escaped = false;
        let jsonStr = '';

        for (let i = braceStartIndex; i < onclickText.length; i++) {
            const char = onclickText[i];

            if (escaped) {
                escaped = false;
                jsonStr += char;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                jsonStr += char;
                continue;
            }

            if (inString) {
                if (char === stringChar) {
                    inString = false;
                }
                jsonStr += char;
                continue;
            }

            if (char === '"' || char === "'") {
                inString = true;
                stringChar = char;
                jsonStr += char;
                continue;
            }

            if (char === '{') {
                openBraces++;
            } else if (char === '}') {
                openBraces--;
                if (openBraces === 0) {
                    jsonStr += char;
                    break;
                }
            }
            jsonStr += char;
        }

        let clean = jsonStr;
        // Si el JSON viene con todas sus claves/valores escapados como \" (como en la respuesta real de RichFaces),
        // pero NO es el caso de un JSON normal donde sólo las comillas internas están escapadas.
        if (clean.trim().startsWith('{\\"')) {
            clean = clean.replace(/\\\\"/g, '§TEMP_QUOTE§');
            clean = clean.replace(/\\"/g, '"');
            clean = clean.replace(/§TEMP_QUOTE§/g, '\\"');
        }
        clean = clean.replace(/\\\\/g, '\\');

        return clean;
    }

    /**
     * Parsea el HTML de la tabla de resultados y extrae todos los documentos
     */
    public static parse(htmlString: string): DocumentoJurisprudencia[] {
        const $ = cheerio.load(htmlString);
        const documentos: DocumentoJurisprudencia[] = [];

        // Ubicamos todos los botones "Ver" que contienen la llamada RichFaces
        // Normalmente están representados por elementos con title="Ver"
        const verButtons = $('[title="Ver"]');

        Logger.info(`Analizando la página de resultados... Botones "Ver" encontrados: ${verButtons.length}`);

        verButtons.each((_, el) => {
            const onclickAttr = $(el).attr('onclick');
            if (!onclickAttr) return;

            try {
                // 1. Des-escapar entidades HTML comunes primero
                const unescapedOnclick = this.htmlUnescape(onclickAttr);

                // 2. Extraer el bloque del objeto de parámetros
                const jsonStr = this.extractParametersObject(unescapedOnclick);
                if (!jsonStr) {
                    Logger.warn('No se pudo extraer el bloque JSON-like del onclick del botón Ver.');
                    return;
                }

                // 3. Parsear el bloque de parámetros
                // Dado que la salida del servidor suele usar formato JSON válido para las propiedades:
                const params = JSON.parse(jsonStr);

                // Validar el UUID requerido
                if (!params.uuid) {
                    Logger.warn('Elemento omitido por falta de uuid en los parámetros.');
                    return;
                }

                // 4. Mapear al modelo DocumentoJurisprudencia
                const doc: DocumentoJurisprudencia = {
                    uuid: params.uuid,
                    recurso: params.recurso || '',
                    numeroExpediente: params.nroexp || '',
                    palabrasClave: params.palabras || '',
                    pretensiones: params.pretensiones || '',
                    normaDerechoInterno: params.normaDI || '',
                    tipoResolucion: params.tipoResolucion || '',
                    fechaResolucion: params.fechaResolucion || '',
                    sala: params.sala || '',
                    sumilla: params.sumilla || '',
                    pdfDescargado: false,
                    fechaExtraccion: new Date().toISOString(),
                };

                documentos.push(doc);
            } catch (err: any) {
                Logger.error('Fallo al parsear metadatos del botón onclick de la fila', err);
            }
        });

        Logger.info(`Mapeados con éxito ${documentos.length} documentos.`);
        return documentos;
    }
}
