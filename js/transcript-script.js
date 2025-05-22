// js/transcript-script.js

document.addEventListener('DOMContentLoaded', () => {
    const transcriptTitleEl = document.getElementById('transcript-title');
    const transcriptTextEl = document.getElementById('transcript-text');
    const loadingIndicator = document.getElementById('loading-indicator-transcript');

    const params = new URLSearchParams(window.location.search);
    const ticker = params.get('ticker');
    const year = params.get('year');
    const quarter = params.get('quarter');
    const type = params.get('type'); // 'completa' o 'resumen'

    if (!ticker || !year || !quarter || !type) {
        transcriptTitleEl.textContent = "Error en los parámetros";
        transcriptTextEl.innerHTML = "<p>No se pudo cargar la transcripción. Faltan parámetros en la URL. Por favor, <a href='index.html'>vuelva a la búsqueda</a> e inténtelo de nuevo.</p>";
        loadingIndicator.style.display = 'none';
        return;
    }

    // Simular la estructura de datos que tendrías en index-script.js para obtener el nombre de la empresa
    // En una aplicación más grande, podrías tener un archivo de configuración común o una API para esto.
    const empresaNombres = {
        "AAPL": "Apple Inc.",
        "MSFT": "Microsoft Corp.",
        "GOOGL": "Alphabet Inc. (Google)"
        // ...deberías tener una forma de mapear tickers a nombres si lo necesitas aquí
    };
    const companyName = empresaNombres[ticker] || ticker;
    const typeText = type === 'completa' ? 'Transcripción Completa' : 'Resumen de Transcripción';
    
    transcriptTitleEl.textContent = `${typeText} - ${companyName} (${ticker}) - ${quarter} ${year}`;

    // Construir la ruta al archivo Markdown
    // data/transcripts/TICKER/AÑO/TRIMESTRE_TIPO.md
    const filePath = `data/transcripts/${ticker}/${year}/${quarter}_${type}.md`;

    loadingIndicator.style.display = 'block'; // Mostrar indicador de carga

    fetch(filePath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al cargar el archivo: ${response.status} ${response.statusText}. ¿Existe el archivo ${filePath}?`);
            }
            return response.text();
        })
        .then(markdown => {
            // Usar Marked.js para convertir Markdown a HTML
            // Asegúrate de que Marked.js esté incluido en transcript.html
            transcriptTextEl.innerHTML = marked.parse(markdown);
            loadingIndicator.style.display = 'none'; // Ocultar indicador
        })
        .catch(error => {
            console.error('Error al cargar la transcripción:', error);
            transcriptTitleEl.textContent = "Error al cargar la transcripción";
            transcriptTextEl.innerHTML = `<p>No se pudo cargar el contenido. ${error.message}. Por favor, <a href='index.html'>vuelva a la búsqueda</a>.</p>`;
            loadingIndicator.style.display = 'none'; // Ocultar indicador
        });
});