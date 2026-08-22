import * as fs from 'fs';
import * as path from 'path';
import { ResultParser } from '../src/resultParser';
import { Logger } from '../src/logger';

function test() {
    Logger.info('Iniciando prueba del ResultParser con HTML real de producción...');

    const htmlPath = path.join(__dirname, '../data/dump_real.html');
    if (!fs.existsSync(htmlPath)) {
        throw new Error(`No existe el archivo HTML de prueba en: ${htmlPath}`);
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const docs = ResultParser.parse(htmlContent);

    Logger.info(`Total de documentos parseados del HTML real: ${docs.length}`);
    if (docs.length > 0) {
        Logger.info('Primer documento parseado:');
        Logger.info(JSON.stringify(docs[0], null, 2));
    } else {
        Logger.error('¡Ningún documento pudo ser parseado del HTML real!');
    }
}

test();
