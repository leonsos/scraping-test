const realOnclick = `jsf.util.chain(this,event,"RichFaces.$('panelState').show();","RichFaces.ajax(\\"formBuscador:repeat:0:j_idt491\\",event,{\\"parameters\\":{\\"uuid\\":\\"6d3e2f33\\\\u002D32bb\\\\u002D4565\\\\u002Dad6d\\\\u002D5c560272869b\\",\\"recurso\\":\\"Casación\\",\\"nroexp\\":\\"001694\\\\u002D2025\\",\\"palabras\\":\\"indebida aplicación de la Ley N.° 31590,observancia del debido proceso y la tutela  jurisdiccional,Falta de motivación o manifiesta ilogicidad de la motivación\\",\\"pretensiones\\":\\"Variación de Tenencia\\",\\"normaDI\\":\\"\\",\\"tipoResolucion\\":\\"Ejecutoria Suprema\\",\\"fechaResolucion\\":\\"14\\\\\/07\\\\\/2026\\",\\"sala\\":\\"Sala Civil Transitoria\\",\\"sumilla\\":\\"El criterio referido a que los niños y adolescentes deben de pasar igual periodo de tiempo con ambos padres, no debe ser interpretado desde un criterio cronométrico y en función del lugar donde viven, sino como la posibilidad real de que ambos padres, en forma funcional, puedan ejercer sus deberes y derechos parentales, y puedan atender las necesidades y requerimientos de su menor hijo en el momento en que así se requiera, sea de manera presencial o incluso virtual o remota.\\"} ,\\"incId\\":\\"1\\"} )");return false;`;

function extractAndParse(onclickText: string) {
    const target = 'parameters';
    const index = onclickText.indexOf(target);
    if (index === -1) {
        console.log('Target not found');
        return;
    }

    const braceStartIndex = onclickText.indexOf('{', index + target.length);
    if (braceStartIndex === -1) {
        console.log('Brace start not found');
        return;
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

    console.log('Extracted jsonStr:', jsonStr);

    // Intentar limpiar pidiendo reemplazar \\" por "
    // Y luego dessescapar otros escapes de la cadena.
    let clean = jsonStr;
    // Si la cadena contiene comillas escapadas, las limpiamos primero
    if (clean.includes('\\"')) {
        clean = clean.replace(/\\"/g, '"');
    }
    // Si contiene barras diagonales escapadas o unicode escapado \\u...
    clean = clean.replace(/\\\\u/g, '\\u');
    clean = clean.replace(/\\\\/g, '\\');

    console.log('Cleaned clean:', clean);
    try {
        const parsed = JSON.parse(clean);
        console.log('Parsed successfully:', parsed);
    } catch (e: any) {
        console.error('Failed to parse:', e.message);
    }
}

extractAndParse(realOnclick);
