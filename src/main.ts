import { Search } from './search';
import { Pagination } from './pagination';
import { ResultParser } from './resultParser';
import { RetryQueue } from './retryQueue';
import { Downloader } from './downloader';
import { Logger } from './logger';
import { CONFIG } from './config';

/**
 * Sanitiza nombres de archivos para que sean válidos en el sistema operativo local
 */
function sanitizeFilename(filename: string): string {
    // Remplaza caracteres prohibidos en sistemas FAT/NTFS/Unix
    return filename.replace(/[/\\?%*:|"<>]/g, '_');
}

/**
 * Procesa y descarga metadatos + PDFs de una página HTML
 */
async function processPageResults(html: string): Promise<number> {
    const docs = ResultParser.parse(html);
    if (docs.length === 0) {
        return 0;
    }

    const state = RetryQueue.loadState();

    for (const doc of docs) {
        // 1. Guardar metadatos incrementalmente
        RetryQueue.saveDocumentIncremental(doc);

        // 2. Control de idempotencia
        if (state.processedUuids.includes(doc.uuid)) {
            Logger.info(`Idempotencia: PDF ya fue descargado previamente (UUID: ${doc.uuid}). Saltando.`);
            continue;
        }

        // 3. Descarga resiliente de PDF
        try {
            const safeExp = sanitizeFilename(doc.numeroExpediente || 'EXP');
            const safeFecha = sanitizeFilename(doc.fechaResolucion || 'FECHA');
            const shortUuid = doc.uuid.substring(0, 8);
            const filename = `${safeExp}_${safeFecha}_${shortUuid}.pdf`;

            const destPath = await Downloader.downloadPdf(doc.uuid, filename);

            // Actualizar resultado con el archivo mapeado
            doc.pdfDescargado = true;
            doc.rutaLocalPdf = destPath;
            RetryQueue.saveDocumentIncremental(doc);

            // Registrar descarga exitosa
            RetryQueue.markSuccess(doc.uuid);
        } catch (err: any) {
            Logger.error(`Error definitivo al descargar PDF de expediente: ${doc.numeroExpediente}`, err);
            // Persistir fallo en disco para ejecución posterior
            RetryQueue.markFailure(doc, err.message || err);
        }
    }

    return docs.length;
}

/**
 * Función principal
 */
async function run() {
    Logger.info('=== INICIANDO RUNNER PRINCIPAL DEL SCRAPER ===');

    try {
        // 1. Cargar el estado previo
        const state = RetryQueue.loadState();
        let currentPage = state.currentPage || 1;
        Logger.info(`Reanudando rastreo desde la página Nº: ${currentPage}`);

        // 2. Inicialización de sesión
        await Search.bootstrap();

        // 3. Búsqueda inicial
        let pageHtml = await Search.executeSearch(CONFIG.SEARCH_QUERY, CONFIG.SEARCH_CORTE);

        // Si la lectura guardada estaba en una página posterior a la 1, adelantar estado
        if (currentPage > 1) {
            Logger.info(`Navegando directamente a la página guardada en progreso: ${currentPage}`);
            pageHtml = await Pagination.goToPage(currentPage, CONFIG.SEARCH_QUERY, CONFIG.SEARCH_CORTE);
        }

        let active = true;
        let pagesProcessed = 0;
        while (active) {
            Logger.info(`\n--- FILTRANDO RESULTADOS PÁGINA ${currentPage} ---`);

            const count = await processPageResults(pageHtml);

            if (count === 0) {
                Logger.info(`No se encontraron registros en la página ${currentPage}. Proceso finalizado.`);
                active = false;
                break;
            }

            // Guardar el número de página completado
            RetryQueue.updateCurrentPage(currentPage);

            pagesProcessed++;
            if (CONFIG.MAX_PAGES && pagesProcessed >= CONFIG.MAX_PAGES) {
                Logger.info(`Límite configurado de páginas por sesión alcanzado (${CONFIG.MAX_PAGES}). Frenando ejecucion de manera ordenada.`);
                active = false;
                break;
            }

            // Avanzar de página utilizando AJAX de RichFaces
            const nextPage = currentPage + 1;
            Logger.info(`Saltando a la siguiente página (${nextPage}) mediante AJAX...`);

            try {
                pageHtml = await Pagination.goToPage(nextPage, CONFIG.SEARCH_QUERY, CONFIG.SEARCH_CORTE);
                currentPage = nextPage;
            } catch (err) {
                Logger.error(`No se pudo cargar la página ${nextPage}. Deteniendo barrido de páginas. Detalle:`, err);
                active = false;
            }
        }

        Logger.info('=== BARRIDO COMPLETO DE EXPEDIENTES EJECUTADO EN SU TOTALIDAD ===');
    } catch (err: any) {
        Logger.error('Error general durante la ejecución del scraper', err);
        process.exit(1);
    }
}

// Ejecutar si se invoca desde consola
if (require.main === module) {
    run();
}
