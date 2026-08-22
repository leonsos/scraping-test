import path from 'path';

export const CONFIG = {
    // URLs PJ
    BASE_URL: process.env.BASE_URL || 'https://jurisprudencia.pj.gob.pe/jurisprudenciaweb',
    START_URL: '/faces/page/inicio.xhtml',
    RESULT_URL: '/faces/page/resultado.xhtml',
    DOWNLOAD_URL: '/ServletDescarga',

    // Colas y delays
    REQUEST_DELAY_MS: 1500, // Delay entre peticiones normales
    MAX_RETRIES: 5,
    BASE_BACKOFF_MS: 2000, // Multiplicador de backoff exponencial
    JITTER_MAX_MS: 500, // Jitter aleatorio

    // Rutas locales
    DATA_DIR: path.resolve(__dirname, '../data'),
    DOWNLOAD_DIR: path.resolve(__dirname, '../downloads'),
    STATE_FILE: 'scraper_state.json',
    RESULTS_FILE: 'documents.json',

    // Búsqueda por defecto
    SEARCH_QUERY: 'la casa',
};
