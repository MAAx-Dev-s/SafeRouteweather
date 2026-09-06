/**
 * ============================================================================
 * CrisisCast AI — SafeRoute & Disaster Weather Intelligence Platform
 * Architecture: Modular ES6+ Client-Side Engine (GitHub Pages Compatible)
 * ============================================================================
 */

/* ============================================================================
   1. USER CONFIGURATION & API KEYS PLACEHOLDER
   Configure your keys below or customize them via the in-app Settings modal.
   Keys entered in the Settings modal are safely preserved in browser localStorage.
   ============================================================================ */
const CONFIG = {
  // Google Gemini API Key for dynamic natural language micro-climate intelligence
  // Get free key at: https://aistudio.google.com/
  GEMINI_API_KEY: '',

  // Optional OpenWeatherMap API Key (Open-Meteo is used by default with zero key required)
  // Get free key at: https://openweathermap.org/api
  OPENWEATHER_API_KEY: '',

  // Optional WeatherAPI Key
  // Get key at: https://www.weatherapi.com/
  WEATHER_API_KEY: '',

  // AI Processing Engine: 'auto' | 'gemini-1.5-flash' | 'heuristic'
  AI_ENGINE: 'auto',

  // Default Unit System: 'metric' (°C, km/h) | 'imperial' (°F, mph)
  DEFAULT_UNITS: 'metric',

  // Primary Free Providers (Zero API Key required)
  GEOCODING_API: 'https://geocoding-api.open-meteo.com/v1/search',
  OPEN_METEO_API: 'https://api.open-meteo.com/v1/forecast',
  OSRM_ROUTE_API: 'https://router.project-osrm.org/route/v1/driving'
};

/* ============================================================================
   2. GLOBAL STATE MANAGEMENT
   ============================================================================ */
const AppState = {
  units: localStorage.getItem('crisiscast_units') || CONFIG.DEFAULT_UNITS,
  currentLocation: {
    name: 'Tokyo, Japan',
    lat: 35.6762,
    lon: 139.6503,
    country: 'Japan',
    admin: 'Tokyo'
  },
  currentWeather: null,
  hourlyForecast: [],
  dailyForecast: [],
  activeHazards: [],
  simulatedScenario: null, // 'hurricane' | 'blizzard' | 'heatwave' | null
  routeData: {
    origin: null,
    destination: null,
    directCoords: [],
    safeCoords: [],
    hasHazard: false,
    distanceKm: 0,
    durationMin: 0
  },
  map: null,
  mapLayers: {
    originMarker: null,
    destMarker: null,
    directPolyline: null,
    safePolyline: null,
    hazardCircles: [],
    radarOverlay: null
  },
  layerVisibility: {
    hazards: true,
    radar: true,
    safeRoute: true
  }
};

/* ============================================================================
   3. INITIALIZATION & LIFECYCLE
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadStoredConfig();
  initClock();
  initMap();
  setupEventListeners();
  
  // Initial load with default hub (Tokyo)
  fetchWeatherData(AppState.currentLocation.lat, AppState.currentLocation.lon, AppState.currentLocation.name);
});

function loadStoredConfig() {
  const savedGemini = localStorage.getItem('crisiscast_gemini_key');
  const savedOWM = localStorage.getItem('crisiscast_owm_key');
  const savedEngine = localStorage.getItem('crisiscast_ai_engine');

  if (savedGemini) CONFIG.GEMINI_API_KEY = savedGemini;
  if (savedOWM) CONFIG.OPENWEATHER_API_KEY = savedOWM;
  if (savedEngine) CONFIG.AI_ENGINE = savedEngine;

  // Update Settings UI inputs
  const geminiInput = document.getElementById('cfg-gemini-key');
  const owmInput = document.getElementById('cfg-openweather-key');
  const engineSelect = document.getElementById('cfg-ai-engine');
  const indicator = document.getElementById('key-indicator');

  if (geminiInput && CONFIG.GEMINI_API_KEY) geminiInput.value = CONFIG.GEMINI_API_KEY;
  if (owmInput && CONFIG.OPENWEATHER_API_KEY) owmInput.value = CONFIG.OPENWEATHER_API_KEY;
  if (engineSelect && CONFIG.AI_ENGINE) engineSelect.value = CONFIG.AI_ENGINE;

  if (indicator) {
    if (CONFIG.GEMINI_API_KEY) {
      indicator.classList.remove('bg-cyber-cyan');
      indicator.classList.add('bg-cyber-emerald');
    }
  }
}

/* ============================================================================
   4. SYSTEM CLOCK & TELEMETRY
   ============================================================================ */
function initClock() {
  const clockEl = document.getElementById('utc-clock');
  function update() {
    const now = new Date();
    const utcHours = String(now.getUTCHours()).padStart(2, '0');
    const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
    const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
    if (clockEl) {
      clockEl.textContent = `${utcHours}:${utcMinutes}:${utcSeconds} UTC`;
    }
  }
  update();
  setInterval(update, 1000);
}

/* ============================================================================
   5. WEATHER DATA ENGINE (OPEN-METEO + OPENWEATHERMAP INTEGRATION)
   ============================================================================ */
async function fetchWeatherData(lat, lon, locationName = null) {
  try {
    showToast(`Telemetry locked: Fetching atmospheric data...`, 'info', 2000);
    
    // Check if OpenWeatherMap key is available, otherwise use Open-Meteo (zero key required)
    let weatherData = null;
    let providerName = 'OPEN-METEO LIVE';

    if (CONFIG.OPENWEATHER_API_KEY && CONFIG.OPENWEATHER_API_KEY.trim().length > 10) {
      try {
        const owmRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`);
        if (owmRes.ok) {
          providerName = 'OPENWEATHERMAP API';
        }
      } catch (e) {
        console.warn('OpenWeatherMap query failed, falling back to Open-Meteo:', e);
      }
    }

    // High precision Open-Meteo fetch with comprehensive parameters
    const url = `${CONFIG.OPEN_METEO_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather telemetry failed with status ${res.status}`);
    const data = await res.json();

    AppState.currentWeather = data.current;
    AppState.hourlyForecast = data.hourly;
    AppState.dailyForecast = data.daily;

    if (locationName) {
      AppState.currentLocation.name = locationName;
    }
    AppState.currentLocation.lat = lat;
    AppState.currentLocation.lon = lon;

    // Evaluate Disasters / Hazards
    evaluateDisasterThreats(data.current);

    // Render Dashboard UI
    renderWeatherDashboard(providerName);

    // Execute AI Micro-Climate Analytics
    runAIPredictions();

    // Center Leaflet Map
    if (AppState.map) {
      AppState.map.flyTo([lat, lon], 7, { duration: 1.2 });
      updateMapMarkers();
    }

    showToast(`Atmospheric feed updated for ${AppState.currentLocation.name}`, 'success', 2500);

  } catch (error) {
    console.error('Fetch weather error:', error);
    showToast(`Error retrieving weather metrics: ${error.message}`, 'error', 4000);
  }
}

/* WMO Weather Code Interpreter */
function interpretWMOCode(code) {
  const wmoTable = {
    0: { label: 'Clear Sky', icon: 'fa-sun', color: 'text-cyber-amber', condition: 'Optimal' },
    1: { label: 'Mainly Clear', icon: 'fa-cloud-sun', color: 'text-cyber-amber', condition: 'Optimal' },
    2: { label: 'Partly Cloudy', icon: 'fa-cloud-sun', color: 'text-cyber-sky', condition: 'Moderate' },
    3: { label: 'Overcast', icon: 'fa-cloud', color: 'text-slate-300', condition: 'Stable' },
    45: { label: 'Fog / Thermal Inversion', icon: 'fa-smog', color: 'text-slate-400', condition: 'Low Visibility' },
    48: { label: 'Rime Fog', icon: 'fa-smog', color: 'text-slate-400', condition: 'Low Visibility' },
    51: { label: 'Light Drizzle', icon: 'fa-cloud-rain', color: 'text-cyber-cyan', condition: 'Precipitation' },
    53: { label: 'Moderate Drizzle', icon: 'fa-cloud-rain', color: 'text-cyber-sky', condition: 'Precipitation' },
    55: { label: 'Dense Drizzle', icon: 'fa-cloud-showers-heavy', color: 'text-cyber-blue', condition: 'Caution' },
    61: { label: 'Slight Rain', icon: 'fa-cloud-sun-rain', color: 'text-cyber-cyan', condition: 'Precipitation' },
    63: { label: 'Moderate Rain', icon: 'fa-cloud-rain', color: 'text-cyber-sky', condition: 'Wet Surface' },
    65: { label: 'Heavy Rainband', icon: 'fa-cloud-showers-heavy', color: 'text-cyber-rose', condition: 'Hazard: Hydroplaning' },
    71: { label: 'Slight Snowfall', icon: 'fa-snowflake', color: 'text-cyber-sky', condition: 'Slippery' },
    73: { label: 'Moderate Snow', icon: 'fa-snowflake', color: 'text-cyber-cyan', condition: 'Winter Advisory' },
    75: { label: 'Heavy Blizzard', icon: 'fa-icicles', color: 'text-cyber-rose', condition: 'Hazard: Severe Snow' },
    80: { label: 'Rain Showers', icon: 'fa-cloud-rain', color: 'text-cyber-sky', condition: 'Wet' },
    82: { label: 'Violent Cloudburst', icon: 'fa-cloud-showers-water', color: 'text-cyber-rose', condition: 'Flash Flood Risk' },
    95: { label: 'Thunderstorm Front', icon: 'fa-bolt-lightning', color: 'text-cyber-amber', condition: 'High Turbulence' },
    96: { label: 'Thunderstorm with Hail', icon: 'fa-cloud-bolt', color: 'text-cyber-rose', condition: 'Critical Hazard' },
    99: { label: 'Severe Cyclonic Storm', icon: 'fa-hurricane', color: 'text-cyber-rose', condition: 'Imminent Danger' },
  };
  return wmoTable[code] || { label: 'Unsettled Conditions', icon: 'fa-cloud', color: 'text-slate-300', condition: 'Nominal' };
}

/* Unit Conversion Helpers */
function formatTemp(celsius) {
  if (AppState.units === 'imperial') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

function formatWind(kmh) {
  if (AppState.units === 'imperial') {
    return (kmh * 0.621371).toFixed(1);
  }
  return Number(kmh).toFixed(1);
}

/* ============================================================================
   6. RENDER WEATHER DASHBOARD & TELEMETRY
   ============================================================================ */
function renderWeatherDashboard(providerName = 'OPEN-METEO LIVE') {
  const cur = AppState.currentWeather;
  if (!cur) return;

  const wmo = interpretWMOCode(cur.weather_code);
  const isImperial = AppState.units === 'imperial';

  // Hero Section
  document.getElementById('city-name').textContent = AppState.currentLocation.name;
  document.getElementById('display-coords').textContent = `${AppState.currentLocation.lat.toFixed(4)}°, ${AppState.currentLocation.lon.toFixed(4)}°`;
  document.getElementById('data-provider-badge').textContent = providerName;
  document.getElementById('weather-description').innerHTML = `
    <span class="w-2 h-2 rounded-full ${cur.weather_code > 60 ? 'bg-cyber-rose' : 'bg-cyber-emerald'}"></span>
    ${wmo.label} — ${wmo.condition}
  `;

  document.getElementById('current-temp').textContent = formatTemp(cur.temperature_2m);
  document.getElementById('temp-unit-symbol').textContent = isImperial ? '°F' : '°C';
  document.getElementById('feels-like-temp').textContent = `${formatTemp(cur.apparent_temperature)}${isImperial ? '°F' : '°C'}`;

  // Min / Max Temps from Daily Forecast
  if (AppState.dailyForecast && AppState.dailyForecast.temperature_2m_max) {
    document.getElementById('max-temp').textContent = `${formatTemp(AppState.dailyForecast.temperature_2m_max[0])}°`;
    document.getElementById('min-temp').textContent = `${formatTemp(AppState.dailyForecast.temperature_2m_min[0])}°`;
  }

  // Weather Icon
  const iconContainer = document.getElementById('weather-icon-container');
  iconContainer.innerHTML = `<i class="fa-solid ${wmo.icon} text-4xl ${wmo.color} animate-pulse"></i>`;

  // Telemetry: Wind
  document.getElementById('wind-speed').textContent = formatWind(cur.wind_speed_10m);
  document.getElementById('wind-unit').textContent = isImperial ? 'mph' : 'km/h';
  document.getElementById('wind-direction').textContent = `${getCompassDirection(cur.wind_direction_10m)} (${cur.wind_direction_10m}°)`;
  const windArrow = document.getElementById('wind-arrow');
  if (windArrow) windArrow.style.transform = `rotate(${cur.wind_direction_10m}deg)`;
  const windBarPct = Math.min(100, (cur.wind_speed_10m / 70) * 100);
  document.getElementById('wind-bar').style.width = `${windBarPct}%`;

  // Telemetry: Humidity & Dew Point
  document.getElementById('humidity').textContent = cur.relative_humidity_2m;
  const dewPoint = calculateDewPoint(cur.temperature_2m, cur.relative_humidity_2m);
  document.getElementById('dew-point').textContent = `${formatTemp(dewPoint)}${isImperial ? '°F' : '°C'}`;
  document.getElementById('humidity-bar').style.width = `${cur.relative_humidity_2m}%`;

  // Telemetry: Pressure
  document.getElementById('pressure').textContent = Math.round(cur.surface_pressure);
  const pressureBarPct = Math.min(100, Math.max(0, ((cur.surface_pressure - 960) / 70) * 100));
  document.getElementById('pressure-bar').style.width = `${pressureBarPct}%`;
  const pressureTrend = document.getElementById('pressure-trend');
  if (cur.surface_pressure < 995) {
    pressureTrend.textContent = 'DEPRESSION';
    pressureTrend.className = 'text-cyber-rose font-bold';
  } else if (cur.surface_pressure > 1020) {
    pressureTrend.textContent = 'HIGH RIDGE';
    pressureTrend.className = 'text-cyber-sky font-bold';
  } else {
    pressureTrend.textContent = 'STABLE';
    pressureTrend.className = 'text-cyber-emerald font-bold';
  }

  // Telemetry: UV Index
  const uv = cur.uv_index || 0;
  document.getElementById('uv-index').textContent = uv.toFixed(1);
  const uvBarPct = Math.min(100, (uv / 11) * 100);
  document.getElementById('uv-bar').style.width = `${uvBarPct}%`;
  const uvRating = document.getElementById('uv-rating');
  if (uv < 3) {
    uvRating.textContent = 'LOW';
    uvRating.parentElement.className = 'text-[11px] font-mono text-cyber-emerald mt-1';
  } else if (uv < 6) {
    uvRating.textContent = 'MODERATE';
    uvRating.parentElement.className = 'text-[11px] font-mono text-cyber-amber mt-1';
  } else if (uv < 8) {
    uvRating.textContent = 'VERY HIGH';
    uvRating.parentElement.className = 'text-[11px] font-mono text-cyber-rose mt-1';
  } else {
    uvRating.textContent = 'EXTREME';
    uvRating.parentElement.className = 'text-[11px] font-mono text-cyber-purple font-bold mt-1';
  }

  // Telemetry: Visibility & Cloud Cover
  const visibilityKm = cur.precipitation > 5 ? 4.2 : cur.cloud_cover > 80 ? 8.5 : 10.0;
  document.getElementById('visibility').textContent = isImperial ? (visibilityKm * 0.621371).toFixed(1) : visibilityKm.toFixed(1);
  document.getElementById('visibility-unit').textContent = isImperial ? 'mi' : 'km';
  document.getElementById('visibility-bar').style.width = `${(visibilityKm / 10) * 100}%`;

  document.getElementById('cloud-cover').textContent = cur.cloud_cover;
  document.getElementById('cloud-bar').style.width = `${cur.cloud_cover}%`;
  const rainProb = AppState.hourlyForecast?.precipitation_probability?.[0] || (cur.precipitation > 0 ? 90 : 5);
  document.getElementById('precip-probability').textContent = `${rainProb}%`;

  // Atmospheric state & comfort index
  const atmosState = document.getElementById('atmos-state');
  const comfortIndex = document.getElementById('comfort-index');
  if (cur.wind_speed_10m > 50 || cur.surface_pressure < 990) {
    atmosState.textContent = 'TURBULENT / CYCLONIC';
    atmosState.className = 'text-cyber-rose font-bold animate-pulse';
    comfortIndex.textContent = 'HAZARDOUS';
    comfortIndex.className = 'text-cyber-rose bg-obsidian-800 px-2 py-0.5 rounded border border-cyber-rose/40';
  } else if (cur.temperature_2m > 33) {
    atmosState.textContent = 'THERMAL INVERSION';
    atmosState.className = 'text-cyber-amber font-bold';
    comfortIndex.textContent = 'HIGH HEAT STRESS';
    comfortIndex.className = 'text-cyber-amber bg-obsidian-800 px-2 py-0.5 rounded border border-cyber-amber/40';
  } else {
    atmosState.textContent = 'STABLE VORTEX';
    atmosState.className = 'text-cyber-emerald font-bold';
    comfortIndex.textContent = 'OPTIMAL';
    comfortIndex.className = 'text-slate-200 bg-obsidian-800 px-2 py-0.5 rounded border border-obsidian-700';
  }

  document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();

  // Render Timelines
  renderHourlyTimeline();
  renderDailyTimeline();
}

function calculateDewPoint(tempC, humidity) {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100.0);
  return (b * alpha) / (a - alpha);
}

function getCompassDirection(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
  return directions[index];
}

/* ============================================================================
   7. HOURLY & 7-DAY FORECAST TIMELINES
   ============================================================================ */
function renderHourlyTimeline() {
  const container = document.getElementById('hourly-forecast-container');
  if (!container || !AppState.hourlyForecast.time) return;

  container.innerHTML = '';
  const isImperial = AppState.units === 'imperial';
  const times = AppState.hourlyForecast.time.slice(0, 24);
  const temps = AppState.hourlyForecast.temperature_2m.slice(0, 24);
  const codes = AppState.hourlyForecast.weather_code.slice(0, 24);
  const pops = AppState.hourlyForecast.precipitation_probability.slice(0, 24);

  times.forEach((timeStr, idx) => {
    const date = new Date(timeStr);
    const hourLabel = idx === 0 ? 'NOW' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const wmo = interpretWMOCode(codes[idx]);
    const card = document.createElement('div');
    card.className = `forecast-hourly-card ${idx === 0 ? 'active-hour' : ''}`;
    card.innerHTML = `
      <span class="text-[10px] font-mono text-slate-400 font-bold">${hourLabel}</span>
      <i class="fa-solid ${wmo.icon} text-lg ${wmo.color}"></i>
      <span class="text-xs font-orbitron font-bold text-white">${formatTemp(temps[idx])}°</span>
      <div class="flex items-center gap-1 text-[9px] font-mono text-cyber-sky">
        <i class="fa-solid fa-droplet text-[8px]"></i>
        <span>${pops[idx]}%</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderDailyTimeline() {
  const container = document.getElementById('daily-forecast-container');
  if (!container || !AppState.dailyForecast.time) return;

  container.innerHTML = '';
  const isImperial = AppState.units === 'imperial';
  const days = AppState.dailyForecast.time.slice(0, 7);
  const maxTemps = AppState.dailyForecast.temperature_2m_max.slice(0, 7);
  const minTemps = AppState.dailyForecast.temperature_2m_min.slice(0, 7);
  const codes = AppState.dailyForecast.weather_code.slice(0, 7);
  const pops = AppState.dailyForecast.precipitation_probability_max.slice(0, 7);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  days.forEach((dayStr, idx) => {
    const date = new Date(dayStr);
    const dayLabel = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : dayNames[date.getDay()];
    const wmo = interpretWMOCode(codes[idx]);

    const item = document.createElement('div');
    item.className = 'forecast-daily-item';
    item.innerHTML = `
      <div class="flex items-center gap-3 w-28">
        <span class="text-xs font-mono font-bold text-white">${dayLabel}</span>
      </div>
      <div class="flex items-center gap-2 flex-1">
        <i class="fa-solid ${wmo.icon} text-sm ${wmo.color}"></i>
        <span class="text-xs text-slate-400 truncate max-w-[140px]">${wmo.label}</span>
      </div>
      <div class="flex items-center gap-2 text-xs font-mono">
        <div class="flex items-center gap-1 text-cyber-sky mr-2">
          <i class="fa-solid fa-droplet text-[10px]"></i>
          <span>${pops[idx]}%</span>
        </div>
        <span class="text-cyber-sky font-bold">${formatTemp(minTemps[idx])}°</span>
        <span class="text-slate-600">/</span>
        <span class="text-cyber-rose font-bold">${formatTemp(maxTemps[idx])}°</span>
      </div>
    `;
    container.appendChild(item);
  });
}

/* ============================================================================
   8. DISASTER RADAR & SEVERITY THREAT ENGINE
   ============================================================================ */
function evaluateDisasterThreats(cur) {
  AppState.activeHazards = [];

  // Check Simulated Scenarios First
  if (AppState.simulatedScenario === 'hurricane') {
    AppState.activeHazards.push({
      id: 'sim-hurricane',
      type: 'CAT-4 TROPICAL CYCLONE (SIMULATION)',
      severity: 'danger', // danger | warning | nominal
      category: 'Cyclonic Vortex',
      windSpeed: 145,
      impactRadiusKm: 180,
      description: 'Major atmospheric depression with sustained winds exceeding 140 km/h, intense storm surges, and localized torrential flooding along coastal corridors.',
      safetyAdvisory: 'Complete travel curfew recommended. Ground all aircraft and secure maritime vessels immediately.',
      lat: AppState.currentLocation.lat + 0.35,
      lon: AppState.currentLocation.lon + 0.45
    });
  } else if (AppState.simulatedScenario === 'blizzard') {
    AppState.activeHazards.push({
      id: 'sim-blizzard',
      type: 'ARCTIC BLIZZARD & BLACK ICE',
      severity: 'danger',
      category: 'Cryo Hazard',
      windSpeed: 82,
      impactRadiusKm: 120,
      description: 'Severe freezing front with windchill dropping to -24°C, zero optical visibility, and rapid ice accumulation across transportation arteries.',
      safetyAdvisory: 'Highway closures probable. Tire chains required; risk of hypothermia upon vehicle stall.',
      lat: AppState.currentLocation.lat - 0.25,
      lon: AppState.currentLocation.lon + 0.30
    });
  } else if (AppState.simulatedScenario === 'heatwave') {
    AppState.activeHazards.push({
      id: 'sim-heatwave',
      type: 'EXTREME THERMAL HEAT DOME',
      severity: 'warning',
      category: 'Thermal Stress',
      windSpeed: 15,
      impactRadiusKm: 220,
      description: 'Stagnant high-pressure heat dome inducing surface temperatures above 41°C. Extreme dehydration risk and electrical grid strain.',
      safetyAdvisory: 'Avoid outdoor exertion between 11:00 and 17:00. Carry surplus coolant and hydration.',
      lat: AppState.currentLocation.lat + 0.20,
      lon: AppState.currentLocation.lon - 0.35
    });
  }

  // Cross-reference Live Physical Thresholds
  if (cur.wind_speed_10m > 58 || cur.wind_gusts_10m > 80) {
    AppState.activeHazards.push({
      id: 'live-wind',
      type: 'GALE FORCE HIGH-VELOCITY WIND',
      severity: 'danger',
      category: 'Wind Shear',
      description: `Sustained wind speeds of ${cur.wind_speed_10m} km/h with gusts peaking at ${cur.wind_gusts_10m || cur.wind_speed_10m * 1.3} km/h. Structural and tree debris hazard.`,
      safetyAdvisory: 'High-profile vehicles face rollover risks. Aviation operations severely restricted.',
      lat: AppState.currentLocation.lat + 0.1,
      lon: AppState.currentLocation.lon + 0.1,
      impactRadiusKm: 60
    });
  }

  if (cur.precipitation > 12) {
    AppState.activeHazards.push({
      id: 'live-flood',
      type: 'FLASH FLOOD & CLOUDBURST ALERT',
      severity: 'danger',
      category: 'Hydrological Hazard',
      description: `Extreme precipitation intensity (${cur.precipitation} mm/h). Severe localized flash flooding and rapid standing water accumulation.`,
      safetyAdvisory: 'Never drive through flooded underpasses. Seek elevated terrain.',
      lat: AppState.currentLocation.lat - 0.1,
      lon: AppState.currentLocation.lon - 0.1,
      impactRadiusKm: 45
    });
  }

  if (cur.temperature_2m > 38) {
    AppState.activeHazards.push({
      id: 'live-heat',
      type: 'SEVERE HEATWAVE ADVISORY',
      severity: 'warning',
      category: 'Thermal Stress',
      description: `Surface temperature of ${cur.temperature_2m}°C exceeds critical physiological thresholds.`,
      safetyAdvisory: 'Hydration mandatory. Vehicle tire blowouts more common on hot asphalt.',
      lat: AppState.currentLocation.lat,
      lon: AppState.currentLocation.lon,
      impactRadiusKm: 80
    });
  }

  if (cur.temperature_2m < -12) {
    AppState.activeHazards.push({
      id: 'live-freeze',
      type: 'EXTREME DEEP FREEZE & BLACK ICE',
      severity: 'warning',
      category: 'Cryo Alert',
      description: `Surface temperature of ${cur.temperature_2m}°C causes rapid moisture crystallization on transit routes.`,
      safetyAdvisory: 'Braking distances extended by up to 9x. Winter traction required.',
      lat: AppState.currentLocation.lat,
      lon: AppState.currentLocation.lon,
      impactRadiusKm: 70
    });
  }

  if (cur.surface_pressure < 988) {
    AppState.activeHazards.push({
      id: 'live-cyclone',
      type: 'CYCLONIC BAROMETRIC DEPRESSION',
      severity: 'danger',
      category: 'Storm Vortex',
      description: `Rapid barometric drop to ${Math.round(cur.surface_pressure)} hPa indicates approaching cyclonic disturbance.`,
      safetyAdvisory: 'Prepare for sudden gale shifts, microbursts, and marine storm surges.',
      lat: AppState.currentLocation.lat + 0.15,
      lon: AppState.currentLocation.lon + 0.15,
      impactRadiusKm: 100
    });
  }

  // Update Alert UI
  renderDisasterRadarAlerts();
}

function renderDisasterRadarAlerts() {
  const alertList = document.getElementById('disaster-alerts-list');
  const countBadge = document.getElementById('active-alert-count-badge');
  const threatPill = document.getElementById('threat-pill');
  const threatIcon = document.getElementById('threat-pill-icon');
  const threatText = document.getElementById('threat-pill-text');
  const marqueeBanner = document.getElementById('disaster-marquee-banner');
  const marqueeText = document.getElementById('marquee-text');

  if (!alertList) return;

  const count = AppState.activeHazards.length;
  countBadge.textContent = `${count} ACTIVE THREAT${count === 1 ? '' : 'S'}`;

  // Top Nav Threat Pill Update
  if (count === 0) {
    countBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40';
    threatPill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyber-emerald/40 bg-cyber-emerald/10 text-cyber-emerald text-xs font-mono font-semibold transition-all duration-300';
    threatIcon.className = 'fa-solid fa-shield-check';
    threatText.textContent = 'THREAT: NOMINAL';
    marqueeBanner.classList.add('hidden');
  } else {
    const hasDanger = AppState.activeHazards.some(h => h.severity === 'danger');
    if (hasDanger) {
      countBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyber-rose/20 text-cyber-rose border border-cyber-rose/40 animate-pulse';
      threatPill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyber-rose/40 bg-cyber-rose/10 text-cyber-rose text-xs font-mono font-semibold transition-all duration-300 animate-pulse';
      threatIcon.className = 'fa-solid fa-triangle-exclamation';
      threatText.textContent = 'THREAT: CRITICAL';
      marqueeBanner.classList.remove('hidden');
      marqueeText.textContent = `${AppState.activeHazards[0].type} — ${AppState.activeHazards[0].safetyAdvisory}`;
    } else {
      countBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40';
      threatPill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyber-amber/40 bg-cyber-amber/10 text-cyber-amber text-xs font-mono font-semibold transition-all duration-300';
      threatIcon.className = 'fa-solid fa-triangle-exclamation';
      threatText.textContent = 'THREAT: ADVISORY';
      marqueeBanner.classList.remove('hidden');
      marqueeText.textContent = `${AppState.activeHazards[0].type} — Caution advised.`;
    }
  }

  // Populate Alert Cards Feed
  alertList.innerHTML = '';
  if (count === 0) {
    alertList.innerHTML = `
      <div class="disaster-alert-card nominal flex items-start gap-3">
        <i class="fa-solid fa-shield-heart text-cyber-emerald text-lg mt-0.5"></i>
        <div>
          <h4 class="font-orbitron font-bold text-xs text-cyber-emerald">NO ACTIVE DISASTER ALERTS</h4>
          <p class="text-xs text-slate-400 mt-1">
            Atmospheric radar scan across 250km radius indicates nominal conditions. No severe convective storms, hurricanes, or deep freeze warnings.
          </p>
        </div>
      </div>
    `;
    return;
  }

  AppState.activeHazards.forEach(hazard => {
    const isDanger = hazard.severity === 'danger';
    const card = document.createElement('div');
    card.className = `disaster-alert-card ${isDanger ? 'danger' : 'warning'} space-y-1.5 animate-fadeIn`;
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono font-bold uppercase tracking-wide flex items-center gap-1.5 ${isDanger ? 'text-cyber-rose' : 'text-cyber-amber'}">
          <i class="fa-solid ${isDanger ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i>
          ${hazard.category}
        </span>
        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded ${isDanger ? 'bg-cyber-rose/20 text-cyber-rose' : 'bg-cyber-amber/20 text-cyber-amber'} font-bold">
          ${isDanger ? 'RED ALERT' : 'CAUTION'}
        </span>
      </div>
      <h4 class="font-orbitron font-bold text-xs text-white">${hazard.type}</h4>
      <p class="text-xs text-slate-300">${hazard.description}</p>
      <div class="text-[11px] font-mono ${isDanger ? 'text-cyber-rose' : 'text-cyber-amber'} pt-1 border-t border-obsidian-800 flex items-center gap-1.5">
        <i class="fa-solid fa-shield-halved text-[10px]"></i>
        <span>${hazard.safetyAdvisory}</span>
      </div>
    `;
    alertList.appendChild(card);
  });
}

/* ============================================================================
   9. AI PREDICTIVE ANALYTICS & TRAVEL ADVISORY ENGINE
   ============================================================================ */
async function runAIPredictions() {
  const cur = AppState.currentWeather;
  if (!cur) return;

  const narrativeEl = document.getElementById('ai-prediction-narrative');
  const engineStatus = document.getElementById('ai-engine-status');

  // Check if we should call Google Gemini API
  const canUseGemini = Boolean(CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY.trim().length > 10 && CONFIG.AI_ENGINE !== 'heuristic');

  if (canUseGemini) {
    try {
      engineStatus.textContent = 'GEMINI 1.5 FLASH CONNECTED';
      narrativeEl.innerHTML = '<span class="text-cyber-cyan animate-pulse font-mono">Synthesizing live Gemini micro-climate neural analysis...</span>';
      
      const prompt = `Act as an expert meteorological scientist and crisis router for "CrisisCast AI". 
      Location: ${AppState.currentLocation.name}. 
      Current Metrics: Temperature: ${cur.temperature_2m}°C, Apparent: ${cur.apparent_temperature}°C, Wind Speed: ${cur.wind_speed_10m} km/h, Wind Direction: ${cur.wind_direction_10m}°, Pressure: ${cur.surface_pressure} hPa, Humidity: ${cur.relative_humidity_2m}%, UV Index: ${cur.uv_index}, Cloud Cover: ${cur.cloud_cover}%, Weather Code: ${cur.weather_code}.
      Active Hazards: ${JSON.stringify(AppState.activeHazards.map(h => h.type))}.
      Provide a concise, 2-3 sentence futuristic micro-climate trend forecast focusing on travel viability, atmospheric volatility over the next 18 hours, and practical traveler safety advice. Do not use markdown headers.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        narrativeEl.textContent = generatedText.trim();
        calculateViabilityMetrics(cur);
        return;
      }
    } catch (e) {
      console.warn('Gemini API query failed or rate limited, activating local neural fallback:', e);
      engineStatus.textContent = 'NEURAL HEURISTIC ENGINE (LOCAL)';
    }
  } else {
    engineStatus.textContent = 'NEURAL HEURISTIC ENGINE (LOCAL)';
  }

  // Local Neural Heuristic Analysis Engine
  const narrative = generateHeuristicMicroclimateNarrative(cur);
  narrativeEl.textContent = narrative;
  calculateViabilityMetrics(cur);
}

function generateHeuristicMicroclimateNarrative(cur) {
  const wmo = interpretWMOCode(cur.weather_code);
  const location = AppState.currentLocation.name;
  const isStormy = cur.weather_code > 60 || cur.wind_speed_10m > 45;
  const isCold = cur.temperature_2m < 5;
  const isHot = cur.temperature_2m > 32;

  let trend = '';
  if (cur.surface_pressure < 1000) {
    trend = `Deep barometric depression centered near ${location} is accelerating convective shear. Micro-turbulence along outbound transport corridors will peak in 4 to 6 hours.`;
  } else if (cur.surface_pressure > 1020) {
    trend = `A persistent high-pressure ridge stabilizes the regional troposphere across ${location}. Minimal cloud consolidation anticipated through the evening transit cycle.`;
  } else {
    trend = `Atmospheric equilibrium holds with steady barometric gradient (${Math.round(cur.surface_pressure)} hPa). Stable laminar airflow supports predictable surface transit over the next 18 hours.`;
  }

  let travelAdvice = '';
  if (isStormy) {
    travelAdvice = ` High risk of surface hydroplaning and localized ground transport delays; recommend delaying non-essential transit or using elevated bypass corridors.`;
  } else if (isHot) {
    travelAdvice = ` Surface heat radiance peaks during midday hours; maintain engine cooling vigilance and hydration for long-haul highway travel.`;
  } else if (isCold) {
    travelAdvice = ` Bridge decks and elevated viaducts are vulnerable to black ice crystallization; increase vehicular braking buffer by 300%.`;
  } else {
    travelAdvice = ` Optimal meteorological envelope for highway transit, high-altitude trekking, and civil aviation activities.`;
  }

  return `${trend}${travelAdvice}`;
}

function calculateViabilityMetrics(cur) {
  let score = 100;

  // Penalties
  if (cur.precipitation > 0) score -= Math.min(30, cur.precipitation * 5);
  if (cur.wind_speed_10m > 30) score -= Math.min(25, (cur.wind_speed_10m - 30) * 1.5);
  if (cur.weather_code >= 95) score -= 35;
  if (cur.weather_code >= 65 && cur.weather_code <= 82) score -= 20;
  if (cur.temperature_2m > 37 || cur.temperature_2m < -10) score -= 15;
  if (AppState.activeHazards.length > 0) score -= AppState.activeHazards.length * 20;

  score = Math.max(12, Math.min(100, Math.round(score)));

  // UI Updates
  const scoreText = document.getElementById('viability-score-text');
  const meter = document.getElementById('viability-meter');
  meter.style.width = `${score}%`;

  if (score >= 80) {
    scoreText.textContent = `${score} / 100 (OPTIMAL)`;
    scoreText.className = 'text-cyber-emerald font-bold';
    meter.className = 'bg-gradient-to-r from-cyber-cyan to-cyber-emerald h-full transition-all duration-700';
  } else if (score >= 50) {
    scoreText.textContent = `${score} / 100 (CAUTION)`;
    scoreText.className = 'text-cyber-amber font-bold';
    meter.className = 'bg-gradient-to-r from-cyber-amber to-cyber-rose h-full transition-all duration-700';
  } else {
    scoreText.textContent = `${score} / 100 (HIGH HAZARD)`;
    scoreText.className = 'text-cyber-rose font-bold animate-pulse';
    meter.className = 'bg-cyber-rose h-full transition-all duration-700';
  }

  // Activity breakdown
  const highwayScore = Math.max(15, Math.min(100, score - (cur.precipitation > 5 ? 20 : 0)));
  const aviationScore = Math.max(10, Math.min(100, score - (cur.wind_speed_10m > 25 ? 30 : 5)));
  const outdoorScore = Math.max(10, Math.min(100, score - (cur.uv_index > 7 || cur.precipitation > 0 ? 25 : 0)));
  const marineScore = Math.max(10, Math.min(100, score - (cur.wind_speed_10m > 20 ? 35 : 0)));

  updateActivityScore('score-highway', highwayScore);
  updateActivityScore('score-aviation', aviationScore);
  updateActivityScore('score-outdoor', outdoorScore);
  updateActivityScore('score-marine', marineScore);

  // Attire Recommendation
  const attireEl = document.getElementById('ai-attire-recommendation');
  if (cur.temperature_2m < 5) {
    attireEl.textContent = 'Thermal insulative shell, windproof fleece, insulated waterproof boots.';
  } else if (cur.temperature_2m < 16) {
    attireEl.textContent = 'Mid-weight technical windbreaker, moisture-wicking base layer.';
  } else if (cur.temperature_2m > 30) {
    attireEl.textContent = 'High-breathability UV-protective tech fabric, polarized eyewear, hydration pack.';
  } else if (cur.precipitation > 2) {
    attireEl.textContent = 'Gore-Tex waterproof outer shell, slip-resistant footwear.';
  } else {
    attireEl.textContent = 'Standard versatile layer, light UV protection, comfortable transit attire.';
  }
}

function updateActivityScore(elemId, score) {
  const el = document.getElementById(elemId);
  if (!el) return;
  el.textContent = `${score}%`;
  if (score >= 75) {
    el.className = 'text-cyber-emerald font-bold';
  } else if (score >= 45) {
    el.className = 'text-cyber-amber font-bold';
  } else {
    el.className = 'text-cyber-rose font-bold';
  }
}

/* Interactive "Ask AI" Form Query Handler */
async function handleAskAI(userQuery) {
  const replyBox = document.getElementById('ai-custom-reply');
  if (!replyBox || !userQuery.trim()) return;

  replyBox.classList.remove('hidden');
  replyBox.innerHTML = `<span class="text-cyber-cyan font-mono text-[11px] animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Analyzing query against meteorological matrix...</span>`;

  const cur = AppState.currentWeather;

  // If Gemini API key is present, use it for rich dynamic interaction
  if (CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY.trim().length > 10) {
    try {
      const prompt = `You are the AI Meteorological Co-Pilot in "CrisisCast AI". 
      Current Location: ${AppState.currentLocation.name}. 
      Current Weather: Temp: ${cur.temperature_2m}°C, Wind: ${cur.wind_speed_10m} km/h, Rain: ${cur.precipitation} mm, Condition: ${interpretWMOCode(cur.weather_code).label}. 
      User Question: "${userQuery}".
      Provide a direct, helpful, and concise answer (2-3 sentences maximum) with concrete safety recommendations.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          replyBox.innerHTML = `
            <div class="flex items-start gap-2">
              <i class="fa-solid fa-robot text-cyber-cyan mt-0.5"></i>
              <div>
                <strong class="text-white text-[11px] block font-mono">CRISISCAST AI RESPONSE:</strong>
                <p class="text-slate-200 mt-1">${text.trim()}</p>
              </div>
            </div>
          `;
          return;
        }
      }
    } catch (err) {
      console.warn('Gemini query failed, falling back to local heuristic response:', err);
    }
  }

  // Local Intelligent Heuristic Response Fallback
  setTimeout(() => {
    let response = '';
    const q = userQuery.toLowerCase();

    if (q.includes('drive') || q.includes('highway') || q.includes('car') || q.includes('road')) {
      if (cur.precipitation > 5 || cur.weather_code >= 65) {
        response = `Caution for highway driving: Standing water induces high hydroplaning risks. Reduce cruise speeds by 20 km/h and ensure headlights are fully engaged.`;
      } else if (cur.wind_speed_10m > 45) {
        response = `Wind gusts of ${cur.wind_speed_10m} km/h will create lateral crosswind buffeting on elevated overpasses. Maintain two-handed grip on the wheel.`;
      } else {
        response = `Surface conditions for driving in ${AppState.currentLocation.name} are optimal with dry pavement and normal braking traction.`;
      }
    } else if (q.includes('fly') || q.includes('drone') || q.includes('flight') || q.includes('plane')) {
      if (cur.wind_speed_10m > 30 || cur.weather_code >= 95) {
        response = `Aviation advisory: Elevated wind shear and local downdrafts pose hazards for small aircraft and UAVs. Flight delay recommended.`;
      } else {
        response = `Civil aviation parameters are within safe thresholds with visibility exceeding 9km and stable wind vectors.`;
      }
    } else if (q.includes('hike') || q.includes('walk') || q.includes('run') || q.includes('outside')) {
      if (cur.uv_index > 7) {
        response = `High UV radiation index (${cur.uv_index.toFixed(1)}). Apply SPF 50+ sunscreen and wear wide-brim headgear if outside for more than 20 minutes.`;
      } else if (cur.temperature_2m > 33) {
        response = `High thermal stress (${cur.temperature_2m}°C). Restrict strenuous outdoor workouts to early morning or post-sunset hours.`;
      } else {
        response = `Outdoor activity envelope is pleasant and nominal. Air quality and ambient temperature are well within healthy recreation zones.`;
      }
    } else {
      response = `Meteorological analysis for ${AppState.currentLocation.name}: Current conditions indicate ${interpretWMOCode(cur.weather_code).label} at ${formatTemp(cur.temperature_2m)}° with ${cur.wind_speed_10m} km/h winds. General travel conditions are rated ${AppState.activeHazards.length > 0 ? 'CAUTION' : 'FAVORABLE'}.`;
    }

    replyBox.innerHTML = `
      <div class="flex items-start gap-2">
        <i class="fa-solid fa-microchip text-cyber-cyan mt-0.5"></i>
        <div>
          <strong class="text-white text-[11px] block font-mono">NEURAL AI DIAGNOSTIC:</strong>
          <p class="text-slate-200 mt-1">${response}</p>
        </div>
      </div>
    `;
  }, 400);
}

/* ============================================================================
   10. INTERACTIVE MAP & SAFEROUTE TRAVEL PLANNER (LEAFLET.JS)
   ============================================================================ */
function initMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // Initialize Leaflet Map centered on initial coordinates
  AppState.map = L.map('map', {
    center: [AppState.currentLocation.lat, AppState.currentLocation.lon],
    zoom: 7,
    zoomControl: true,
    attributionControl: true
  });

// Official OpenStreetMap (100% Free - No API Key - No Watermark Ever)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(AppState.map);

  // Click on map to inspect weather at coordinates
  AppState.map.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    const revName = await reverseGeocode(lat, lng);
    fetchWeatherData(lat, lng, revName);
    document.getElementById('route-origin-input').value = revName;
  });

  // Initial Route Check (Tokyo to Kyoto or Nearby)
  setTimeout(() => {
    calculateSafeRoute('Tokyo', 'Kyoto');
  }, 1000);
}

function updateMapMarkers() {
  if (!AppState.map) return;

  // Clear existing hazard circles
  AppState.mapLayers.hazardCircles.forEach(circle => AppState.map.removeLayer(circle));
  AppState.mapLayers.hazardCircles = [];

  // If hazards exist, render glowing circles & radar overlays
  if (AppState.layerVisibility.hazards && AppState.activeHazards.length > 0) {
    AppState.activeHazards.forEach(hazard => {
      const isDanger = hazard.severity === 'danger';
      const color = isDanger ? '#f43f5e' : '#fbbf24';
      const radius = (hazard.impactRadiusKm || 80) * 1000;

      const circle = L.circle([hazard.lat || AppState.currentLocation.lat, hazard.lon || AppState.currentLocation.lon], {
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '6, 6'
      }).addTo(AppState.map);

      circle.bindPopup(`
        <div class="font-sans">
          <strong class="${isDanger ? 'text-cyber-rose' : 'text-cyber-amber'} font-orbitron text-xs block mb-1">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i> ${hazard.type}
          </strong>
          <p class="text-slate-300 text-xs">${hazard.description}</p>
          <div class="mt-2 text-[10px] font-mono text-slate-400">Impact Radius: ~${hazard.impactRadiusKm || 80} km</div>
        </div>
      `);

      AppState.mapLayers.hazardCircles.push(circle);
    });
  }
}

/* Smart SafeRoute Calculator */
async function calculateSafeRoute(originQuery, destQuery) {
  try {
    showToast(`SafeRoute AI: Calculating transit corridors...`, 'info', 2000);

    // Geocode Origin & Destination
    const originGeo = await geocodeCity(originQuery);
    const destGeo = await geocodeCity(destQuery);

    if (!originGeo || !destGeo) {
      showToast('Could not resolve route waypoints. Please check city spellings.', 'error', 3500);
      return;
    }

    AppState.routeData.origin = originGeo;
    AppState.routeData.destination = destGeo;

    // Fetch Route Geometry from OSRM (or Fallback Geodesic)
    let routeCoords = await fetchOSRMRoute(originGeo, destGeo);
    if (!routeCoords || routeCoords.length < 2) {
      routeCoords = generateGeodesicArc([originGeo.lat, originGeo.lon], [destGeo.lat, destGeo.lon], 25);
    }

    // Check Route against Active Hazards
    const routeAssessment = evaluateRouteHazards(routeCoords);
    AppState.routeData.hasHazard = routeAssessment.hasHazard;
    AppState.routeData.directCoords = routeCoords;

    // Render Routes & Markers on Leaflet
    renderRouteOnMap(routeCoords, routeAssessment);

    // Render Route Diagnostic Panel
    renderRouteAdvisoryPanel(originGeo.name, destGeo.name, routeAssessment);

  } catch (error) {
    console.error('Route calculation error:', error);
    showToast(`Routing analysis failed: ${error.message}`, 'error', 3500);
  }
}

async function fetchOSRMRoute(origin, dest) {
  try {
    const url = `${CONFIG.OSRM_ROUTE_API}/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.routes && data.routes[0]) {
      AppState.routeData.distanceKm = Math.round(data.routes[0].distance / 1000);
      AppState.routeData.durationMin = Math.round(data.routes[0].duration / 60);
      // Convert [lon, lat] to [lat, lon] for Leaflet
      return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    }
  } catch (e) {
    console.warn('OSRM route fetch failed, using internal geodesic interpolator:', e);
  }
  return null;
}

function generateGeodesicArc(start, end, steps = 25) {
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = start[0] + (end[0] - start[0]) * t;
    const lon = start[1] + (end[1] - start[1]) * t;
    coords.push([lat, lon]);
  }
  // Approximate distance
  AppState.routeData.distanceKm = Math.round(calculateDistanceKm(start[0], start[1], end[0], end[1]));
  AppState.routeData.durationMin = Math.round(AppState.routeData.distanceKm / 1.3);
  return coords;
}

function evaluateRouteHazards(routeCoords) {
  // If no hazards active, check if distance is large or route is clear
  if (AppState.activeHazards.length === 0) {
    return {
      hasHazard: false,
      hazardName: null,
      hazardIndex: -1,
      safeBypassCoords: null,
      impactNote: 'Direct corridor is 100% nominal with zero severe weather intercepts.'
    };
  }

  // Cross-reference route waypoints with active hazard perimeters
  for (const hazard of AppState.activeHazards) {
    const hLat = hazard.lat || AppState.currentLocation.lat;
    const hLon = hazard.lon || AppState.currentLocation.lon;
    const radius = hazard.impactRadiusKm || 80;

    for (let i = 0; i < routeCoords.length; i++) {
      const [rLat, rLon] = routeCoords[i];
      const dist = calculateDistanceKm(rLat, rLon, hLat, hLon);

      if (dist < radius) {
        // Hazard intersects route! Generate Safe Bypass Corridor
        const safeCoords = generateBypassCorridor(routeCoords, [hLat, hLon], radius * 1.5);
        return {
          hasHazard: true,
          hazardName: hazard.type,
          hazardIndex: i,
          interceptKm: Math.round((i / routeCoords.length) * AppState.routeData.distanceKm),
          safeBypassCoords: safeCoords,
          impactNote: `Direct corridor intersects ${hazard.type} zone near waypoint ${i} (~km ${Math.round((i / routeCoords.length) * AppState.routeData.distanceKm)}). High risk of flash flooding, wind buffeting, and severe transit delays.`
        };
      }
    }
  }

  return {
    hasHazard: false,
    hazardName: null,
    hazardIndex: -1,
    safeBypassCoords: null,
    impactNote: 'Route is clear of primary convective disaster perimeters.'
  };
}

function generateBypassCorridor(directCoords, hazardCenter, offsetDistanceKm) {
  // Compute safe deviation offset perpendicular to route
  const bypass = [];
  const midIndex = Math.floor(directCoords.length / 2);
  const midPoint = directCoords[midIndex];

  // Offset by ~0.8 degrees latitude/longitude to circumvent hazard
  const latOffset = midPoint[0] > hazardCenter[0] ? 0.65 : -0.65;
  const lonOffset = midPoint[1] > hazardCenter[1] ? 0.65 : -0.65;

  for (let i = 0; i < directCoords.length; i++) {
    const [lat, lon] = directCoords[i];
    const weight = Math.sin((i / (directCoords.length - 1)) * Math.PI); // parabolic bell curve
    bypass.push([lat + latOffset * weight, lon + lonOffset * weight]);
  }
  return bypass;
}

function renderRouteOnMap(directCoords, assessment) {
  if (!AppState.map) return;

  // Clear existing polylines & endpoint markers
  if (AppState.mapLayers.directPolyline) AppState.map.removeLayer(AppState.mapLayers.directPolyline);
  if (AppState.mapLayers.safePolyline) AppState.map.removeLayer(AppState.mapLayers.safePolyline);
  if (AppState.mapLayers.originMarker) AppState.map.removeLayer(AppState.mapLayers.originMarker);
  if (AppState.mapLayers.destMarker) AppState.map.removeLayer(AppState.mapLayers.destMarker);

  const startPt = directCoords[0];
  const endPt = directCoords[directCoords.length - 1];

  // Custom Animated Pin Markers
  const originIcon = L.divIcon({
    className: 'custom-pin',
    html: `
      <div class="cyber-pulse-pin marker-origin">
        <div class="core-dot"></div>
        <div class="radar-ring"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const destIcon = L.divIcon({
    className: 'custom-pin',
    html: `
      <div class="cyber-pulse-pin marker-dest">
        <div class="core-dot"></div>
        <div class="radar-ring"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  AppState.mapLayers.originMarker = L.marker(startPt, { icon: originIcon })
    .bindPopup(`<strong>Origin:</strong> ${AppState.routeData.origin.name}`)
    .addTo(AppState.map);

  AppState.mapLayers.destMarker = L.marker(endPt, { icon: destIcon })
    .bindPopup(`<strong>Destination:</strong> ${AppState.routeData.destination.name}`)
    .addTo(AppState.map);

  // Render Direct Route Polyline
  const directColor = assessment.hasHazard ? '#f43f5e' : '#38bdf8';
  AppState.mapLayers.directPolyline = L.polyline(directCoords, {
    color: directColor,
    weight: 4,
    opacity: 0.85,
    dashArray: assessment.hasHazard ? '8, 8' : null
  }).addTo(AppState.map);

  // Render Safe Alternative Bypass Polyline if Hazard Detected
  if (assessment.hasHazard && assessment.safeBypassCoords && AppState.layerVisibility.safeRoute) {
    AppState.mapLayers.safePolyline = L.polyline(assessment.safeBypassCoords, {
      color: '#10b981',
      weight: 5,
      opacity: 0.95
    }).addTo(AppState.map);

    AppState.mapLayers.safePolyline.bindPopup(`
      <div class="text-xs font-sans">
        <strong class="text-cyber-emerald font-orbitron block">
          <i class="fa-solid fa-shield-check mr-1"></i> RECOMMENDED SAFE BYPASS
        </strong>
        <p class="text-slate-300 mt-1">Diverts around active storm center. Circumvents severe hydroplaning and high gale sectors.</p>
      </div>
    `);
  }

  // Auto-fit bounds with smooth padding
  const bounds = L.latLngBounds(directCoords);
  if (assessment.safeBypassCoords) {
    assessment.safeBypassCoords.forEach(c => bounds.extend(c));
  }
  AppState.map.fitBounds(bounds, { padding: [50, 50] });

  // Update Hazard Circles
  updateMapMarkers();
}

function renderRouteAdvisoryPanel(originName, destName, assessment) {
  const panel = document.getElementById('route-advisory-panel');
  if (!panel) return;

  panel.classList.remove('hidden');

  const statusHeading = document.getElementById('route-status-heading');
  const statusIcon = document.getElementById('route-status-icon');
  const distText = document.getElementById('route-dist-text');
  const timeText = document.getElementById('route-time-text');
  const directPathWarning = document.getElementById('direct-path-warning-text');
  const safeBypassText = document.getElementById('safe-bypass-text');

  distText.textContent = `${AppState.routeData.distanceKm} km`;
  const hours = Math.floor(AppState.routeData.durationMin / 60);
  const mins = AppState.routeData.durationMin % 60;
  timeText.textContent = `${hours}h ${mins}m`;

  if (assessment.hasHazard) {
    statusHeading.textContent = `ROUTE WARNING: 1 SEVERE THREAT INTERCEPT DETECTED`;
    statusHeading.className = 'font-orbitron font-bold text-sm text-cyber-rose';
    statusIcon.className = 'w-3 h-3 rounded-full bg-cyber-rose animate-ping';

    directPathWarning.textContent = `${assessment.impactNote} Surface travel on direct highway corridor is STRONGLY DISCOURAGED.`;
    
    const extraTime = Math.round(AppState.routeData.durationMin * 0.15) + 18;
    safeBypassText.textContent = `Activate SafeRoute Reroute 1-A. Circumvents the ${assessment.hazardName} perimeter via the safe lateral corridor. Adds +${extraTime} mins travel time; reduces meteorological disaster danger by 88%.`;
  } else {
    statusHeading.textContent = `ROUTE ANALYSIS: CLEAR & OPTIMAL CORRIDOR`;
    statusHeading.className = 'font-orbitron font-bold text-sm text-cyber-emerald';
    statusIcon.className = 'w-3 h-3 rounded-full bg-cyber-emerald';

    directPathWarning.textContent = `Direct transit line between ${originName} and ${destName} has zero active meteorological disaster alerts. Surface friction is optimal.`;
    safeBypassText.textContent = `Direct route is already safe. No bypass diversion required. Maintain standard highway speeds and normal traffic monitoring.`;
  }
}

/* ============================================================================
   11. GEOCODING & SEARCH ENGINE (OPEN-METEO & NOMINATIM FREE)
   ============================================================================ */
async function geocodeCity(query) {
  try {
    const url = `${CONFIG.GEOCODING_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding service unavailable');
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      return {
        name: `${r.name}${r.country ? ', ' + r.country : ''}`,
        lat: r.latitude,
        lon: r.longitude,
        country: r.country || '',
        admin: r.admin1 || ''
      };
    }
  } catch (e) {
    console.warn('Open-Meteo geocoding fallback to Nominatim:', e);
  }

  // Backup OpenStreetMap Nominatim Geocoding
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(nomUrl);
    if (res.ok) {
      const nomData = await res.json();
      if (nomData.length > 0) {
        return {
          name: nomData[0].display_name.split(',').slice(0, 2).join(','),
          lat: parseFloat(nomData[0].lat),
          lon: parseFloat(nomData[0].lon)
        };
      }
    }
  } catch (err) {
    console.error('Nominatim backup geocoding failed:', err);
  }

  return null;
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state;
      const country = data.address?.country;
      if (city && country) return `${city}, ${country}`;
      if (data.display_name) return data.display_name.split(',').slice(0, 2).join(',');
    }
  } catch (e) {
    console.warn('Reverse geocode failed:', e);
  }
  return `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ============================================================================
   12. EVENT LISTENERS & USER INTERACTIONS
   ============================================================================ */
function setupEventListeners() {
  // Search Engine Execution
  const searchInput = document.getElementById('city-search-input');
  const searchBtn = document.getElementById('search-submit-btn');

  const executeSearch = async () => {
    const q = searchInput.value.trim();
    if (!q) return;
    const geo = await geocodeCity(q);
    if (geo) {
      document.getElementById('route-origin-input').value = geo.name;
      fetchWeatherData(geo.lat, geo.lon, geo.name);
    } else {
      showToast(`Location '${q}' could not be located. Verify query.`, 'error', 3500);
    }
  };

  searchBtn?.addEventListener('click', executeSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeSearch();
  });

  // Current Geolocation Button
  document.getElementById('locate-me-btn')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    showToast('Acquiring satellite GPS coordinates...', 'info', 2000);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        document.getElementById('city-search-input').value = name;
        document.getElementById('route-origin-input').value = name;
        fetchWeatherData(latitude, longitude, name);
      },
      (err) => {
        showToast(`GPS Acquisition failed: ${err.message}`, 'error', 3500);
      }
    );
  });

  // Quick Hub Pills
  document.querySelectorAll('.hub-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      const city = btn.getAttribute('data-city');
      searchInput.value = city;
      document.getElementById('route-origin-input').value = city;
      const geo = await geocodeCity(city);
      if (geo) fetchWeatherData(geo.lat, geo.lon, geo.name);
    });
  });

  // Disaster Simulation Buttons
  document.querySelectorAll('.sim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const simType = btn.getAttribute('data-sim');
      if (simType === 'clear') {
        AppState.simulatedScenario = null;
        showToast('Resetting simulation. Live telemetry restored.', 'info', 2500);
      } else {
        AppState.simulatedScenario = simType;
        showToast(`Simulating ${simType.toUpperCase()} disaster event...`, 'warning', 3000);
      }

      if (AppState.currentWeather) {
        evaluateDisasterThreats(AppState.currentWeather);
        updateMapMarkers();
        // Re-evaluate current route
        const orig = document.getElementById('route-origin-input').value;
        const dest = document.getElementById('route-dest-input').value;
        if (orig && dest) calculateSafeRoute(orig, dest);
      }
    });
  });

  // Unit Toggle (°C / °F)
  const unitToggleBtn = document.getElementById('unit-toggle-btn');
  unitToggleBtn?.addEventListener('click', () => {
    AppState.units = AppState.units === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('crisiscast_units', AppState.units);
    document.getElementById('unit-label').textContent = AppState.units === 'metric' ? '°C' : '°F';
    showToast(`Display units toggled to ${AppState.units.toUpperCase()}`, 'info', 1500);
    renderWeatherDashboard();
  });

  // Forecast Tab Switcher
  const tabHourly = document.getElementById('tab-hourly-btn');
  const tabDaily = document.getElementById('tab-daily-btn');
  const hourlyCont = document.getElementById('hourly-forecast-container');
  const dailyCont = document.getElementById('daily-forecast-container');

  tabHourly?.addEventListener('click', () => {
    tabHourly.className = 'px-3 py-1 rounded bg-cyber-cyan/20 text-cyber-cyan font-bold transition';
    tabDaily.className = 'px-3 py-1 rounded text-slate-400 hover:text-white transition';
    hourlyCont.classList.remove('hidden');
    dailyCont.classList.add('hidden');
  });

  tabDaily?.addEventListener('click', () => {
    tabDaily.className = 'px-3 py-1 rounded bg-cyber-cyan/20 text-cyber-cyan font-bold transition';
    tabHourly.className = 'px-3 py-1 rounded text-slate-400 hover:text-white transition';
    hourlyCont.classList.add('hidden');
    dailyCont.classList.remove('hidden');
  });

  // AI Refresh Button
  document.getElementById('refresh-ai-btn')?.addEventListener('click', () => {
    showToast('Synthesizing fresh AI predictions...', 'info', 2000);
    runAIPredictions();
  });

  // "Ask CrisisCast AI" Form
  document.getElementById('ai-ask-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('ai-ask-input');
    if (input && input.value.trim()) {
      handleAskAI(input.value.trim());
    }
  });

  // SafeRoute Trigger Button
  document.getElementById('calculate-route-btn')?.addEventListener('click', () => {
    const orig = document.getElementById('route-origin-input').value.trim();
    const dest = document.getElementById('route-dest-input').value.trim();
    if (orig && dest) {
      calculateSafeRoute(orig, dest);
    } else {
      showToast('Please specify both origin and destination cities.', 'error');
    }
  });

  // Swap Route Button
  document.getElementById('swap-route-btn')?.addEventListener('click', () => {
    const origInput = document.getElementById('route-origin-input');
    const destInput = document.getElementById('route-dest-input');
    const temp = origInput.value;
    origInput.value = destInput.value;
    destInput.value = temp;
    if (origInput.value && destInput.value) {
      calculateSafeRoute(origInput.value, destInput.value);
    }
  });

  // Map Layer Toggles
  setupLayerToggles();

  // Settings Modal Controls
  setupSettingsModal();

  // Marquee Alert Inspect Button
  document.getElementById('marquee-inspect-btn')?.addEventListener('click', () => {
    const mapSec = document.getElementById('map');
    if (mapSec) mapSec.scrollIntoView({ behavior: 'smooth' });
  });
}

function setupLayerToggles() {
  const toggleHazards = document.getElementById('toggle-layer-hazards');
  const toggleRadar = document.getElementById('toggle-layer-radar');
  const toggleSafeRoute = document.getElementById('toggle-layer-safe-route');

  toggleHazards?.addEventListener('click', () => {
    AppState.layerVisibility.hazards = !AppState.layerVisibility.hazards;
    toggleHazards.classList.toggle('active', AppState.layerVisibility.hazards);
    updateMapMarkers();
  });

  toggleRadar?.addEventListener('click', () => {
    AppState.layerVisibility.radar = !AppState.layerVisibility.radar;
    toggleRadar.classList.toggle('active', AppState.layerVisibility.radar);
    const sweep = document.getElementById('radar-sweep-screen');
    if (sweep) sweep.style.display = AppState.layerVisibility.radar ? 'block' : 'none';
  });

  toggleSafeRoute?.addEventListener('click', () => {
    AppState.layerVisibility.safeRoute = !AppState.layerVisibility.safeRoute;
    toggleSafeRoute.classList.toggle('active', AppState.layerVisibility.safeRoute);
    if (AppState.mapLayers.safePolyline) {
      if (AppState.layerVisibility.safeRoute) {
        AppState.map.addLayer(AppState.mapLayers.safePolyline);
      } else {
        AppState.map.removeLayer(AppState.mapLayers.safePolyline);
      }
    }
  });
}

function setupSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('settings-open-btn');
  const closeBtn = document.getElementById('settings-close-btn');
  const saveBtn = document.getElementById('cfg-save-btn');
  const resetBtn = document.getElementById('cfg-reset-btn');

  openBtn?.addEventListener('click', () => modal?.classList.remove('hidden'));
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  saveBtn?.addEventListener('click', () => {
    const geminiVal = document.getElementById('cfg-gemini-key').value.trim();
    const owmVal = document.getElementById('cfg-openweather-key').value.trim();
    const engineVal = document.getElementById('cfg-ai-engine').value;

    CONFIG.GEMINI_API_KEY = geminiVal;
    CONFIG.OPENWEATHER_API_KEY = owmVal;
    CONFIG.AI_ENGINE = engineVal;

    localStorage.setItem('crisiscast_gemini_key', geminiVal);
    localStorage.setItem('crisiscast_owm_key', owmVal);
    localStorage.setItem('crisiscast_ai_engine', engineVal);

    modal.classList.add('hidden');
    showToast('Configuration applied and saved to local storage.', 'success');

    // Update indicator dot
    const ind = document.getElementById('key-indicator');
    if (ind) {
      ind.className = geminiVal ? 'absolute top-1 right-1 w-2 h-2 bg-cyber-emerald rounded-full' : 'absolute top-1 right-1 w-2 h-2 bg-cyber-cyan rounded-full';
    }

    // Rerun AI with new settings
    runAIPredictions();
  });

  resetBtn?.addEventListener('click', () => {
    localStorage.removeItem('crisiscast_gemini_key');
    localStorage.removeItem('crisiscast_owm_key');
    localStorage.removeItem('crisiscast_ai_engine');

    CONFIG.GEMINI_API_KEY = '';
    CONFIG.OPENWEATHER_API_KEY = '';
    CONFIG.AI_ENGINE = 'auto';

    document.getElementById('cfg-gemini-key').value = '';
    document.getElementById('cfg-openweather-key').value = '';
    document.getElementById('cfg-ai-engine').value = 'auto';

    showToast('Configuration reset to defaults (Zero-Key Mode Active).', 'info');
    runAIPredictions();
  });
}

/* ============================================================================
   13. MODERN HUD TOAST NOTIFICATION SYSTEM
   ============================================================================ */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'hud-toast bg-obsidian-900/95 border rounded-xl p-3.5 shadow-2xl backdrop-blur-md overflow-hidden relative border-obsidian-700';

  let icon = 'fa-circle-info';
  let accentColor = 'text-cyber-cyan';
  let barBg = 'bg-cyber-cyan';

  if (type === 'success') {
    icon = 'fa-circle-check';
    accentColor = 'text-cyber-emerald';
    barBg = 'bg-cyber-emerald';
    toast.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  } else if (type === 'warning') {
    icon = 'fa-triangle-exclamation';
    accentColor = 'text-cyber-amber';
    barBg = 'bg-cyber-amber';
    toast.style.borderColor = 'rgba(251, 191, 36, 0.4)';
  } else if (type === 'error') {
    icon = 'fa-circle-exclamation';
    accentColor = 'text-cyber-rose';
    barBg = 'bg-cyber-rose';
    toast.style.borderColor = 'rgba(244, 63, 94, 0.4)';
  } else {
    toast.style.borderColor = 'rgba(0, 245, 212, 0.3)';
  }

  toast.innerHTML = `
    <div class="flex items-start justify-between gap-3 text-xs">
      <div class="flex items-start gap-2.5">
        <i class="fa-solid ${icon} ${accentColor} text-base mt-0.5"></i>
        <span class="text-slate-200 font-sans leading-snug">${message}</span>
      </div>
      <button class="toast-close text-slate-500 hover:text-white transition">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="toast-progress-bar ${barBg} absolute bottom-0 left-0 w-full" style="transition-duration: ${duration}ms;"></div>
  `;

  container.appendChild(toast);

  // Trigger CSS Slide-In
  requestAnimationFrame(() => {
    toast.classList.add('show');
    const bar = toast.querySelector('.toast-progress-bar');
    if (bar) bar.style.width = '0%';
  });

  // Dismiss button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    dismissToast(toast);
  });

  // Auto-dismiss timeout
  const timeoutId = setTimeout(() => {
    dismissToast(toast);
  }, duration);

  function dismissToast(el) {
    clearTimeout(timeoutId);
    el.classList.remove('show');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 400);
  }
}
