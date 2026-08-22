import { Search } from './search';
import { RetryQueue } from './retryQueue';
import { Downloader } from './downloader';
import { Logger } from './logger';

/**
 * Sanitiza nombres de archivos para que sean válidos en el sistema operativo local
 */
function sanitizeFilename(filename: string): string {
    return filename.replace(/[/\\?%*:|"<>]/g, '_');
}

/**
 * Función principal de reintento de descargas fallidas
 */
async function run() {
    Logger.info('=== INICIANDO RETRY RUNNER (REPROCESANDO PDFS FALLIDOS) ===');

    try {
        const state = RetryQueue.loadState();
        const failedList = Object.values(state.failedUuids);

        if (failedList.length === 0) {
            Logger.info('No hay descargas fallidas registradas. Cola limpia de reintentos.');
            return;
        }

        Logger.info(`Se procesarán ${failedList.length} descargas fallidas del historial. Inicializando sesión...`);

        // Inicializar cookie jar y sesión fresca
        await Search.bootstrap();

        for (const item of failedList) {
            const doc = item.documento;
            Logger.info(`Reintentando expediente: ${doc.numeroExpediente} (Intentos previos: ${item.attempts})`);

            try {
                const safeExp = sanitizeFilename(doc.numeroExpediente || 'EXP');
                const safeFecha = sanitizeFilename(doc.fechaResolucion || 'FECHA');
                const shortUuid = doc.uuid.substring(0, 8);
                const filename = `${safeExp}_${safeFecha}_${shortUuid}.pdf`;

                const destPath = await Downloader.downloadPdf(doc.uuid, filename);

                // Guardar el estado de metadatos actualizado
                doc.pdfDescargado = true;
                doc.rutaLocalPdf = destPath;
                RetryQueue.saveDocumentIncremental(doc);

                // Marcar éxito remueve de failedUuids e ingresa en processedUuids
                RetryQueue.markSuccess(doc.uuid);
                Logger.info(`Reintento exitoso para PDF de expediente ${doc.numeroExpediente}.`);
            } catch (err: any) {
                Logger.error(`Reintento falló nuevamente para UUID: ${doc.uuid}`, err);
                // Volver a registrar el error incrementando intentos
                RetryQueue.markFailure(doc, err.message || err);
            }
        }

        Logger.info('=== PROCESO DE CONTROL DE REINTENTOS FINALIZADO ===');
    } catch (err: any) {
        Logger.error('Fallo fatal en el servicio de reintentos', err);
        process.exit(1);
    }
}

// Ejecutar si se invoca desde consola
if (require.main === module) {
    run();
}
