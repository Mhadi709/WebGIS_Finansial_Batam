/* ===== BANK LOGO MAPPING ===== */
const BANK_DOMAINS = {
    'bca': 'bca.co.id', 'bank central asia': 'bca.co.id',
    'mandiri': 'bankmandiri.co.id', 'bank mandiri': 'bankmandiri.co.id',
    'bni': 'bni.co.id', 'bank negara indonesia': 'bni.co.id',
    'bri': 'bri.co.id', 'bank rakyat indonesia': 'bri.co.id',
    'cimb': 'cimbniaga.co.id', 'cimb niaga': 'cimbniaga.co.id', 'niaga': 'cimbniaga.co.id',
    'bsi': 'bankbsi.co.id', 'bank syariah indonesia': 'bankbsi.co.id', 'syariah mandiri': 'bankbsi.co.id',
    'ocbc': 'ocbc.id', 'ocbc nisp': 'ocbc.id', 'nisp': 'ocbc.id',
    'uob': 'uob.co.id', 'uob buana': 'uob.co.id',
    'permata': 'permatabank.com', 'permata bank': 'permatabank.com',
    'maybank': 'maybank.co.id',
    'danamon': 'danamon.co.id',
    'btn': 'btn.co.id', 'bank tabungan negara': 'btn.co.id',
    'bukopin': 'kfrfrfrfr.co.id',
    'hsbc': 'hsbc.co.id',
    'panin': 'panin.co.id',
    'muamalat': 'bankmuamalat.co.id', 'bank muamalat': 'bankmuamalat.co.id',
    'bank indonesia': 'bi.go.id',
    'riau': 'bankriaukepri.co.id', 'bank riau': 'bankriaukepri.co.id', 'riau kepri': 'bankriaukepri.co.id',
    'mestika': 'bankmestika.co.id',
    'mega': 'bankmega.com',
    'jabar': 'bjb.co.id', 'bjb': 'bjb.co.id',
    'ekonomi': 'bankekonomi.co.id',
    'kepulauan riau': 'bankriaukepri.co.id',
};

/* ===== BANK COLOR MAPPING ===== */
const BANK_COLORS = {
    'bca': '#003399', 'mandiri': '#003876', 'bni': '#f26522',
    'bri': '#00529c', 'cimb': '#ed1c24', 'bsi': '#00a551',
    'ocbc': '#d71920', 'uob': '#001f5b', 'permata': '#005eb8',
    'maybank': '#ffc72c', 'danamon': '#003d79', 'btn': '#f7941d',
    'hsbc': '#db0011', 'panin': '#003399', 'muamalat': '#662d91',
    'bi': '#003366', 'riau': '#0066b3', 'bri': '#00529c',
    'mega': '#003b71', 'default': '#1a73e8'
};

/* ===== GLOBALS ===== */
let map, geojsonData;
let layerGroups = { bank: null, atm: null, bureau_de_change: null };
let boundaryLayer = null;
let maskLayer = null;
let allFeatures = [];
let currentBasemap = 'light';
let basemapLayers = {};

/* ===== INITIALIZATION ===== */
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
    initNavigation();
    initDetailPanel();
    initLegendToggles();
    initBasemapControl();
    initMapSearch();
});

/* ===== MAP INIT ===== */
function initMap() {
    map = L.map('map', {
        center: [1.1, 104.03],
        zoom: 12,
        zoomControl: false
    });

    // Custom panes for layer ordering
    map.createPane('maskPane');
    map.getPane('maskPane').style.zIndex = 250;
    map.getPane('maskPane').style.pointerEvents = 'none';

    map.createPane('boundaryPane');
    map.getPane('boundaryPane').style.zIndex = 350;

    // Define basemap layers
    basemapLayers.light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19
    });

    basemapLayers.streets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20
    });

    basemapLayers.satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20
    });

    // Add default basemap
    basemapLayers.light.addTo(map);

    // Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Scale bar
    L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);

    // Initialize layer groups
    layerGroups.bank = L.layerGroup().addTo(map);
    layerGroups.atm = L.layerGroup().addTo(map);
    layerGroups.bureau_de_change = L.layerGroup().addTo(map);

    // Load admin boundary
    loadAdminBoundary();
}

/* ===== LOAD GEOJSON DATA ===== */
async function loadData() {
    try {
        const resp = await fetch('Data_uts_Baru.geojson');
        geojsonData = await resp.json();
        allFeatures = geojsonData.features;
        processData();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

/* ===== PROCESS DATA ===== */
function processData() {
    let counts = { bank: 0, atm: 0, bureau_de_change: 0 };

    allFeatures.forEach((f, idx) => {
        const props = f.properties;
        const amenity = props.amenity || 'bank';
        const name = props.name || props.operator || 'Unknown';

        // Get coordinates (handle both Point and Polygon)
        let lat, lng;
        if (f.geometry.type === 'Point') {
            lng = f.geometry.coordinates[0];
            lat = f.geometry.coordinates[1];
        } else if (f.geometry.type === 'Polygon') {
            const coords = f.geometry.coordinates[0];
            lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
            lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        }

        if (!lat || !lng) return;
        counts[amenity] = (counts[amenity] || 0) + 1;

        // Create marker
        const marker = createMarker(lat, lng, amenity, name, props, idx);
        const group = layerGroups[amenity];
        if (group) marker.addTo(group);
    });

    // Update legend counts
    document.getElementById('count-bank').textContent = counts.bank;
    document.getElementById('count-atm').textContent = counts.atm;
    document.getElementById('count-exchange').textContent = counts.bureau_de_change;
    document.getElementById('sidebar-total').textContent = `${allFeatures.length} Lokasi`;

    // Fit bounds
    const allCoords = allFeatures.map(f => {
        if (f.geometry.type === 'Point') return [f.geometry.coordinates[1], f.geometry.coordinates[0]];
        const c = f.geometry.coordinates[0];
        return [c.reduce((s, p) => s + p[1], 0) / c.length, c.reduce((s, p) => s + p[0], 0) / c.length];
    });
    if (allCoords.length) map.fitBounds(allCoords, { padding: [50, 50] });
}

/* ===== GET BANK DOMAIN ===== */
function getBankDomain(name, operator) {
    const text = ((name || '') + ' ' + (operator || '')).toLowerCase();
    for (const [key, domain] of Object.entries(BANK_DOMAINS)) {
        if (text.includes(key)) return domain;
    }
    return null;
}

/* ===== GET BANK COLOR ===== */
function getBankColor(name, operator) {
    const text = ((name || '') + ' ' + (operator || '')).toLowerCase();
    for (const [key, color] of Object.entries(BANK_COLORS)) {
        if (text.includes(key)) return color;
    }
    return BANK_COLORS.default;
}

/* ===== GET BANK INITIAL ===== */
function getBankInitial(name) {
    if (!name) return '?';
    const words = name.replace(/^(atm|bank)\s*/i, '').trim().split(/\s+/);
    if (words[0] && words[0].length <= 4 && words[0] === words[0].toUpperCase()) return words[0];
    return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
}

/* ===== CREATE MARKER ===== */
function createMarker(lat, lng, amenity, name, props, idx) {
    const domain = getBankDomain(name, props.operator);
    const markerClass = amenity === 'atm' ? 'marker-atm' : amenity === 'bureau_de_change' ? 'marker-exchange' : 'marker-bank';
    const innerClass = amenity === 'atm' ? 'inner-atm' : amenity === 'bureau_de_change' ? 'inner-exchange' : 'inner-bank';
    const initial = getBankInitial(name);
    const size = 32;

    let iconHtml;
    if (domain) {
        const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        iconHtml = `<div class="custom-marker ${markerClass}" style="width:${size}px;height:${size}px;">
            <img class="marker-logo" src="${logoUrl}" onerror="this.parentElement.innerHTML='<div class=\\'marker-inner ${innerClass}\\'>${initial}</div>'" alt="${name}">
        </div>`;
    } else {
        iconHtml = `<div class="custom-marker ${markerClass}" style="width:${size}px;height:${size}px;">
            <div class="marker-inner ${innerClass}">${initial}</div>
        </div>`;
    }

    const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });

    const marker = L.marker([lat, lng], { icon });
    marker.on('click', () => showDetail(props, lat, lng, amenity, domain));
    return marker;
}

/* ===== LOAD ADMIN BOUNDARY ===== */
async function loadAdminBoundary() {
    try {
        const query = `[out:json][timeout:30];relation["name"="Batam"]["admin_level"];out geom;`;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.elements && data.elements.length > 0 && typeof osmtogeojson !== 'undefined') {
            const geojson = osmtogeojson(data);

            // Create boundary line
            boundaryLayer = L.geoJSON(geojson, {
                pane: 'boundaryPane',
                style: {
                    color: '#8b5cf6',
                    weight: 2.5,
                    opacity: 0.7,
                    fill: false,
                    dashArray: '6, 4'
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties && feature.properties.name) {
                        layer.bindPopup(`<b>${feature.properties.name}</b><br>Batas Administrasi`);
                    }
                }
            }).addTo(map);

            // Create inverted polygon mask
            createInvertedMask(geojson);
        }
    } catch (err) {
        console.warn('Could not load admin boundary:', err);
    }
}

/* ===== INVERTED POLYGON MASK ===== */
function createInvertedMask(geojson) {
    // World outer ring in GeoJSON [lng, lat] format
    const worldRing = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];

    // Extract all polygon outer rings from boundary features as holes
    const holes = [];
    geojson.features.forEach(f => {
        if (!f.geometry) return;
        if (f.geometry.type === 'Polygon') {
            holes.push(f.geometry.coordinates[0]);
        } else if (f.geometry.type === 'MultiPolygon') {
            f.geometry.coordinates.forEach(poly => holes.push(poly[0]));
        }
    });

    if (holes.length === 0) return;

    // Create mask GeoJSON: world polygon with Batam boundary as holes
    const maskGeoJSON = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [worldRing, ...holes]
        },
        properties: {}
    };

    maskLayer = L.geoJSON(maskGeoJSON, {
        pane: 'maskPane',
        style: {
            fillColor: '#000000',
            fillOpacity: 0.5,
            stroke: false,
            interactive: false
        }
    }).addTo(map);
}

/* ===== BASEMAP SWITCHING ===== */
function switchBasemap(name) {
    if (name === currentBasemap) return;

    // Remove current basemap
    map.removeLayer(basemapLayers[currentBasemap]);

    // Add new basemap
    basemapLayers[name].addTo(map);
    basemapLayers[name].bringToBack();

    currentBasemap = name;

    // Update UI
    document.querySelectorAll('.basemap-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.basemap === name);
    });
}

function initBasemapControl() {
    const toggle = document.getElementById('basemap-toggle');
    const options = document.getElementById('basemap-options');

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        options.classList.toggle('show');
    });

    document.querySelectorAll('.basemap-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            switchBasemap(btn.dataset.basemap);
            options.classList.remove('show');
        });
    });

    // Close when clicking elsewhere
    document.addEventListener('click', () => {
        options.classList.remove('show');
    });
}

/* ===== DETAIL PANEL ===== */
function initDetailPanel() {
    document.getElementById('detail-close').addEventListener('click', () => {
        document.getElementById('detail-panel').classList.remove('open');
    });

    map.on('click', () => {
        document.getElementById('detail-panel').classList.remove('open');
    });
}

function showDetail(props, lat, lng, amenity, domain) {
    const panel = document.getElementById('detail-panel');
    const name = props.name || props.operator || 'Tidak diketahui';

    // Logo
    const logoEl = document.getElementById('detail-logo');
    logoEl.innerHTML = '';
    const color = getBankColor(name, props.operator);
    logoEl.style.background = `linear-gradient(135deg, ${color}, ${color}dd)`;
    if (domain) {
        const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = name;
        img.onerror = () => { img.remove(); logoEl.textContent = getBankInitial(name); };
        logoEl.appendChild(img);
    } else {
        logoEl.textContent = getBankInitial(name);
    }

    // Title
    document.getElementById('detail-name').textContent = name;

    // Badge
    const badge = document.getElementById('detail-badge');
    const typeLabels = { 'atm': 'ATM', 'bank': 'Bank', 'bureau_de_change': 'Money Changer' };
    badge.textContent = typeLabels[amenity] || amenity;
    badge.className = `detail-badge badge-${amenity === 'bureau_de_change' ? 'exchange' : amenity}`;

    // Info
    document.getElementById('detail-type').textContent = typeLabels[amenity] || amenity;
    document.getElementById('detail-operator').textContent = props.operator || 'Tidak tersedia';
    document.getElementById('detail-hours').textContent = props.opening_hours || 'Tidak tersedia';
    document.getElementById('detail-coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('detail-osmid').textContent = props.osm_id || '-';

    // Links
    document.getElementById('detail-osm-link').href = `https://www.openstreetmap.org/${props.osm_type === 'ways_poly' ? 'way' : 'node'}/${props.osm_id}`;
    document.getElementById('detail-gmaps-link').href = `https://www.google.com/maps?q=${lat},${lng}`;

    panel.classList.add('open');
    map.panTo([lat, lng], { animate: true });
}

/* ===== LEGEND TOGGLES ===== */
function initLegendToggles() {
    document.querySelectorAll('.legend-item input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const layer = e.target.dataset.layer;
            if (layer === 'boundary') {
                if (boundaryLayer) {
                    e.target.checked ? map.addLayer(boundaryLayer) : map.removeLayer(boundaryLayer);
                }
                if (maskLayer) {
                    e.target.checked ? map.addLayer(maskLayer) : map.removeLayer(maskLayer);
                }
            } else if (layerGroups[layer]) {
                e.target.checked ? map.addLayer(layerGroups[layer]) : map.removeLayer(layerGroups[layer]);
            }
        });
    });
}

/* ===== NAVIGATION ===== */
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;

            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(`page-${page}`).classList.add('active');

            if (page === 'map') {
                setTimeout(() => map.invalidateSize(), 100);
            }
            if (page === 'dashboard') {
                renderDashboard();
            }
        });
    });
}

/* ===== DASHBOARD ===== */
let chartsRendered = false;

function renderDashboard() {
    if (!allFeatures.length) return;

    const counts = { bank: 0, atm: 0, bureau_de_change: 0 };
    const bankNameCounts = {};

    allFeatures.forEach(f => {
        const amenity = f.properties.amenity || 'bank';
        counts[amenity] = (counts[amenity] || 0) + 1;

        const rawName = normalizeBankName(f.properties.name, f.properties.operator);
        bankNameCounts[rawName] = (bankNameCounts[rawName] || 0) + 1;
    });

    // Update stats
    document.getElementById('stat-total').textContent = allFeatures.length;
    document.getElementById('stat-bank').textContent = counts.bank;
    document.getElementById('stat-atm').textContent = counts.atm;
    document.getElementById('stat-exchange').textContent = counts.bureau_de_change;

    // Render charts
    if (!chartsRendered) {
        renderTypeChart(counts);
        renderTopChart(bankNameCounts);
        chartsRendered = true;
    }

    // Render table
    renderTable();
}

function normalizeBankName(name, operator) {
    const text = ((name || '') + ' ' + (operator || '')).toLowerCase();
    if (text.includes('bca') || text.includes('bank central asia')) return 'BCA';
    if (text.includes('mandiri')) return 'Bank Mandiri';
    if (text.includes('bni') || text.includes('bank negara indonesia')) return 'BNI';
    if (text.includes('bri') || text.includes('bank rakyat')) return 'BRI';
    if (text.includes('cimb') || text.includes('niaga')) return 'CIMB Niaga';
    if (text.includes('bsi') || text.includes('syariah indonesia')) return 'BSI';
    if (text.includes('ocbc') || text.includes('nisp')) return 'OCBC NISP';
    if (text.includes('uob')) return 'UOB';
    if (text.includes('permata')) return 'Permata Bank';
    if (text.includes('maybank')) return 'Maybank';
    if (text.includes('danamon')) return 'Danamon';
    if (text.includes('btn')) return 'BTN';
    if (text.includes('bukopin')) return 'Bukopin';
    if (text.includes('hsbc')) return 'HSBC';
    if (text.includes('panin')) return 'Panin Bank';
    if (text.includes('muamalat')) return 'Bank Muamalat';
    if (text.includes('riau')) return 'Bank Riau Kepri';
    if (text.includes('mestika')) return 'Bank Mestika';
    if (text.includes('bank indonesia') && !text.includes('syariah')) return 'Bank Indonesia';
    if (text.includes('jabar') || text.includes('bjb')) return 'BJB';
    if (text.includes('ekonomi')) return 'Bank Ekonomi';
    if (text.includes('mega')) return 'Bank Mega';
    if (text.includes('money') && text.includes('change')) return 'Money Changer';
    if (text.includes('indobest')) return 'Indobest';
    if (text.includes('danus') || text.includes('dana nusantara')) return 'BPR Dana Nusantara';
    if (text.includes('dana makmur')) return 'BPR Dana Makmur';
    if (text.includes('central kepri')) return 'BPR Central Kepri';
    if (text.includes('valas') || text.includes('dua putra')) return 'Money Changer';
    return name || operator || 'Lainnya';
}

/* ===== CHARTS ===== */
function renderTypeChart(counts) {
    const ctx = document.getElementById('chart-type').getContext('2d');
    const total = counts.bank + counts.atm + counts.bureau_de_change;
    const chartColors = ['#1a73e8', '#34a853', '#f59e0b'];
    const chartIcons = ['fa-building-columns', 'fa-credit-card', 'fa-money-bill-transfer'];
    const chartBgLight = ['#dbeafe', '#dcfce7', '#fef3c7'];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Bank', 'ATM', 'Money Changer'],
            datasets: [{
                data: [counts.bank, counts.atm, counts.bureau_de_change],
                backgroundColor: chartColors,
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 10,
                hoverBorderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30,41,59,0.9)',
                    titleFont: { family: 'Inter', size: 13, weight: 600 },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,
                    boxPadding: 6,
                    callbacks: {
                        label: function(ctx) {
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateRotate: true,
                duration: 1000
            }
        },
        plugins: [{
            id: 'centerText',
            afterDraw(chart) {
                const { width, height, ctx } = chart;
                ctx.save();
                ctx.font = '800 26px Inter';
                ctx.fillStyle = '#1e293b';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(total, width / 2, height / 2 + 2);
                ctx.font = '500 11px Inter';
                ctx.fillStyle = '#94a3b8';
                ctx.textBaseline = 'top';
                ctx.fillText('Total Lokasi', width / 2, height / 2 + 6);
                ctx.restore();
            }
        }]
    });

    // Build custom HTML legend
    const legendContainer = document.createElement('div');
    legendContainer.className = 'custom-chart-legend';

    const dataValues = [counts.bank, counts.atm, counts.bureau_de_change];
    const labels = ['Bank', 'ATM', 'Money Changer'];

    labels.forEach((label, i) => {
        const pct = total > 0 ? ((dataValues[i] / total) * 100).toFixed(1) : '0.0';
        const item = document.createElement('div');
        item.className = 'legend-pill';
        item.innerHTML = `
            <div class="legend-pill-icon" style="background:${chartBgLight[i]};color:${chartColors[i]};">
                <i class="fas ${chartIcons[i]}"></i>
            </div>
            <div class="legend-pill-info">
                <span class="legend-pill-label">${label}</span>
                <span class="legend-pill-value">${dataValues[i]} <small>(${pct}%)</small></span>
            </div>
        `;
        legendContainer.appendChild(item);
    });

    // Insert legend after the chart canvas
    const chartCard = document.getElementById('chart-type').closest('.chart-card');
    const existing = chartCard.querySelector('.custom-chart-legend');
    if (existing) existing.remove();
    chartCard.appendChild(legendContainer);
}

function renderTopChart(bankNameCounts) {
    const sorted = Object.entries(bankNameCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const ctx = document.getElementById('chart-top').getContext('2d');

    const colors = sorted.map(([name]) => {
        const color = getBankColor(name, '');
        return color;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(e => e[0]),
            datasets: [{
                label: 'Jumlah Lokasi',
                data: sorted.map(e => e[1]),
                backgroundColor: colors.map(c => c + '33'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { family: 'Inter', size: 11 } },
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    ticks: { font: { family: 'Inter', size: 12, weight: 500 } },
                    grid: { display: false }
                }
            }
        }
    });
}

/* ===== TABLE ===== */
let tableSearchInit = false;

function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    allFeatures.forEach((f, i) => {
        const p = f.properties;
        const amenity = p.amenity || 'bank';
        const typeLabel = { 'atm': 'ATM', 'bank': 'Bank', 'bureau_de_change': 'Money Changer' };
        const badgeClass = { 'atm': 't-atm', 'bank': 't-bank', 'bureau_de_change': 't-exchange' };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td><strong>${p.name || '-'}</strong></td>
            <td><span class="type-badge ${badgeClass[amenity] || ''}">${typeLabel[amenity] || amenity}</span></td>
            <td>${p.operator || '-'}</td>
            <td>${p.opening_hours || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    // Search (only bind once)
    if (!tableSearchInit) {
        const search = document.getElementById('table-search');
        search.addEventListener('input', () => {
            const q = search.value.toLowerCase();
            const rows = document.getElementById('table-body').querySelectorAll('tr');
            rows.forEach(tr => {
                tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });
        tableSearchInit = true;
    }
}

/* ===== MAP SEARCH ===== */
let searchHighlightMarker = null;

function initMapSearch() {
    const input = document.getElementById('search-input');
    const resultsEl = document.getElementById('search-results');
    const clearBtn = document.getElementById('search-clear');
    let debounceTimer = null;

    // Debounced search on input
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();

        // Show/hide clear button
        clearBtn.classList.toggle('visible', q.length > 0);

        if (q.length < 2) {
            resultsEl.classList.remove('open');
            resultsEl.innerHTML = '';
            removeSearchHighlight();
            return;
        }

        debounceTimer = setTimeout(() => {
            performSearch(q, resultsEl);
        }, 200);
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        resultsEl.classList.remove('open');
        resultsEl.innerHTML = '';
        removeSearchHighlight();
        input.focus();
    });

    // Close results on Escape
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            input.value = '';
            clearBtn.classList.remove('visible');
            resultsEl.classList.remove('open');
            resultsEl.innerHTML = '';
            removeSearchHighlight();
            input.blur();
        }
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        const searchContainer = document.getElementById('map-search');
        if (!searchContainer.contains(e.target)) {
            resultsEl.classList.remove('open');
        }
    });

    // Re-open on focus if there's text
    input.addEventListener('focus', () => {
        if (input.value.trim().length >= 2 && resultsEl.innerHTML.length > 0) {
            resultsEl.classList.add('open');
        }
    });
}

function performSearch(query, resultsEl) {
    const q = query.toLowerCase();
    const typeLabels = { 'atm': 'ATM', 'bank': 'Bank', 'bureau_de_change': 'Money Changer' };
    const typeIcons = { 'atm': 'fa-credit-card', 'bank': 'fa-building-columns', 'bureau_de_change': 'fa-money-bill-transfer' };
    const badgeClass = { 'atm': 's-atm', 'bank': 's-bank', 'bureau_de_change': 's-exchange' };
    const iconClass = { 'atm': 'icon-atm', 'bank': 'icon-bank', 'bureau_de_change': 'icon-exchange' };

    // Search through all features
    const results = [];
    allFeatures.forEach((f, idx) => {
        const props = f.properties;
        const name = props.name || '';
        const operator = props.operator || '';
        const amenity = props.amenity || 'bank';
        const typeLabel = typeLabels[amenity] || amenity;

        const searchText = (name + ' ' + operator + ' ' + typeLabel).toLowerCase();
        if (!searchText.includes(q)) return;

        // Get coordinates
        let lat, lng;
        if (f.geometry.type === 'Point') {
            lng = f.geometry.coordinates[0];
            lat = f.geometry.coordinates[1];
        } else if (f.geometry.type === 'Polygon') {
            const coords = f.geometry.coordinates[0];
            lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
            lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        }

        if (!lat || !lng) return;

        results.push({ name, operator, amenity, typeLabel, lat, lng, props, idx });
    });

    // Limit to 20 results
    const limited = results.slice(0, 20);

    // Build results HTML
    if (limited.length === 0) {
        resultsEl.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <p>Tidak ditemukan hasil untuk "${escapeHtml(query)}"</p>
                <small>Coba kata kunci lain</small>
            </div>`;
        resultsEl.classList.add('open');
        return;
    }

    let html = `<div class="search-results-header">
        <span>Hasil Pencarian</span>
        <span class="result-count">${results.length > 20 ? '20+' : results.length}</span>
    </div>`;

    limited.forEach((r) => {
        const highlightedName = highlightMatch(r.name || 'Tanpa Nama', query);
        const metaText = r.operator ? r.operator : `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`;

        html += `
        <div class="search-result-item" data-lat="${r.lat}" data-lng="${r.lng}" data-idx="${r.idx}">
            <div class="search-result-icon ${iconClass[r.amenity] || 'icon-bank'}">
                <i class="fas ${typeIcons[r.amenity] || 'fa-building-columns'}"></i>
            </div>
            <div class="search-result-info">
                <div class="search-result-name">${highlightedName}</div>
                <div class="search-result-meta"><i class="fas fa-building" style="margin-right:4px;font-size:10px;"></i>${escapeHtml(metaText)}</div>
            </div>
            <span class="search-result-badge ${badgeClass[r.amenity] || 's-bank'}">${r.typeLabel}</span>
        </div>`;
    });

    resultsEl.innerHTML = html;
    resultsEl.classList.add('open');

    // Add click handlers to results
    resultsEl.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            const idx = parseInt(item.dataset.idx);
            const feature = allFeatures[idx];

            // Fly to location
            map.flyTo([lat, lng], 17, { duration: 1.2 });

            // Add a highlight pulse marker
            addSearchHighlight(lat, lng);

            // Open detail panel
            if (feature) {
                const props = feature.properties;
                const amenity = props.amenity || 'bank';
                const name = props.name || props.operator || 'Unknown';
                const domain = getBankDomain(name, props.operator);
                setTimeout(() => {
                    showDetail(props, lat, lng, amenity, domain);
                }, 600);
            }

            // Close results
            resultsEl.classList.remove('open');
        });
    });
}

function addSearchHighlight(lat, lng) {
    removeSearchHighlight();

    const pulseIcon = L.divIcon({
        html: `<div class="search-pulse-marker">
            <div class="search-pulse-ring"></div>
            <div class="search-pulse-dot"></div>
        </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    searchHighlightMarker = L.marker([lat, lng], { icon: pulseIcon, interactive: false }).addTo(map);

    // Auto-remove after 4 seconds
    setTimeout(() => removeSearchHighlight(), 4000);
}

function removeSearchHighlight() {
    if (searchHighlightMarker) {
        map.removeLayer(searchHighlightMarker);
        searchHighlightMarker = null;
    }
}

function highlightMatch(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
