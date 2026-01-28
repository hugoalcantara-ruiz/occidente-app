/* LÓGICA PERSONALIZADA DEL MAPA (CEREBRO)
 * - Filtros con Efecto Focus (Dimmer + Resalte Neón).
 * - Control de Mapas Base externo (Estilo Google).
 * - Pantalla Completa para WIX.
 */

// --- VARIABLES GLOBALES VISUALES ---
// Las declaramos fuera para poder limpiarlas desde cualquier función
var layerDimmer = null;    // El "Telón" negro semitransparente
var layerHighlight = null; // El borde brillante del municipio

document.addEventListener("DOMContentLoaded", function() {

    // ==========================================================
    // 1. LÓGICA DE PANTALLA COMPLETA (Para Móviles y WIX)
    // ==========================================================
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', function() {
            var elem = document.body;
            if (!document.fullscreenElement) {
                elem.requestFullscreen ? elem.requestFullscreen() : 
                elem.webkitRequestFullscreen ? elem.webkitRequestFullscreen() : 
                elem.msRequestFullscreen ? elem.msRequestFullscreen() : null;
            } else {
                document.exitFullscreen ? document.exitFullscreen() : 
                document.webkitExitFullscreen ? document.webkitExitFullscreen() : 
                document.msExitFullscreen ? document.msExitFullscreen() : null;
            }
        });
    }

    // ==========================================================
    // 2. VERIFICACIÓN DE DATOS
    // ==========================================================
    if (typeof json_Precipitacin_13 === 'undefined') {
        console.error("ERROR CRÍTICO: No se cargaron los datos de 'json_Precipitacin_13'.");
        return; 
    }

    // ==========================================================
    // 3. PROCESAMIENTO DE DATOS (Crear Catálogo)
    // ==========================================================
    const catalogo = {}; // { "Quiché": ["Joyabaj", ...], ... }
    const geoDB = {};    // { "Joyabaj": {featureGeoJSON}, ... }

    json_Precipitacin_13.features.forEach((feature) => {
        const depto = feature.properties.Departamen;
        const muni = feature.properties.Municipio;
        
        if (depto) {
            if (!catalogo[depto]) catalogo[depto] = [];
            if (!catalogo[depto].includes(muni)) catalogo[depto].push(muni);
        }
        if (muni) {
            geoDB[muni] = feature;
        }
    });

    // ==========================================================
    // 4. CONTROL DE LA INTERFAZ (DOM)
    // ==========================================================
    const departamentoSelect = document.getElementById('department-select');
    const municipioSelect = document.getElementById('municipality-select');

    // A. Llenar Selector de Departamentos (Ordenado A-Z)
    Object.keys(catalogo).sort().forEach(depto => {
        const option = document.createElement('option');
        option.value = depto;
        option.textContent = depto;
        departamentoSelect.appendChild(option);
    });

    // B. Evento: Cambio de Departamento
    departamentoSelect.addEventListener('change', () => {
        const deptoSeleccionado = departamentoSelect.value;
        
        // Reiniciar todo
        municipioSelect.innerHTML = '<option value="">Seleccione Municipio...</option>';
        municipioSelect.disabled = true;
        limpiarEfectoFocus(); // Quitar cualquier resalte anterior

        if (deptoSeleccionado && catalogo[deptoSeleccionado]) {
            catalogo[deptoSeleccionado].sort().forEach(muni => {
                const option = document.createElement('option');
                option.value = muni;
                option.textContent = muni;
                municipioSelect.appendChild(option);
            });
            municipioSelect.disabled = false;
        }
    });

    // C. Evento: Cambio de Municipio (ZOOM + EFECTO VISUAL)
    municipioSelect.addEventListener('change', () => {
        const muniSeleccionado = municipioSelect.value;
        
        // 1. Limpiar efectos anteriores
        limpiarEfectoFocus();

        if (muniSeleccionado && geoDB[muniSeleccionado]) {
            // 2. Calcular límites con Leaflet
            const layerTemporal = L.geoJSON(geoDB[muniSeleccionado]);
            const bounds = layerTemporal.getBounds();

            if (typeof map !== 'undefined') {
                // 3. Hacer Zoom
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
                
                // 4. Aplicar el Efecto Focus (Oscurecer todo lo demás)
                aplicarEfectoVisual(geoDB[muniSeleccionado]);
            } else {
                console.warn("El objeto 'map' aún no está listo.");
            }
        }
    });

});

// ==========================================================
// 5. FUNCIONES AUXILIARES (EFECTOS VISUALES)
// ==========================================================

function aplicarEfectoVisual(featureGeoJSON) {
    if (typeof map === 'undefined') return;

    // A. Crear el "Telón" (Dimmer): Cubre todo el mundo de negro
    var boundsMundo = [[-90, -180], [90, 180]];
    layerDimmer = L.rectangle(boundsMundo, {
        color: "#000",       
        weight: 0,           
        fillOpacity: 0.6,   // 60% de oscuridad
        interactive: false   // Permite hacer clic a través de él
    }).addTo(map);

    // B. Crear el "Resalte" (Highlight): Dibuja el municipio encima
    layerHighlight = L.geoJSON(featureGeoJSON, {
        style: {
            color: "#00ffff",        // Color Cian Neón
            weight: 4,               // Borde grueso
            fillColor: "transparent", 
            fillOpacity: 0
        },
        interactive: false
    }).addTo(map);
}

function limpiarEfectoFocus() {
    if (typeof map === 'undefined') return;
    
    if (layerDimmer) {
        map.removeLayer(layerDimmer);
        layerDimmer = null;
    }
    if (layerHighlight) {
        map.removeLayer(layerHighlight);
        layerHighlight = null;
    }
}

// ==========================================================
// 6. CONTROL DE MAPAS BASE (Para los botones del HTML)
// ==========================================================
// Esta función se llama desde el onclick="..." en el index.html
window.cambiarMapaBase = function(tipo) {
    if (typeof map === 'undefined') return;

    // Asumimos que las variables layer_OpenStreetMap_0 y layer_GoogleSatellite_1
    // fueron creadas en el script del index.html.

    if (tipo === 'osm') {
        if (typeof layer_OpenStreetMap_0 !== 'undefined') map.addLayer(layer_OpenStreetMap_0);
        if (typeof layer_GoogleSatellite_1 !== 'undefined') map.removeLayer(layer_GoogleSatellite_1);
        
        // Actualizar estilo de los botones (clase 'active')
        document.getElementById('btn-osm').classList.add('active');
        document.getElementById('btn-sat').classList.remove('active');
    } 
    else if (tipo === 'sat') {
        if (typeof layer_GoogleSatellite_1 !== 'undefined') map.addLayer(layer_GoogleSatellite_1);
        if (typeof layer_OpenStreetMap_0 !== 'undefined') map.removeLayer(layer_OpenStreetMap_0);

        document.getElementById('btn-sat').classList.add('active');
        document.getElementById('btn-osm').classList.remove('active');
    }
};