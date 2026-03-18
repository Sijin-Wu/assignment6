# LA Data Notes (Reproducible Workflow)

This folder supports two modes for Page 4:

1. Sample mode (small files, safe for Git)
2. Full mode (large local files, not committed)

The repository default is sample mode.

## What is kept in Git
- `la-building-permits-small.geojson` (sample map data)
- `la-hai-tracts.geojson`
- `neighborhood-councils.geojson`
- `filter_permits.py`
- `sample_permits_csv.py`
- `README.md`

## What is local-only (ignored by git)
- `Building_and_Safety.csv` (raw LA permit export)
- `la-building-permits.geojson` (full generated GeoJSON)
- `Building_and_Safety_small.csv` (sampled intermediate CSV)

These are intentionally ignored in `dashboard/.gitignore` so pushes do not fail on GitHub file-size limits.

## Prerequisites
- Python 3.8+
- Run commands from `dashboard/public/data/la/`
- `dashboard/.env` contains `VITE_MAPBOX_TOKEN=...`

## Data source
LA Open Data (Building and Safety Permit Information):
- https://data.lacity.org/A-Prosperous-City/Building-and-Safety-Permit-Information/yv23-pmwf

Download as CSV and save exactly as:
- `dashboard/public/data/la/Building_and_Safety.csv`

---

## Reproduce sample result (recommended for shared repo)

Step 1: Randomly sample 10,000 rows after year 2022.

```powershell
python sample_permits_csv.py --input "Building_and_Safety.csv" --output "Building_and_Safety_small.csv" --sample-size 10000 --year-after 2022 --seed 42
```

Step 2: Convert sampled CSV to GeoJSON used by the app.

```powershell
python filter_permits.py --input "Building_and_Safety_small.csv" --output "la-building-permits-small.geojson" --start 2023-01-01 --end 2025-12-31
```

Step 3: Ensure Page 4 points to sample data in config.

In `dashboard/src/config.js` under `PAGE4`:

```js
dataPath: '/data/la/la-building-permits-small.geojson'
yearRange: { min: 2023, max: 2025 }
```

---

## Reproduce full-data result (local use)

Step 1: Generate full GeoJSON from raw CSV.

```powershell
python filter_permits.py --input "Building_and_Safety.csv" --output "la-building-permits.geojson" --start 2020-01-01 --end 2025-12-31
```

Step 2: Point app to full data in config.

In `dashboard/src/config.js` under `PAGE4`:

```js
dataPath: '/data/la/la-building-permits.geojson'
yearRange: { min: 2020, max: 2025 }
```

Step 3: Run dashboard.

```powershell
cd ../../..
npm run dev
```

---

## Script execution order (important)
1. `sample_permits_csv.py` (optional, only for sampled workflow)
2. `filter_permits.py` (always required to produce map-ready GeoJSON)
3. Update `PAGE4.dataPath` and `PAGE4.yearRange` in `dashboard/src/config.js`
4. Start app and verify Page 4

## Notes for contributors
- Do not commit raw/full permit files.
- Commit only small reproducible artifacts and scripts.
- If you change time range in generation scripts, also update `PAGE4.yearRange` to match.
