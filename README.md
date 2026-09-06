# CrisisCast AI — SafeRoute Weather & Disaster Radar Intelligence

> A futuristic, dark-themed, client-side meteorological intelligence dashboard and travel rerouting platform. Built with semantic HTML5, modern CSS3 (Tailwind CSS + glassmorphism & HUD aesthetics), and vanilla ES6+ JavaScript.

**Fully client-side capable — 100% compatible with GitHub Pages without any build steps or backend servers.**

---

## ⚡ Key Capabilities & Features

### 1. Global Weather & Telemetry Engine
- **Universal Query Engine**: Search live metrics for any city, region, airport, or geographic coordinate worldwide.
- **Out-of-the-Box Zero-Key Mode**: Leverages high-accuracy **Open-Meteo** and **OpenStreetMap Nominatim** APIs with no API keys or credit card registration required.
- **OpenWeatherMap & WeatherAPI Support**: Optional support for proprietary API keys via the in-app Settings modal or `app.js`.
- **6-Metric Real-time Telemetry Grid**: Wind Velocity & Compass Bearing, Relative Humidity & Dew Point, Barometric Pressure Trends, UV Radiation Index, Optical Visibility, and Precipitation Probability.
- **Forecast Matrices**: 24-hour hourly micro-climate timeline and 7-day extended forecast with high/low temperature spreads.

### 2. Dual-Engine AI Weather Insights & Travel Analytics
- **Direct Gemini 1.5 Flash REST Integration**: Connect your Google Gemini API key to receive dynamic, natural-language micro-climate narratives and travel impact assessments.
- **Client-Side Neural Heuristic Fallback**: Operates automatically if no Gemini key is provided, computing:
  - Atmospheric volatility and thermal equilibrium forecasts over an 18-hour horizon.
  - **Travel Viability Index (0-100)** with color-coded gauge and status rating.
  - **Activity Suitability Matrix**: Highway Transit, Aviation / Drone Ops, Outdoor / Trekking, Marine / Nautical.
  - **Attire & Emergency Gear Advisory**: Dynamically recommended clothing and protective equipment.
- **Interactive "Ask AI" Terminal**: Inquire directly about travel safety, flight feasibility, or weather impacts.

### 3. Natural Disaster Radar & Alert Center
- **Dynamic Threat Cross-Referencing**: Continuously checks physical thresholds for:
  - Gale-force winds (>58 km/h or gusts >80 km/h)
  - Torrential cloudbursts and flash flood risks (>12 mm/h)
  - Extreme heatwaves (>38°C / 100°F)
  - Arctic freezes and black ice (< -12°C)
  - Severe cyclonic barometric depressions (< 988 hPa)
- **Color-Coded Status Badges**:
  - 🟢 **Green (Nominal)**: Safe operating conditions.
  - 🟡 **Yellow (Advisory)**: Caution advised for high-profile vehicles and sensitive activities.
  - 🔴 **Red (Critical Danger)**: Severe hazards with recommended travel curfews and emergency rerouting.
- **Instant Simulation Switcher**: Test how the radar responds under **Hurricane**, **Blizzard**, or **Heatwave** events with a single click.

### 4. Interactive Map & SafeRoute™ Waypoint Rerouting
- **Leaflet.js GIS Engine**: Styled with CartoDB Dark Matter tiles and custom animated radar sweep overlays.
- **Waypoint & Corridor Plotting**: Plots transit paths between any origin and destination city using OSRM routing with geodesic fallback.
- **Automatic Hazard Intercept Detection**: Samples route waypoints against active disaster perimeters.
- **Safe Bypass Path Generation**: When a hazard is detected along the direct path (rendered in glowing red), CrisisCast AI computes an alternative detour corridor (rendered in glowing emerald green) with turn-by-turn delay and risk reduction diagnostics.

---

## 📁 Project Structure

```
crisiscast-ai/
├── index.html        # Semantic HTML5 layout, HUD header, responsive CSS grids, Leaflet container, modals
├── style.css         # Futuristic cyber-meteorology styling, glassmorphism, glowing borders, radar animations
├── app.js            # Modular ES6+ logic: Weather Engine, AI Module, Disaster Radar, Leaflet Routing, Toast System
└── README.md         # Documentation, feature highlights, and GitHub Pages deployment instructions
```

---

## 🚀 Quick Start & Local Testing

### Option A: Open directly in your browser
Simply double-click `index.html` or open it via your favorite browser.

### Option B: Run a local static server
```bash
# Python 3
python -m http.server 8000

# Node.js (via npx)
npx serve .
```
Then navigate to `http://localhost:8000`.

---

## 🌐 Deploy to GitHub Pages in 2 Minutes

1. Initialize a Git repository inside this directory:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: CrisisCast AI"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (e.g., `crisiscast-ai`).
3. Push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/crisiscast-ai.git
   git branch -M main
   git push -u origin main
   ```
4. On GitHub, navigate to **Settings** &rarr; **Pages**.
5. Under **Branch**, select `main` and root folder `/`, then click **Save**.
6. Your application will be live at `https://<your-username>.github.io/crisiscast-ai/`!

---

## 🔑 Adding Your API Keys (Optional)

CrisisCast AI works out of the box with zero configuration! However, to enable the live Google Gemini API or OpenWeatherMap API:

1. Click the **Sliders / Settings icon** in the top right corner of the dashboard.
2. Enter your **Google Gemini API Key** and/or **OpenWeatherMap API Key**.
3. Click **Save & Apply**.
4. The keys will be securely stored in your browser's `localStorage` and used for all subsequent requests.

Alternatively, you can open `app.js` and paste your keys directly into the `CONFIG` object:
```javascript
const CONFIG = {
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  OPENWEATHER_API_KEY: 'YOUR_OPENWEATHER_KEY_HERE',
  // ...
};
```
