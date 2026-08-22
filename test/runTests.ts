import { XmlPartial } from '../src/xmlPartial';
import { ResultParser } from '../src/resultParser';
import { Logger } from '../src/logger';

function assert(condition: any, message: string) {
    if (!condition) {
        throw new Error(`[ASSERTION FAILED]: ${message}`);
    }
}

/**
 * Pruebas unitarias para el parser XML parcial
 */
function runXmlPartialTests() {
    Logger.info('[TEST] Iniciando validación de XmlPartial...');

    const sampleXml = `<?xml version='1.0' encoding='UTF-8'?>
  <partial-response>
    <changes>
      <update id="formBuscador:panel"><![CDATA[<div>Resultados Nuevos</div>]]></update>
      <update id="javax.faces.ViewState"><![CDATA[new-viewstate-value-999]]></update>
    </changes>
  </partial-response>`;

    const result = XmlPartial.parse(sampleXml);

    assert(result.viewState === 'new-viewstate-value-999', 'El ViewState obtenido no coincide con new-viewstate-value-999.');
    assert(result.htmlMap['formBuscador:panel'] === '<div>Resultados Nuevos</div>', 'El fragmento HTML mapeado no coincide.');

    Logger.info('[TEST] => XmlPartial: PASADO');
}

/**
 * Pruebas unitarias para el extractor de metadatos de filas de la tabla
 */
function runResultParserTests() {
    Logger.info('[TEST] Iniciando validación de ResultParser...');

    // 1. Verificación de des-escapado HTML
    const escaped = 'Test &quot;quotes&quot; and &amp; ampersands.';
    const unescaped = ResultParser.htmlUnescape(escaped);
    assert(unescaped === 'Test "quotes" and & ampersands.', 'El des-escapado de entidades HTML falló.');

    // 2. Verificación de extractor de llaves JavaScript en RichFaces onclick
    const onclickText = `RichFaces.ajax("form:id",event,{"parameters":{"recurso":"TEST","uuid":"123-abc","sumilla":"Contiene comillas \\"internas\\" y llaves { } intermedias..."},"similarityGroupingId":"form:id"})`;
    const extracted = ResultParser.extractParametersObject(onclickText);

    assert(extracted !== null, 'La extracción del objeto parameters fue nula.');

    const parsed = JSON.parse(extracted!);
    assert(parsed.recurso === 'TEST', 'El campo recurso es incorrecto.');
    assert(parsed.uuid === '123-abc', 'El uuid no coincide.');
    assert(parsed.sumilla === 'Contiene comillas "internas" y llaves { } intermedias...', 'El des-escape del campo sumilla falló.');

    Logger.info('[TEST] => ResultParser: PASADO');
}

/**
 * Runner principal de pruebas unitarias
 */
function main() {
    try {
        runXmlPartialTests();
        runResultParserTests();
        Logger.info('=== [ÉXITO] ¡TODAS LAS PRUEBAS UNITARIAS COMPLETADAS SATISFACTORIAMENTE! ===');
    } catch (err: any) {
        Logger.error('=== [FALLO] ERROR EN LAS PRUEBAS UNITARIAS ===', err);
        process.exit(1);
    }
}

main();
