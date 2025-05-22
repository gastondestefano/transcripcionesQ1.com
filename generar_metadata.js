const fs = require('fs'); // Módulo File System para interactuar con archivos
const path = require('path'); // Módulo Path para trabajar con rutas de archivos
const csv = require('csv-parser'); // La librería que acabamos de instalar para leer CSV

// --- CONFIGURACIÓN ---
// Nombre del archivo CSV que contiene los tickers y nombres de empresas
const csvFilePath = path.join(__dirname, 'empresas_sp500.csv'); // Asume que el CSV está en la raíz del proyecto

// Nombres EXACTOS de las columnas en tu archivo CSV
const tickerColumnName = 'Ticker';       // Cambia esto si tu columna de tickers se llama diferente
const companyNameColumnName = 'CompanyName'; // Cambia esto si tu columna de nombres se llama diferente

const transcriptsBasePath = path.join(__dirname, 'data', 'transcripts');
const empresasDataOutput = {}; // Objeto donde guardaremos la metadata final
const companyNamesMap = new Map(); // Un Mapa para almacenar Ticker -> NombreCompañía de forma eficiente

// --- LÓGICA DEL SCRIPT ---

// Función Principal Asíncrona para poder usar await
async function generarMetadata() {
    console.log('Iniciando la generación de metadata desde la estructura de carpetas y el archivo CSV...');

    // Parte 1: Leer el archivo CSV y cargar los nombres de las empresas
    console.log(`Leyendo archivo CSV: ${csvFilePath}`);
    try {
        // Creamos una Promesa para manejar la naturaleza asíncrona de la lectura de streams
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvFilePath) // Abrimos un stream de lectura del archivo CSV
                .pipe(csv()) // Pasamos el stream a csv-parser para que lo procese
                .on('data', (row) => {
                    // Esta función se ejecuta por cada fila (row) leída del CSV
                    const ticker = row[tickerColumnName]; // Accedemos al valor del ticker usando el nombre de la columna
                    const companyName = row[companyNameColumnName]; // Accedemos al valor del nombre usando el nombre de la columna

                    if (ticker && companyName) {
                        // Si tenemos ambos datos, los guardamos en nuestro Mapa
                        companyNamesMap.set(ticker.trim(), companyName.trim()); // trim() quita espacios extra
                    } else {
                        console.warn(`Fila en CSV sin ticker o nombre: ${JSON.stringify(row)}`);
                    }
                })
                .on('end', () => {
                    // Esta función se ejecuta cuando se ha leído todo el archivo CSV
                    console.log(`Lectura de CSV completada. ${companyNamesMap.size} empresas cargadas desde CSV.`);
                    resolve(); // Resolvemos la Promesa indicando que la lectura terminó
                })
                .on('error', (error) => {
                    // Esta función se ejecuta si hay un error leyendo el CSV
                    console.error('Error leyendo el archivo CSV:', error);
                    reject(error); // Rechazamos la Promesa
                });
        });
    } catch (error) {
        console.error('Fallo crítico al procesar el CSV. Abortando.', error);
        return; // Salimos de la función si no se pudo leer el CSV
    }

    if (companyNamesMap.size === 0) {
        console.error('No se cargaron nombres de empresas desde el CSV. Verifica el archivo y la configuración.');
        console.error('Asegúrate que csvFilePath, tickerColumnName y companyNameColumnName sean correctos.');
        return;
    }

    // Parte 2: Leer la estructura de carpetas de las transcripciones (como antes)
    console.log('Leyendo estructura de carpetas de transcripciones...');
    try {
        // Obtenemos la lista de carpetas de tickers dentro de data/transcripts/
        const tickersEnFileSystem = fs.readdirSync(transcriptsBasePath).filter(file =>
            fs.statSync(path.join(transcriptsBasePath, file)).isDirectory()
        );

        tickersEnFileSystem.forEach(tickerFS => { // tickerFS es el ticker encontrado en el sistema de archivos
            // Buscamos el nombre de la empresa para este ticker en nuestro Mapa cargado del CSV
            const nombreEmpresa = companyNamesMap.get(tickerFS);

            if (!nombreEmpresa) {
                console.warn(`ADVERTENCIA: Ticker '${tickerFS}' encontrado en el sistema de archivos, pero no en el CSV. Se usará un placeholder para el nombre.`);
            }

            empresasDataOutput[tickerFS] = {
                // Usamos el nombre del CSV si existe, sino un placeholder
                nombre: nombreEmpresa || `${tickerFS} (Nombre no encontrado en CSV)`,
                transcripciones: {}
            };

            const anosPath = path.join(transcriptsBasePath, tickerFS);
            // Obtenemos la lista de carpetas de años para este ticker
            const anos = fs.readdirSync(anosPath).filter(file =>
                fs.statSync(path.join(anosPath, file)).isDirectory()
            );

            anos.forEach(ano => {
                empresasDataOutput[tickerFS].transcripciones[ano] = {};
                const trimestresPath = path.join(anosPath, ano);
                // Obtenemos la lista de archivos .md para este año/ticker
                const archivosMd = fs.readdirSync(trimestresPath).filter(file => file.endsWith('.md'));

                archivosMd.forEach(archivo => {
                    // Ejemplo: Q1_completa.md
                    const [trimestreConTipo] = archivo.split('.'); // ["Q1_completa"]
                    const partesNombre = trimestreConTipo.split('_'); // ["Q1", "completa"]
                    const trimestre = partesNombre[0]; // "Q1"
                    const tipo = partesNombre[1]; // "completa"

                    if (trimestre && tipo) {
                        if (!empresasDataOutput[tickerFS].transcripciones[ano][trimestre]) {
                            empresasDataOutput[tickerFS].transcripciones[ano][trimestre] = {};
                        }
                        empresasDataOutput[tickerFS].transcripciones[ano][trimestre][tipo] = `data/transcripts/${tickerFS}/${ano}/${archivo}`;
                    } else {
                        console.warn(`Formato de nombre de archivo no esperado: ${archivo} en ${trimestresPath}`);
                    }
                });
            });
        });

        console.log('\n// --- COMIENZO DEL OBJETO empresasData ---');
        console.log('const empresasData = ' + JSON.stringify(empresasDataOutput, null, 4) + ';');
        console.log('// --- FIN DEL OBJETO empresasData ---');
        console.log('\n// COPIA Y PEGA ESTO en tu archivo js/index-script.js, reemplazando el objeto empresasData existente.');
        console.log(`// Se procesaron ${Object.keys(empresasDataOutput).length} tickers del sistema de archivos.`);

    } catch (error) {
        console.error("Error generando metadata desde el sistema de archivos:", error);
        console.log("Asegúrate de que la estructura de carpetas data/transcripts/TICKER/AÑO/ exista y contenga archivos .md, y que el script 'generar_estructura.js' se haya ejecutado correctamente.");
    }
}

// Ejecutar la función principal
generarMetadata();