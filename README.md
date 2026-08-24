# Stateful JSF/RichFaces Jurisprudence Scraper (Poder Judicial del Perú)

Este proyecto es un Web Scraper desarrollado en **TypeScript** y **Node.js** diseñado específicamente para extraer resoluciones judiciales del portal de jurisprudencia del Poder Judicial del Perú.

El scraper interactúa directamente con el protocolo HTTP stateful de JSF (JavaServer Faces) y RichFaces 4.x, simulando el comportamiento de un navegador real sin la sobrecarga de memoria de navegadores de automatización (como Puppeteer o Playwright).

---

## 🇪🇸 ESPAÑOL - DOCUMENTACIÓN DE LA SOLUCIÓN

### Características Principales
1. **Manejo de Protocolo Stateful:** Sincronización automática de `JSESSIONID` y el campo oculto `javax.faces.ViewState` a lo largo del flujo.
2. **Paginación AJAX (RichFaces XML):** Interpretación de respuestas XML parciales de RichFaces enviando las cabeceras AJAX correspondientes (`faces-request: partial/ajax`).
3. **Decodificación de Metadatos onclick:** Extracción de la metadata estructurada embebida en la llamada a JavaScript del botón "Ver", evitando parseos HTML frágiles.
4. **Resiliencia ante Bloqueos (Rate Limiting 429):** Mecanismo de reintentos automáticos con **Backoff Exponencial y Jitter** para superar los bloqueos temporales del WAF.
5. **Idempotencia y Persistencia:** Guardado incremental de la metadata en `documents.json` y el progreso en `scraper_state.json` para no repetir trabajo.
6. **Cola de Reintentos de Fallas (retryFailed):** Entrypoint independiente para reintentar la descarga de PDFs fallidos mediante un simple script offline.
7. **Servidor Mock & Tests locales:** Servidor Express que emula respuestas JSF y errores 429 para validación completa sin VPN.

### Estructura del Código
* `src/config.ts`: Constantes de URLs, rutas físicas y parámetros de reintentos y delays.
* `src/logger.ts`: Sistema de logs con colores ANSI en consola y persistencia en `data/scraper.log`.
* `src/jsfSession.ts`: Almacén y administrador central del token dinámico `ViewState`.
* `src/httpClient.ts`: Cliente HTTP configurado con CookieJar (`axios-cookiejar-support` y `tough-cookie`) y un delay prudencial anti-bloqueo.
* `src/xmlPartial.ts`: Parser XML que procesa respuestas asíncronas de RichFaces e identifica actualizaciones de HTML y ViewState.
* `src/resultParser.ts`: Analizador léxico robusto que lee la sumilla y metadata del parámetro `onclick` mediante pilas de llaves.
* `src/search.ts`: Realiza el bootstrap en `inicio.xhtml` y el envío inicial del formulario de búsqueda de forma secuencial.
* `src/pagination.ts`: Habilita la navegación asíncrona hacia las páginas de resultados.
* `src/downloader.ts`: Módulo de descargas de PDFs con Exponential Backoff + Jitter.
* `src/retryQueue.ts`: Capa de persistencia en disco que resguarda el progreso en JSON.
* `src/main.ts`: Orquestador principal del raspado por páginas.
* `src/retryFailed.ts`: Orquestador de reintentos para la descarga de PDFs registrados como fallidos.

### Requisitos Previos e Instalación
* Node.js v18 o superior.
* Instalar dependencias ejecuntando:
  ```bash
  npm install
  ```

### Guía de Uso Rápido
1. **Ejecutar Pruebas Unitarias.** Valida la lógica de extracción de metadatos y parser XML locales:
   ```bash
   npm run test
   ```
2. **Levantar el Servidor Mock local:**
   ```bash
   npm run start:mock
   ```
3. **Ejecutar el Scraper (en otra terminal) contra el Mock:**
   ```bash
   # En Windows (PowerShell)
   $env:BASE_URL="http://localhost:3000/jurisprudenciaweb"; npm run dev
   # En Linux/macOS
   BASE_URL=http://localhost:3000/jurisprudenciaweb npm run dev
   ```
4. **Ejecutar Reintento de descargas fallidas (en otra terminal) contra el Mock:**
   ```bash
   # En Windows (PowerShell)
   $env:BASE_URL="http://localhost:3000/jurisprudenciaweb"; npm run retry-failed
   # En Linux/macOS
   BASE_URL=http://localhost:3000/jurisprudenciaweb npm run retry-failed
   ```
### Nota de Producción e IP de Perú (VPN)
El acceso al subdominio `jurisprudencia.pj.gob.pe` bloquea las llamadas provenientes de IPs internacionales con un error `403 Forbidden`. Para ejecutar este scraper contra el portal de producción real, **es imperativo ejecutar el código desde un servidor ubicado en Perú o a través de una red VPN peruana**.

### Límite de Ejecución de Prueba (Evaluación Rápida)
Para evitar que el proceso secuencial con backoff de red consuma excesivo tiempo recorriendo cientos de páginas del Poder Judicial, el scraper incluye un limitador predeterminado:
*   **Parámetro:** `CONFIG.MAX_PAGES` en [src/config.ts](file:///c:/laragon/www/scraping/src/config.ts).
*   **Valor por defecto:** `2` (el scraper procesará 2 páginas de resultados por sesión y frenará de forma controlada).
*   **Ejecución completa:** Para desactivar este límite y permitir el barrido de todo el portal hasta el fin, cambia el valor a `0` o `null` en el archivo de configuración.

### 🌟 Cumplimiento de Criterios de Evaluación
Para facilitar el proceso de revisión por parte del equipo técnico evaluador, detallamos cómo la arquitectura aborda directamente cada criterio del desafío:

1. **Ingeniería HTTP Directa (Sin Navegador):** Emulamos el ciclo de vida stateful de JavaServer Faces (JSF) gestionando manualmente la cookie `JSESSIONID` y el token dinámico de vista `javax.faces.ViewState` en `src/jsfSession.ts`, evitando levantar navegadores pesados.
2. **Resiliencia ante Límites de Red (Rate Limiting y Concurrencia):** Implementamos un algoritmo de **Backoff Exponencial con Jitter** en `src/downloader.ts` ante respuestas HTTP 429. Además, controlamos la carga en el servidor aplicando un delay preventivo configurable (`REQUEST_DELAY_MS`) en `src/httpClient.ts` para mitigar bloqueos preventivos por el WAF.
3. **Ingeniería Inversa Autónona (JSF/RichFaces):** Decodificamos el formato XML propietario e interno de RichFaces (`faces-request: partial/ajax` en `src/xmlPartial.ts`) y diseñamos un parser léxico robusto en `src/resultParser.ts` para extraer de forma segura los metadatos de las resoluciones en el atributo JavaScript `onclick`, evitando parseos HTML frágiles y tolerando celdas incompletas.
4. **Calidad de Código y Tipificación Extrema:** Escrito completamente en TypeScript modularizado por responsabilidades (red, sesión, parsers, descargas, persistencia y orquestadores), con interfaces bien definidas y asincronía estricta (`async/await` pura).
5. **Idempotencia y Persistencia de Producción:** El progreso se almacena de forma incremental por páginas y UUIDs en `scraper_state.json`, lo que permite que el scraper continúe su ejecución exacta si se interrumpe, y cuenta con un script específico de reintentos (`src/retryFailed.ts`) para procesar los PDFs fallidos de forma aislada.

---

## 🇺🇸 ENGLISH - SOLUTION DOCUMENTATION

### Highlighted Features
1. **Stateful Session Keeping:** Auto-handles `JSESSIONID` cookies and dynamic `javax.faces.ViewState` fields.
2. **AJAX Pagination (RichFaces XML):** Simulates asynchronous datascroller pagination requests by utilizing appropriate AJAX headers (`faces-request: partial/ajax`) and parsing target XML CDATA.
3. **Robust Onclick Metadata Extraction:** Instead of using unstable HTML cell selector mapping, we parse the serialized JSON parameter from the "Ver" button onclick attribute securely.
4. **Rate Limit Resiliency (HTTP 429):** Implements **Exponential Backoff with Jitter** to retry PDF downloads upon rate limits.
5. **Idempotence & Progress Tracking:** Keeps track of extracted metadata in `documents.json` and crawler state in `scraper_state.json`.
6. **Isolated Retry Queue:** Includes a separate entrypoint (`retryFailed.ts`) to retry downloading PDFs that permanently failed on initial runs.
7. **Mock Server and Unit Tests:** Offline Node server mimicking JSF responses and 429 faults to ensure clean continuous testing.

### Project Scripts
* `npm run test`: Executes unit tests validating xml and HTML parameters parsing.
* `npm run start:mock`: Launches the offline mock server on port 3000.
* `npm run dev`: Runs the main scraper runner.
* `npm run retry-failed`: Re-executes PDF downloads from the local queue on disk.

*(Note: To target production servers, you must run the scripts under a Peruvian IP address / VPN due to WAF restrictions.)*

### Session Page Limits (Fast Evaluation Run)
To prevent the scraping job from spending hours paginating through hundreds of judiciary results, the scraper includes a configurable run limit:
*   **Property:** `CONFIG.MAX_PAGES` inside [src/config.ts](file:///c:/laragon/www/scraping/src/config.ts).
*   **Default:** `2` (the scraper will fetch and execute downloads for 2 pages before stopping gracefully).
*   **Uncapped runs:** Set `MAX_PAGES` to `0` or `null` in the config file to let the scraper paginate indefinitely until the end of the results.

### 🌟 Technical Evaluation Mapping
1. **HTTP level Reverse Engineering:** No headless browsers. Full simulation of JSF lifecycle, tracking session cookies and `ViewState` as form-encoded variables.
2. **Network Tolerance & Respect:** Handled dynamic 429s using Exponential Backoff + Jitter. Respectful throttling applied on requests via custom configuration settings (`REQUEST_DELAY_MS`).
3. **Clean Architecture:** Strict Typescript typings. Separate concerns for networking (`httpClient`), lifecycle (`jsfSession`), XML parser (`xmlPartial`), JS parameter interpreter (`resultParser`), and state machine queue (`retryQueue`).
4. **Resiliency:** Clean recovery. In case of unexpected server crashes, state is saved atomically item by item, allowing subsequent runs to resume from the exact same page.
