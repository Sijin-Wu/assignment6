# DSCI 554 Assignment 6 — Vue Dashboard with D3, Vega, Mapbox & deck.gl

An interactive geospatial dashboard built with Vue 3, visualising country-level
world indicators and city-level data for **New York City** and **Los Angeles**.

---

## Live Pages

| Page | Title | Library | Layer / Chart type | Dataset |
|------|-------|---------|-------------------|---------|
| 1 | D3 World Maps | D3.js | Choropleth + Proportional symbol | World Bank (GDP, population) |
| 2 | D3 + Vega City Maps | D3.js · Vega-Embed | Choropleth × 2 | NYC Housing Database |
| 3 | Mapbox Choropleth | Mapbox GL JS | Fill layer | LA Housing Affordability Index |
| 4 | Mapbox + deck.gl Scatter | Mapbox + deck.gl | `ScatterplotLayer` | LA Building Permits 2020–2025 |
| 5 | Mapbox + deck.gl Arc | Mapbox + deck.gl | `ArcLayer` | LA 311 Service Requests 2023 |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Vue 3](https://vuejs.org/) (Options API) + [Vue Router](https://router.vuejs.org/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Styling | [Bootstrap 5](https://getbootstrap.com/) |
| World maps | [D3.js v7](https://d3js.org/) |
| City maps | [D3.js v7](https://d3js.org/) + [Vega-Embed v6](https://github.com/vega/vega-embed) |
| Tile maps | [Mapbox GL JS v3](https://docs.mapbox.com/mapbox-gl-js/) |
| GL layers | [deck.gl v9](https://deck.gl/) (`@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/mapbox`) |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Add your Mapbox token

Open `src/config.js` and replace every `'pk.YOUR_MAPBOX_TOKEN_HERE'` with your
public token. Get a free token at https://account.mapbox.com.

### 3. Download world data (Page 1)

| File | Source |
|------|--------|
| `public/data/world/countries.geojson` | https://github.com/datasets/geo-countries |
| `public/data/world/gdp.csv` | https://data.worldbank.org/indicator/NY.GDP.MKTP.CD |
| `public/data/world/gdp_per_capita.csv` | https://data.worldbank.org/indicator/NY.GDP.PCAP.CD |
| `public/data/world/population.csv` | https://data.worldbank.org/indicator/SP.POP.TOTL |

For World Bank files: click **Download → CSV**, unzip, rename to the filename above.

### 4. Generate the LA building permits file (Page 4)

The full permit dataset is too large for GitHub. Download and filter it:

```bash
# Download from LA Open Data:
# https://data.lacity.org/City-Infrastructure-Service-Requests/
#   Building-and-Safety-Building-Permits-Issued-from-2/pi9x-tg5x
# Export → CSV → save as Building_and_Safety.csv

# Then run the filter script:
python scripts/filter_permits.py \
  --input  "Building_and_Safety.csv" \
  --output "public/data/la/la-building-permits.geojson" \
  --start  2020-01-01 \
  --end    2025-03-01

# Windows PowerShell — quote scoped args:
python scripts/filter_permits.py `
  --input  "Building_and_Safety.csv" `
  --output "public/data/la/la-building-permits.geojson" `
  --start  2020-01-01 --end 2025-03-01
```

> **Skip this step?** The app falls back to `la-building-permits-sample.geojson`
> (500 demo points). The map works but shows sparse data. See `src/config.js →
> PAGE4.dataPath` to switch.

### 5. Run the dev server

```bash
npm run dev
```

---

## Project Structure

```
.
├── public/
│   └── data/
│       ├── world/                         # Page 1 — downloaded by you
│       │   ├── countries.geojson
│       │   ├── gdp.csv
│       │   ├── gdp_per_capita.csv
│       │   └── population.csv
│       ├── nyc/                           # Page 2 — included in repo
│       │   ├── city-neighborhoods.geojson   NYC community district boundaries
│       │   ├── housing-units.csv            Net housing units completed 2010–2024
│       │   └── cd-crosswalk.csv             CD number → borough/neighborhood lookup
│       └── la/                            # Pages 3–5
│           ├── la-hai-tracts.geojson        Housing Affordability Index by tract ✅
│           ├── la-neighborhood-councils.geojson  99 NC boundaries ✅
│           ├── la-cd-offices.geojson        15 Council District office coords ✅
│           ├── la-311-arcs.geojson          5k sampled 311 requests with arc coords ✅
│           ├── la-building-permits-sample.geojson  500-row demo subset ✅
│           └── la-building-permits.geojson  Full filtered permits ⚠ generate locally
│
├── scripts/
│   └── filter_permits.py                  Filters raw LA permit CSV → GeoJSON
│
├── src/
│   ├── config.js                          ← All data paths & settings live here
│   ├── main.js
│   ├── App.vue                            Shell with nav bar
│   ├── router/
│   │   └── index.js
│   ├── pages/
│   │   ├── Page1.vue                      D3 world maps
│   │   ├── Page2.vue                      D3 + Vega city maps
│   │   ├── Page3.vue                      Mapbox choropleth
│   │   ├── Page4.vue                      deck.gl ScatterplotLayer
│   │   └── Page5.vue                      deck.gl ArcLayer
│   └── components/
│       ├── D3WorldChoropleth.vue
│       ├── D3WorldSymbolMap.vue
│       ├── D3CityMap.vue
│       ├── VegaCityMap.vue
│       ├── MapboxChoropleth.vue
│       ├── DeckHeatmap.vue
│       └── DeckArcLayer.vue
│
├── DATA.md                                Detailed data download instructions
├── SUBMISSION.md
└── README.md                              ← you are here
```

---

## Data Sources

### Page 1 — World Indicators
| Dataset | Source | Format |
|---------|--------|--------|
| Country boundaries | [Natural Earth / geo-countries](https://github.com/datasets/geo-countries) | GeoJSON |
| GDP (current USD) | [World Bank NY.GDP.MKTP.CD](https://data.worldbank.org/indicator/NY.GDP.MKTP.CD) | CSV |
| GDP per capita | [World Bank NY.GDP.PCAP.CD](https://data.worldbank.org/indicator/NY.GDP.PCAP.CD) | CSV |
| Population | [World Bank SP.POP.TOTL](https://data.worldbank.org/indicator/SP.POP.TOTL) | CSV |

### Page 2 — New York City Housing
| Dataset | Source | Format |
|---------|--------|--------|
| Community District boundaries | [NYC Open Data — Community Districts](https://data.cityofnewyork.us/City-Government/Community-Districts/jp9i-3b7y) | GeoJSON |
| Housing units by CD | [NYC Open Data — Housing Database by CD](https://data.cityofnewyork.us/Housing-Development/Housing-Database-by-Community-District/7ein-sigx) | CSV |

### Page 3 — LA Housing Affordability
| Dataset | Source | Format |
|---------|--------|--------|
| HAI by census tract | [LA GeoHub — Housing Affordability Index](https://geohub.lacity.org) | GeoJSON |

### Page 4 — LA Building Permits
| Dataset | Source | Format |
|---------|--------|--------|
| Building & Safety permits | [LA Open Data — Building Permits (2020–present)](https://data.lacity.org/City-Infrastructure-Service-Requests/Building-and-Safety-Building-Permits-Issued-from-2/pi9x-tg5x) | CSV → GeoJSON |

### Page 5 — LA 311 Service Requests
| Dataset | Source | Format |
|---------|--------|--------|
| MyLA311 requests 2023 | [LA Open Data — MyLA311 Service Request Data 2023](https://data.lacity.org/City-Infrastructure-Service-Requests/MyLA311-Service-Request-Data-2023/4a4x-mna2) | CSV → GeoJSON |
| CD office locations | Hardcoded from official LA city council website | GeoJSON |

---

## Configuration

All data paths, Mapbox tokens, indicator definitions, and map centers live in
**`src/config.js`**. This is the only file you need to edit for setup. No paths
are hard-coded in any page or component.

```js
// Example: swap Page 4 to use the full permit dataset after running the script
export const PAGE4 = {
  dataPath: '/data/la/la-building-permits.geojson',  // ← change this line
  ...
}
```

---

## Key Engineering Notes

### deck.gl v9 layer compatibility

| Layer | `MapboxOverlay interleaved` | Notes |
|-------|---------------------------|-------|
| `ScatterplotLayer` | `true` | Works perfectly |
| `HeatmapLayer` | `true` | **Broken in v9** — renders nothing |
| `ArcLayer` | `false` | Needs separate canvas; `getHeight` requires pitch > 0 |

Page 4 uses `ScatterplotLayer` with `interleaved: true` (shared GL context, no flicker).  
Page 5 uses standalone `Deck` with `pitch: 45` in `initialViewState` — the only
reliable way to control pitch for `ArcLayer` in deck.gl v9.

### Mapbox feature-state (Page 3)
GeoJSON sources require `promoteId: 'id'` (string, not object) for
`setFeatureState` to work. Feature `id` must be stamped at the top level of
each GeoJSON feature, not inside `properties`.

### Large file handling
`la-building-permits.geojson` can reach 25 MB after filtering from the 500 MB+
raw CSV. It is excluded from git via `.gitignore`. The app ships a 243 KB sample
(`la-building-permits-sample.geojson`) so Page 4 works without the full dataset.

---

## AI Usage

This project was built with assistance from Claude (Anthropic). AI was used for:
- Scaffolding Vue components and data-loading utilities
- Debugging deck.gl v9 API breaking changes (`MapboxLayer` removed, `HeatmapLayer` broken with `interleaved: true`, `ArcLayer` pitch behaviour)
- Writing and iterating the `filter_permits.py` data pipeline script
- Designing the `draft`/`applied` filter state pattern used on Pages 4 and 5
- Cleaning and joining geospatial datasets (GeoJSON property normalisation, WKT coordinate system identification, CD crosswalk table)

All AI interactions are documented per assignment requirements. Final code was
reviewed, tested, and integrated by the student.

---

## License

Data sources are used under their respective open data licenses
(CC0 / CC-BY for World Bank and NYC/LA Open Data portals).
