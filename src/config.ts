import path from 'path';

/**
 * Catálogo de Cortes del Poder Judicial de Perú
 */
export enum CorteJudicial {
    TODAS = '0',
    CORTE_SUPREMA = '1',
    AMAZONAS = '2',
    ANCASH = '3',
    APURIMAC = '4',
    AREQUIPA = '5',
    AYACUCHO = '6',
    CAJAMARCA = '7',
    CALLAO = '8',
    CUSCO = '9',
    HUANCAVELICA = '10',
    HUANUCO = '11',
    ICA = '12',
    JUNIN = '13',
    LA_LIBERTAD = '14',
    LAMBAYEQUE = '15',
    LIMA = '16',
    LIMA_ESTE = '17',
    LIMA_NORTE = '18',
    LIMA_SUR = '19',
    LORETO = '20',
    MADRE_DE_DIOS = '21',
    MOQUEGUA = '22',
    PASCO = '23',
    PIURA = '24',
    PUNO = '25',
    SAN_MARTIN = '26',
    TACNA = '27',
    TUMBES = '28',
    UCAYALI = '29',
    HUAURA = '30',
    CAÑETE = '31',
    SANTA = '32',
    CORTE_PENAL_NACIONAL = '33',
    SULLANA = '34',
    VENTANILLA = '35',
    SELVACENTRAL = '36',
    PUENTEPIEDRA_VENTANILLA = '37'
}

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
    SEARCH_CORTE: CorteJudicial.CORTE_SUPREMA,

    // Límite de ejecución para evaluación
    MAX_PAGES: 2, // Límite de páginas a procesar por ejecución para demostración rápida (0 o null para ilimitado)
};
