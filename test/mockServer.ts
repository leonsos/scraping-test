import express from 'express';
import { Logger } from '../src/logger';

const app = express();
const PORT = 3000;

// Middleware para parsear cabeceras urlencoded y json
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Registro de intentos de descargas por UUID para simular 429 selectivos
const downloadAttempts: Record<string, number> = {};

// Loguear peticiones en consola
app.use((req, res, next) => {
    Logger.debug(`[MOCK SERVER] Recibida petición: ${req.method} ${req.url}`);
    next();
});

const router = express.Router();

/**
 * 1. GET inicio.xhtml (Bootstrap)
 */
router.get('/faces/page/inicio.xhtml', (req, res) => {
    res.setHeader('Set-Cookie', 'JSESSIONID=MOCK-SESSION-ID-100200300; Path=/; HttpOnly');
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock Inicio - Poder Judicial</title>
    </head>
    <body>
      <h1>Consulta de Jurisprudencia</h1>
      <form id="formBuscador" method="POST" action="/jurisprudenciaweb/faces/page/resultado.xhtml">
        <input type="text" name="formBuscador:txtBusqueda" value="" />
        <input type="hidden" name="javax.faces.ViewState" value="mock-initial-viewstate-11111" />
        <input type="submit" value="Buscar" />
      </form>
    </body>
    </html>
  `);
});

/**
 * 2. POST resultado.xhtml (Búsqueda inicial y Paginación AJAX)
 */
router.post('/faces/page/resultado.xhtml', (req, res) => {
    const isAjax = req.headers['faces-request'] === 'partial/ajax' || req.body['javax.faces.partial.ajax'] === 'true';
    const query = req.body['formBuscador:txtBusqueda'] || '';
    const viewStateEnviado = req.body['javax.faces.ViewState'] || '';

    Logger.debug(`[MOCK SERVER] Petición del buscador - AJAX: ${isAjax}, Query: "${query}", ViewState: "${viewStateEnviado}"`);

    if (!isAjax) {
        // POST Inicial: Retorna la página HTML completa con dos registros
        res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mock Resultados - Poder Judicial</title>
      </head>
      <body>
        <h1>Jurisprudencia para: ${query}</h1>
        <form id="formBuscador">
          <input type="hidden" name="javax.faces.ViewState" value="mock-search-viewstate-22222" />
          
          <div id="formBuscador:data1">
            <table>
              <thead>
                <tr><th>Acción</th><th>Expediente</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <button type="button" title="Ver" onclick="RichFaces.ajax('formBuscador:data1:0:j_id73',event,{&quot;parameters&quot;:{&quot;recurso&quot;:&quot;RECURSO DE NULIDAD&quot;,&quot;uuid&quot;:&quot;mock-uuid-p1-r1&quot;,&quot;nroexp&quot;:&quot;EXP-001-2026&quot;,&quot;palabras&quot;:&quot;casa, robo&quot;,&quot;pretensiones&quot;:&quot;penal&quot;,&quot;normaDI&quot;:&quot;codigo-penal&quot;,&quot;tipoResolucion&quot;:&quot;SENTENCIA&quot;,&quot;fechaResolucion&quot;:&quot;2026-08-20&quot;,&quot;sala&quot;:&quot;SALA PENAL TRANSITORIA&quot;,&quot;sumilla&quot;:&quot;Se ratifica la condena por robo agravado cometido en la casa de la victima.&quot;},&quot;similarityGroupingId&quot;:&quot;formBuscador:data1:0:j_id73&quot;})">Ver</button>
                  </td>
                  <td>EXP-001-2026</td>
                </tr>
                <tr>
                  <td>
                    <button type="button" title="Ver" onclick="RichFaces.ajax('formBuscador:data1:1:j_id73',event,{&quot;parameters&quot;:{&quot;recurso&quot;:&quot;CASACION CIVIL&quot;,&quot;uuid&quot;:&quot;mock-uuid-p1-r2-fail&quot;,&quot;nroexp&quot;:&quot;EXP-002-2026-FAIL&quot;,&quot;palabras&quot;:&quot;casa, alquiler&quot;,&quot;pretensiones&quot;:&quot;civil&quot;,&quot;normaDI&quot;:&quot;codigo-civil&quot;,&quot;tipoResolucion&quot;:&quot;AUTO&quot;,&quot;fechaResolucion&quot;:&quot;2026-08-21&quot;,&quot;sala&quot;:&quot;SALA CIVIL PERMANENTE&quot;,&quot;sumilla&quot;:&quot;Conflicto de intereses por el desalojo de la casa alquilada.&quot;},&quot;similarityGroupingId&quot;:&quot;formBuscador:data1:1:j_id73&quot;})">Ver</button>
                  </td>
                  <td>EXP-002-2026-FAIL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </form>
      </body>
      </html>
    `);
    } else {
        // Petición AJAX (Paginación)
        const pageRequested = parseInt(req.body['formBuscador:data1:page'] || '1', 10);
        Logger.debug(`[MOCK SERVER] Paginación de página solicitada: ${pageRequested}`);

        res.setHeader('Content-Type', 'text/xml;charset=UTF-8');

        if (pageRequested === 2) {
            // Retorna resultados para la página 2
            res.send(`<?xml version='1.0' encoding='UTF-8'?>
<partial-response>
  <changes>
    <update id="formBuscador:data1"><![CDATA[
      <table>
        <tbody>
          <tr>
            <td>
              <button type="button" title="Ver" onclick="RichFaces.ajax('formBuscador:data1:0:j_id73',event,{&quot;parameters&quot;:{&quot;recurso&quot;:&quot;APELACION LABORAL&quot;,&quot;uuid&quot;:&quot;mock-uuid-p2-r1&quot;,&quot;nroexp&quot;:&quot;EXP-003-2026&quot;,&quot;palabras&quot;:&quot;casa, trabajo&quot;,&quot;pretensiones&quot;:&quot;laboral&quot;,&quot;normaDI&quot;:&quot;convenio&quot;,&quot;tipoResolucion&quot;:&quot;SENTENCIA&quot;,&quot;fechaResolucion&quot;:&quot;2026-08-22&quot;,&quot;sala&quot;:&quot;SALA DE DERECHO SOCIAL&quot;,&quot;sumilla&quot;:&quot;Juicio por reintegro de beneficios laborales desarrollado en la casa del empleador.&quot;},&quot;similarityGroupingId&quot;:&quot;formBuscador:data1:0:j_id73&quot;})">Ver</button>
            </td>
            <td>EXP-003-2026</td>
          </tr>
        </tbody>
      </table>
    ]]></update>
    <update id="javax.faces.ViewState"><![CDATA[mock-ajax-viewstate-33333]]></update>
  </changes>
</partial-response>`);
        } else {
            // Página 3 en adelante: No hay más resultados (detiene el scraper)
            res.send(`<?xml version='1.0' encoding='UTF-8'?>
<partial-response>
  <changes>
    <update id="formBuscador:data1"><![CDATA[
      <div class="rf-dst-no-data">No se encontraron registros.</div>
    ]]></update>
    <update id="javax.faces.ViewState"><![CDATA[mock-ajax-viewstate-empty-44444]]></update>
  </changes>
</partial-response>`);
        }
    }
});

/**
 * 3. GET /ServletDescarga (Descarga de PDF con simulación de 429)
 */
router.get('/ServletDescarga', (req, res) => {
    const uuid = (req.query.uuid as string) || '';

    if (!uuid) {
        res.status(400).send('Falta parámetro uuid.');
        return;
    }

    // Inicializar intentos si no existe
    if (downloadAttempts[uuid] === undefined) {
        downloadAttempts[uuid] = 0;
    }

    downloadAttempts[uuid]++;
    const attempt = downloadAttempts[uuid];

    // Caso especial: El UUID 'mock-uuid-p1-r2-fail' siempre falla para validar la cola de fallidos persistida.
    if (uuid === 'mock-uuid-p1-r2-fail') {
        Logger.debug(`[MOCK SERVER] Descarga de UUID ${uuid} fallará permanentemente con HTTP 429 para pruebas de reintentos.`);
        res.status(429).send('Rate limit exceeded (Simulado Permanente para control de fallos).');
        return;
    }

    // Comportamiento normal: las primeras 2 descargas fallan con 429, la 3ra tiene éxito
    if (attempt < 3) {
        Logger.debug(`[MOCK SERVER] Descarga de UUID ${uuid} fallando a propósito (Intento ${attempt}). Enviando HTTP 429.`);
        res.status(429).send('Rate limit exceeded (Simulado temporal para lógica de Backoff).');
    } else {
        Logger.debug(`[MOCK SERVER] Descarga de UUID ${uuid} aceptada (Intento ${attempt}). Enviando PDF.`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${uuid}.pdf"`);

        // Generar un PDF ficticio mínimo para escribirlo a disco
        res.send(Buffer.from('%PDF-1.4 ... MOCK PDF BINARY DATA ... %EOF'));
    }
});

// Enrutar todo bajo el prefijo
app.use('/jurisprudenciaweb', router);

// Levantar el servidor
app.listen(PORT, () => {
    Logger.info(`=== SERVIDOR MOCK INICIADO EN EL PUERTO ${PORT} ===`);
    Logger.info(`Para ejecutar el scraper contra el mock, usa: BASE_URL=http://localhost:${PORT}/jurisprudenciaweb npm run dev`);
});
