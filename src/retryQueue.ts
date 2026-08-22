import fs from 'fs';
import path from 'path';
import { CONFIG } from './config';
import { Logger } from './logger';
import { DocumentoJurisprudencia } from './resultParser';

export interface ScraperState {
    currentPage: number;
    processedUuids: string[]; // UUIDs con PDF descargado exitosamente
    failedUuids: Record<
        string,
        {
            documento: DocumentoJurisprudencia;
            attempts: number;
            lastError: string;
            lastAttemptTime: string;
        }
    >; // UUIDs cuya descarga del PDF falló permanentemente
}

export class RetryQueue {
    private static stateFilePath = path.join(CONFIG.DATA_DIR, CONFIG.STATE_FILE);
    private static resultsFilePath = path.join(CONFIG.DATA_DIR, CONFIG.RESULTS_FILE);

    /**
     * Garantiza que la carpeta de datos exista
     */
    private static ensureDataDirExists(): void {
        if (!fs.existsSync(CONFIG.DATA_DIR)) {
            fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
        }
    }

    /**
     * Lee la persistencia de estado de ejecución
     */
    public static loadState(): ScraperState {
        this.ensureDataDirExists();
        if (!fs.existsSync(this.stateFilePath)) {
            return {
                currentPage: 1,
                processedUuids: [],
                failedUuids: {},
            };
        }

        try {
            const data = fs.readFileSync(this.stateFilePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            Logger.error('Error leyendo scraper_state.json. Utilizando estado vacío.', err);
            return {
                currentPage: 1,
                processedUuids: [],
                failedUuids: {},
            };
        }
    }

    /**
     * Guarda el estado del scraper en disco
     */
    public static saveState(state: ScraperState): void {
        this.ensureDataDirExists();
        try {
            fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2), 'utf8');
            Logger.debug('Estado de persistencia guardado en disco con éxito.');
        } catch (err) {
            Logger.error('Fallo escribiendo scraper_state.json', err);
        }
    }

    /**
     * Lee la base de datos de documentos extraídos
     */
    public static loadResults(): DocumentoJurisprudencia[] {
        this.ensureDataDirExists();
        if (!fs.existsSync(this.resultsFilePath)) {
            return [];
        }

        try {
            const data = fs.readFileSync(this.resultsFilePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            Logger.error('Error cargando documentos.json. Retornando array vacío.', err);
            return [];
        }
    }

    /**
     * Guarda la colección completa de resultados
     */
    public static saveResults(documentos: DocumentoJurisprudencia[]): void {
        this.ensureDataDirExists();
        try {
            fs.writeFileSync(this.resultsFilePath, JSON.stringify(documentos, null, 2), 'utf8');
            Logger.info(`Base de conocimientos actualizada con ${documentos.length} expedientes.`);
        } catch (err) {
            Logger.error('Error escribiendo documentos.json', err);
        }
    }

    /**
     * Mapea o actualiza un documento de manera incremental en base a su UUID
     */
    public static saveDocumentIncremental(doc: DocumentoJurisprudencia): void {
        const results = this.loadResults();
        const index = results.findIndex((r) => r.uuid === doc.uuid);

        if (index !== -1) {
            results[index] = doc;
        } else {
            results.push(doc);
        }

        this.saveResults(results);
    }

    /**
     * Registra la descarga exitosa de un archivo PDF
     */
    public static markSuccess(uuid: string): void {
        const state = this.loadState();

        // Eliminar de los fallos si estuviera registrado anteriormente
        if (state.failedUuids[uuid]) {
            delete state.failedUuids[uuid];
        }

        if (!state.processedUuids.includes(uuid)) {
            state.processedUuids.push(uuid);
        }

        this.saveState(state);
        Logger.debug(`UUID marcado como cargado exitosamente: ${uuid}`);
    }

    /**
     * Registra y persiste una falla crítica de descarga de PDF
     */
    public static markFailure(doc: DocumentoJurisprudencia, errorMsg: string): void {
        const state = this.loadState();
        const existing = state.failedUuids[doc.uuid];

        state.failedUuids[doc.uuid] = {
            documento: doc,
            attempts: existing ? existing.attempts + 1 : 1,
            lastError: errorMsg,
            lastAttemptTime: new Date().toISOString(),
        };

        this.saveState(state);
        Logger.warn(
            `PDF fallido: UUID: ${doc.uuid}. Error: "${errorMsg}". Intento acumulado: ${state.failedUuids[doc.uuid].attempts}`
        );
    }

    /**
     * Actualiza y persiste de forma aislada la página actual recorrida por el scraper
     */
    public static updateCurrentPage(pageNumber: number): void {
        const state = this.loadState();
        state.currentPage = pageNumber;
        this.saveState(state);
        Logger.debug(`Progreso de página guardado en disco: Página ${pageNumber}`);
    }
}
