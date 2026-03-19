"""
sample_permits_csv.py

Randomly sample rows from a large LA permits CSV, after filtering by issue year.

Example:
  python sample_permits_csv.py \
    --input Building_and_Safety.csv \
    --output Building_and_Safety_small.csv \
    --sample-size 10000 \
    --year-after 2022 \
    --seed 42
"""

import argparse
import csv
import random
from datetime import datetime


def parse_issue_year(value):
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None

    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"):
        try:
            return datetime.strptime(text, fmt).year
        except ValueError:
            continue
    return None


def reservoir_sample_rows(csv_path, sample_size, year_after):
    csv.field_size_limit(10_000_000)

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames or []

        if "ISSUE_DATE" not in headers:
            raise ValueError("Required column 'ISSUE_DATE' not found in input CSV")

        reservoir = []
        eligible_count = 0

        for row in reader:
            year = parse_issue_year(row.get("ISSUE_DATE"))
            if year is None or year <= year_after:
                continue

            eligible_count += 1

            if len(reservoir) < sample_size:
                reservoir.append(row)
            else:
                j = random.randint(1, eligible_count)
                if j <= sample_size:
                    reservoir[j - 1] = row

    return headers, reservoir, eligible_count


def main():
    parser = argparse.ArgumentParser(
        description="Sample a large permits CSV after filtering by issue year"
    )
    parser.add_argument("--input", required=True, help="Path to source CSV")
    parser.add_argument("--output", required=True, help="Path to output CSV")
    parser.add_argument("--sample-size", type=int, default=10000, help="Rows to sample (default: 10000)")
    parser.add_argument("--year-after", type=int, default=2022, help="Keep only ISSUE_DATE year > this value")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible sampling")
    args = parser.parse_args()

    if args.sample_size <= 0:
        raise ValueError("--sample-size must be > 0")

    random.seed(args.seed)

    headers, sample_rows, eligible_count = reservoir_sample_rows(
        csv_path=args.input,
        sample_size=args.sample_size,
        year_after=args.year_after,
    )

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(sample_rows)

    print(f"Input file: {args.input}")
    print(f"Output file: {args.output}")
    print(f"Filter: ISSUE_DATE year > {args.year_after}")
    print(f"Eligible rows: {eligible_count}")
    print(f"Sample rows written: {len(sample_rows)}")


if __name__ == "__main__":
    main()
