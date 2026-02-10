"""Optional helper. Prefer db/staging_import.sql with COPY for speed."""

import sys

def main():
  if len(sys.argv) < 2:
    print("Usage: python scripts/import_registry.py /path/to/ect66_units.csv")
    return
  path = sys.argv[1]
  print("CSV path:", path)
  print("Run: psql <conn> -f db/staging_import.sql")
  print("Then: \copy staging_units FROM '...csv...' WITH (FORMAT csv, HEADER true);")
  print("Then run the INSERT statements in staging_import.sql")

if __name__ == "__main__":
  main()
