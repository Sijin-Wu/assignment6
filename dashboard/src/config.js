/**
 * dashboard.config.js  ─  src/config.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central configuration for all data paths and per-page settings.
 *
 * SETUP INSTRUCTIONS
 * ──────────────────
 * 1. Download the required datasets (links below).
 * 2. Place the files anywhere inside the  public/  folder of this project.
 * 3. Update the path strings below to match where you put them.
 *    Paths are relative to  public/ — so  public/data/nyc/foo.geojson
 *    becomes  '/data/nyc/foo.geojson'  (leading slash, no "public" prefix).
 *
 * DO NOT hard-code data paths anywhere else in the codebase.
 * Every page and component reads its paths from this file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Page 1 · D3 World Maps ──────────────────────────────────────────────────
// Required files:
//   • World GeoJSON (country boundaries)
//     Source: https://github.com/datasets/geo-countries  →  countries.geojson
//   • One or more CSV files with country-level indicators (GDP, population, …)
//     Source: https://data.worldbank.org/indicator
//
export const PAGE1 = {
    /** Path to the world countries GeoJSON (must contain ISO-3 alpha codes). */
    worldGeoJSON: '/data/world/world.geojson',

    /**
     * Each entry maps to one selectable indicator on the world maps.
     * key        – column name in the CSV (must be numeric after parsing)
     * label      – human-readable dropdown label
     * csvPath    – path to the CSV, relative to public/
     * idColumn   – CSV column that holds the ISO-3 country code (for joining)
     * yearColumn – (optional) column that holds the year; omit if data is already
     *              one-row-per-country
     * valueColumn– column that holds the numeric value
     * format     – d3-format string for axis labels / tooltips
     * unit       – short unit string shown in the legend
     */
    indicators: [
        {
            key: 'gdp',
            label: 'GDP (current USD)',
            csvPath: '/data/world/gdp.csv',
            type: 'wide',
            idColumn: 'Country Code',
            nameColumn: 'Country Name',
            format: '$.2s',
            unit: 'USD',
        },
        {
            key: 'gdp_per_capita',
            label: 'GDP per Capita (current USD)',
            type: 'derived',
            sourceIndicators: ['gdp', 'population'],
            format: '$,.0f',
            unit: 'USD',
        },
        {
            key: 'fertility',
            label: 'Fertility Rate',
            csvPath: '/data/world/fertility_rate.csv',
            type: 'wide',
            idColumn: 'REF_AREA',
            nameColumn: 'REF_AREA_LABEL',
            format: '.2f',
            unit: 'births per woman',
        },
        {
            key: 'population',
            label: 'Population',
            csvPath: '/data/world/population.csv',
            type: 'long',
            idColumn: 'Code',
            nameColumn: 'Entity',
            yearColumn: 'Year',
            valueColumn: 'Population',
            format: ',.0f',
            unit: 'people',
        },
        {
            key: 'life_expectancy',
            label: 'Life Expectancy',
            csvPath: '/data/world/life_expectancy.csv',
            type: 'long',
            idColumn: 'Code',
            nameColumn: 'Entity',
            yearColumn: 'Year',
            valueColumn: 'Life expectancy',
            format: '.1f',
            unit: 'years',
        },
        // ── Add more world indicators here ──────────────────────────────────────
        // {
        //   key:         'life_expectancy',
        //   label:       'Life Expectancy',
        //   csvPath:     '/data/world/life_expectancy.csv',
        //   idColumn:    'Country Code',
        //   yearColumn:  'Year',
        //   valueColumn: 'Value',
        //   format:      '.1f',
        //   unit:        'years',
        // },
    ],
}

// ─── Page 2 · D3 + Vega City Maps ────────────────────────────────────────────
// Required files:
//   • City neighborhood / community-district GeoJSON
//     NYC source: https://data.cityofnewyork.us/City-Government/Community-Districts/jp9i-3b7y
//                 Export → GeoJSON
//   • CSV with per-neighborhood indicator values
//     NYC source: https://data.cityofnewyork.us/Housing-Development/Housing-Database-by-Community-District/7ein-sigx
//                 Export → CSV
//
// After downloading, clean the files as described in SUBMISSION.md:
//   • GeoJSON: keep only the join-key property (e.g. commntydst / boro_cd)
//   • CSV: remove the the_geom column to keep the file small
//
export const PAGE2 = {
    /** Display name shown in the page header. */
    cityName: 'New York City',

    /** Path to the neighborhood GeoJSON. */
    geoJSONPath: '/data/nyc/city-neighborhoods.geojson',

    /** Path to the indicator CSV. */
    csvPath: '/data/nyc/housing-units.csv',

    /** Path to the community-district name crosswalk CSV. */
    crosswalkPath: '/data/nyc/cd-crosswalk.csv',

    /** Path to the NYC population by community district CSV. */
    popCsvPath: '/data/nyc/New_York_City_Population_By_Community_Districts_20260316.csv',
    popLabel: 'Population',
    popUnit: 'people',
    popFormat: ',.0f',
    popYears: [
        { key: 'pop1970', year: 1970 },
        { key: 'pop1980', year: 1980 },
        { key: 'pop1990', year: 1990 },
        { key: 'pop2000', year: 2000 },
        { key: 'pop2010', year: 2010 },
    ],

    /**
     * The GeoJSON  properties  field whose value matches the CSV id column.
     * For the NYC Community Districts dataset this is  'commntydst'.
     */
    joinKey: 'commntydst',

    /**
     * TIME SERIES — one metric across multiple years.
     * Rendered as a clickable year timeline above the maps (not a dropdown).
     * All keys must be columns in the CSV.  Add/remove years freely.
     */
    timeSeriesLabel: 'Net Housing Units Completed',
    timeSeriesUnit: 'units',
    timeSeriesFormat: ',.0f',
    years: [
        { key: 'comp2015', year: 2015 },
        { key: 'comp2016', year: 2016 },
        { key: 'comp2017', year: 2017 },
        { key: 'comp2018', year: 2018 },
        { key: 'comp2019', year: 2019 },
        { key: 'comp2020', year: 2020 },
        { key: 'comp2021', year: 2021 },
        { key: 'comp2022', year: 2022 },
        { key: 'comp2023', year: 2023 },
        { key: 'comp2024', year: 2024 },
    ],

    /**
     * SNAPSHOT INDICATORS — separate non-year metrics shown as pill toggles.
     * Add more entries here as you gather additional indicator files/columns.
     * key must match a column header in the CSV exactly.
     */
    snapshotIndicators: [
        { key: 'cenunits20', label: 'Census Units 2020', unit: 'units', format: ',.0f' },
        { key: 'filed', label: 'Filed', unit: 'units', format: ',.0f' },
        { key: 'permitted', label: 'Permitted', unit: 'units', format: ',.0f' },
        // ── Add more snapshot indicators here as you gather data ────────────────
    ],
}

// ─── Page 3 · Mapbox Choropleth ──────────────────────────────────────────────
// Data: LA Housing Affordability Index (HAI) by census tract
//   Source: https://geohub.lacity.org
//   File: la-hai-tracts.geojson
//     → 914 census tract polygons, WGS84
//     → property 'hai_cy'  : Housing Affordability Index (13–126)
//     → property 'geoid'   : 11-digit FIPS census tract ID
//     → property 'tract_name': human-readable tract label
//   The HAI value is already embedded in each GeoJSON feature — no CSV join needed.
//   HAI interpretation: index of 100 = perfectly affordable; <100 = less affordable.
//
export const PAGE3 = {
    mapboxToken: 'pk.YOUR_MAPBOX_TOKEN_HERE',

    /** City name shown in the page header. */
    cityName: 'Los Angeles',

    /**
     * GeoJSON with HAI_CY embedded in each tract feature.
     * No separate CSV join needed for choropleth values.
     */
    geoJSONPath: '/data/la/la-hai-tracts.geojson',

    /** Neighborhood council polygons used for spatial tooltip enrichment. */
    neighborhoodGeoJSONPath: '/data/la/neighborhood-councils.geojson',

    /** The GeoJSON property that holds the numeric choropleth value. */
    valueProperty: 'HAI_CY',

    /** Human-readable label for the legend and tooltip. */
    valueLabel: 'Housing Affordability Index',

    /** d3-format string for tooltip/legend values. */
    valueFormat: '.0f',

    /** More tolerant benchmark than 100 to avoid overly punitive interpretation. */
    affordabilityBaseline: 85,

    /** Color ramp: low HAI (higher cost pressure) → red; high HAI → green */
    colorScheme: 'RdYlGn',

    /** Initial map center [lng, lat] and zoom. */
    center: [-118.35, 34.05],
    zoom: 10,
}

// ─── Page 4 · Mapbox + deck.gl Layer A ───────────────────────────────────────
// Required files:
//   • Point-level dataset (e.g. building permits, 311 calls, tree census …)
//     as GeoJSON or CSV with lat/lng columns.
//     NYC open data: https://opendata.cityofnewyork.us
//
export const PAGE4 = {
    mapboxToken: 'pk.YOUR_MAPBOX_TOKEN_HERE',

    cityName: 'Los Angeles',

    /** GeoJSON produced by filter_permits.py — Point features, one per permit. */
    dataPath: '/data/la/la-building-permits.geojson',

    /** Inclusive year range exposed in the Page 4 UI filters and labels. */
    yearRange: {
        min: 2022,
        max: 2025,
    },

    /** deck.gl layer type rendered on this page. */
    layerType: 'HeatmapLayer',

    /** Heatmap weight property — use 'valuation' so high-value projects
     *  burn brighter, or set to null for uniform weight (density only). */
    weightProperty: null,

    /** Initial map view. */
    center: [-118.35, 34.05],
    zoom: 10,
}

// ─── Page 5 · Mapbox + deck.gl Layer B ───────────────────────────────────────
export const PAGE5 = {
    mapboxToken: 'pk.YOUR_MAPBOX_TOKEN_HERE',

    dataPath: '/data/nyc/page5-data.geojson',

    /** Must be a DIFFERENT deck.gl layer type than Page 4. */
    layerType: 'HexagonLayer',       // change to match what you implement

    center: [-73.94, 40.70],
    zoom: 10,
}