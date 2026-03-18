# LA Data Notes (Large File Policy)

This folder intentionally keeps only small/sample files in Git.

## Kept in repository
- `la-building-permits-small.geojson` (sample points for Page 4)
- `la-hai-tracts.geojson`
- `neighborhood-councils.geojson`
- `filter_permits.py`

## Not kept in repository
- `Building_and_Safety.csv` (raw source, very large)
- `la-building-permits.geojson` (full output, very large)

These files are ignored by `dashboard/.gitignore` to avoid GitHub size-limit failures.

## How to download raw permits
Source (LA Open Data):
- https://data.lacity.org/A-Prosperous-City/Building-and-Safety-Permit-Information/yv23-pmwf

Export as CSV and save it as:
- `dashboard/public/data/la/Building_and_Safety.csv`

## How to regenerate GeoJSON
From `dashboard/public/data/la/` run:

```powershell
python filter_permits.py --input "Building_and_Safety.csv" --output "la-building-permits.geojson" --start 2020-01-01 --end 2025-12-31
```

To create a smaller sample instead:

```powershell
python filter_permits.py --input "Building_and_Safety.csv" --output "la-building-permits-small.geojson" --start 2020-01-01 --end 2020-03-01
```

## Switching app to full data (optional)
Edit `dashboard/src/config.js` and set:

```js
PAGE4.dataPath = '/data/la/la-building-permits.geojson'
```

For shared/team repos, keep the default as sample data.
