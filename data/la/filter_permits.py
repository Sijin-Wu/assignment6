"""
filter_permits.py  —  Filter LA Building & Safety CSV → compact GeoJSON
─────────────────────────────────────────────────────────────────────────────
USAGE (run from ANY directory, paths can be absolute or relative):

  Windows PowerShell:
    python filter_permits.py `
      --input  "Building_and_Safety.csv" `
      --output "la-building-permits.geojson" `
      --start  2020-01-01 --end 2025-03-01

  Mac / Linux:
    python3 filter_permits.py \
      --input  "Building_and_Safety.csv" \
      --output "la-building-permits.geojson" \
      --start  2020-01-01 --end 2025-03-01

  Diagnose column names without writing output:
    python filter_permits.py --input "Building_and_Safety.csv" --diagnose
─────────────────────────────────────────────────────────────────────────────
"""

import csv
import json
import argparse
import os
import sys
from datetime import datetime

# ── Bounding box for the City of Los Angeles (WGS84) ─────────────────────────
LAT_MIN, LAT_MAX =  33.50,  34.45
LON_MIN, LON_MAX = -118.75, -118.05

# ── Permit types to KEEP ──────────────────────────────────────────────────────
KEEP_PERMIT_TYPES = {
    'Bldg-New',
    'Bldg-Alter/Repair',
    'Bldg-Addition',
    'Swimming-Pool/Spa',
    'Bldg-Demolition',
}

# ── Column name aliases ───────────────────────────────────────────────────────
# The CSV may ship with slightly different capitalisation or BOM prefix.
# We normalise all header names to uppercase and strip whitespace before lookup.
COL = {
    'PERMIT_NBR':      ['PERMIT_NBR', 'PERMIT NBR'],
    'PRIMARY_ADDRESS': ['PRIMARY_ADDRESS', 'ADDRESS'],
    'ZIP_CODE':        ['ZIP_CODE', 'ZIP'],
    'CD':              ['CD'],
    'PERMIT_TYPE':     ['PERMIT_TYPE', 'PERMIT TYPE'],
    'PERMIT_SUB_TYPE': ['PERMIT_SUB_TYPE', 'PERMIT SUB TYPE', 'PERMIT_SUBTYPE'],
    'USE_DESC':        ['USE_DESC', 'USE DESC'],
    'ISSUE_DATE':      ['ISSUE_DATE', 'ISSUE DATE', 'ISSUEDATE'],
    'STATUS_DESC':     ['STATUS_DESC', 'STATUS DESC', 'STATUS'],
    'VALUATION':       ['VALUATION'],
    'LAT':             ['LAT', 'LATITUDE', 'Y'],
    'LON':             ['LON', 'LONGITUDE', 'X'],
    'WORK_DESC':       ['WORK_DESC', 'WORK DESC', 'WORKDESCRIPTION', 'DESCRIPTION'],
}


def build_col_map(headers):
    """Return dict: canonical_name → actual_header, for every column we care about."""
    upper = {h.strip().upper(): h for h in headers}
    result = {}
    for canonical, candidates in COL.items():
        for c in candidates:
            if c.upper() in upper:
                result[canonical] = upper[c.upper()]
                break
    return result


def get(row, col_map, key, default=''):
    col = col_map.get(key)
    return row.get(col, default) if col else default


def parse_date(s):
    s = s.strip()
    if not s:
        return None
    for fmt in ('%m/%d/%Y', '%Y-%m-%d', '%m-%d-%Y'):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def parse_float(s):
    try:
        return float(str(s).strip().replace(',', ''))
    except (ValueError, AttributeError):
        return None


def parse_int(s):
    try:
        return int(float(str(s).strip().replace(',', '')))
    except (ValueError, AttributeError):
        return None


def diagnose(input_path):
    """Print column names and first 3 data rows — helps debug without running full filter."""
    print(f'\n── DIAGNOSE MODE ──────────────────────────────────')
    print(f'File: {input_path}')
    csv.field_size_limit(10_000_000)
    try:
        with open(input_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            print(f'\nColumns ({len(headers)}):')
            for i, h in enumerate(headers):
                print(f'  [{i:>2}] {repr(h)}')

            col_map = build_col_map(headers)
            print(f'\nResolved column mappings:')
            for k, v in col_map.items():
                print(f'  {k:20s} → "{v}"')

            missing = [k for k in COL if k not in col_map]
            if missing:
                print(f'\n⚠ Could not find columns: {missing}')
                print('  LAT and LON are critical — the script will produce 0 features without them.')

            print(f'\nFirst 3 data rows (key fields only):')
            for i, row in enumerate(reader):
                if i >= 3:
                    break
                print(f'\n  Row {i+1}:')
                for k in ['PERMIT_TYPE', 'ISSUE_DATE', 'LAT', 'LON', 'STATUS_DESC']:
                    print(f'    {k:20s} = {repr(get(row, col_map, k))}')
    except FileNotFoundError:
        print(f'\n✗ File not found: {input_path}')
        print('  Make sure the path is correct. Use an absolute path to be safe.')
        print('  Example:  C:\\Users\\you\\Downloads\\Building_and_Safety.csv')
    print()


def main():
    ap = argparse.ArgumentParser(
        description='Filter LA Building & Safety permits CSV → GeoJSON for deck.gl'
    )
    ap.add_argument('--input',    required=True,
                    help='Path to the raw CSV file')
    ap.add_argument('--output',   default='la-building-permits.geojson',
                    help='Output GeoJSON path (default: la-building-permits.geojson)')
    ap.add_argument('--start',    default='2020-01-01',
                    help='Earliest ISSUE_DATE to keep, YYYY-MM-DD (default: 2020-01-01)')
    ap.add_argument('--end',      default='2025-03-01',
                    help='Latest  ISSUE_DATE to keep, YYYY-MM-DD (default: 2025-03-01)')
    ap.add_argument('--diagnose', action='store_true',
                    help='Print column names and sample rows then exit (no output written)')
    args = ap.parse_args()

    # ── Diagnose mode ─────────────────────────────────────────────────────────
    if args.diagnose:
        diagnose(args.input)
        return

    # ── Validate input file ───────────────────────────────────────────────────
    if not os.path.isfile(args.input):
        print(f'\n✗ Input file not found: {args.input}')
        print('  Tip: use an absolute path, e.g.:')
        print('    --input "C:\\Users\\you\\Downloads\\Building_and_Safety.csv"')
        print('  Run with --diagnose to verify the file before filtering.\n')
        sys.exit(1)

    # ── Create output directory if it doesn't exist ───────────────────────────
    out_dir = os.path.dirname(os.path.abspath(args.output))
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
        print(f'Created output directory: {out_dir}')

    # ── Parse date bounds ─────────────────────────────────────────────────────
    try:
        date_start = datetime.strptime(args.start, '%Y-%m-%d')
        date_end   = datetime.strptime(args.end,   '%Y-%m-%d')
    except ValueError as e:
        print(f'✗ Invalid date format: {e}')
        print('  Use YYYY-MM-DD, e.g. --start 2020-01-01 --end 2025-03-01')
        sys.exit(1)

    print(f'\nFilter: ISSUE_DATE between {args.start} and {args.end}')
    print(f'Input:  {args.input}')
    print(f'Output: {args.output}\n')

    csv.field_size_limit(10_000_000)

    features      = []
    total         = 0
    skipped_type  = 0
    skipped_date  = 0
    skipped_coord = 0
    col_map       = None

    try:
        with open(args.input, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            # Build column map from actual headers
            col_map = build_col_map(reader.fieldnames or [])

            # Warn if critical columns are missing
            for critical in ('LAT', 'LON', 'ISSUE_DATE', 'PERMIT_TYPE'):
                if critical not in col_map:
                    print(f'⚠ Warning: could not find column "{critical}" — '
                          f'run --diagnose to see actual column names')

            for row in reader:
                total += 1
                if total % 100_000 == 0:
                    print(f'  … {total:,} rows scanned | {len(features):,} kept')

                # 1. Permit type filter
                ptype = get(row, col_map, 'PERMIT_TYPE').strip()
                if ptype not in KEEP_PERMIT_TYPES:
                    skipped_type += 1
                    continue

                # 2. Date filter
                issue_dt = parse_date(get(row, col_map, 'ISSUE_DATE'))
                if issue_dt is None or not (date_start <= issue_dt <= date_end):
                    skipped_date += 1
                    continue

                # 3. Coordinate filter
                lat = parse_float(get(row, col_map, 'LAT'))
                lon = parse_float(get(row, col_map, 'LON'))
                if lat is None or lon is None:
                    skipped_coord += 1
                    continue
                if not (LAT_MIN <= lat <= LAT_MAX) or not (LON_MIN <= lon <= LON_MAX):
                    skipped_coord += 1
                    continue

                # 4. Build slim GeoJSON feature
                features.append({
                    'type': 'Feature',
                    'geometry': {'type': 'Point', 'coordinates': [lon, lat]},
                    'properties': {
                        'permit_nbr':  get(row, col_map, 'PERMIT_NBR'),
                        'address':     get(row, col_map, 'PRIMARY_ADDRESS'),
                        'zip':         get(row, col_map, 'ZIP_CODE'),
                        'cd':          get(row, col_map, 'CD'),
                        'permit_type': ptype,
                        'sub_type':    get(row, col_map, 'PERMIT_SUB_TYPE'),
                        'use_desc':    get(row, col_map, 'USE_DESC'),
                        'issue_date':  get(row, col_map, 'ISSUE_DATE'),
                        'status':      get(row, col_map, 'STATUS_DESC'),
                        'valuation':   parse_int(get(row, col_map, 'VALUATION')),
                        'work_desc':   get(row, col_map, 'WORK_DESC')[:120],
                    },
                })

    except FileNotFoundError:
        print(f'\n✗ File disappeared during read: {args.input}')
        sys.exit(1)
    except Exception as e:
        print(f'\n✗ Unexpected error while reading CSV: {e}')
        print('  Run with --diagnose to check the file format.')
        sys.exit(1)

    # ── Write output ──────────────────────────────────────────────────────────
    if not features:
        print('\n⚠ No features matched the filters!')
        print('  Possible causes:')
        print('  1. Wrong column names  → run: python filter_permits.py --input ... --diagnose')
        print('  2. Date range too narrow → try --start 2018-01-01 --end 2025-12-31')
        print('  3. Wrong file          → make sure this is the Building & Safety CSV')
        sys.exit(1)

    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump({'type': 'FeatureCollection', 'features': features}, f)
    except Exception as e:
        print(f'\n✗ Could not write output file: {e}')
        print(f'  Tried to write to: {os.path.abspath(args.output)}')
        sys.exit(1)

    size_mb = os.path.getsize(args.output) / 1_048_576
    print(f'\n{"─" * 52}')
    print(f'  Total rows scanned:        {total:>10,}')
    print(f'  Dropped – wrong type:      {skipped_type:>10,}')
    print(f'  Dropped – date out range:  {skipped_date:>10,}')
    print(f'  Dropped – bad/no coords:   {skipped_coord:>10,}')
    print(f'  ─────────────────────────────────────────')
    print(f'  Features kept:             {len(features):>10,}')
    print(f'  Output file size:          {size_mb:>9.1f} MB')
    print(f'  Written to: {args.output}')
    print()


if __name__ == '__main__':
    print(f'\n{"=" * 60}')
    main()