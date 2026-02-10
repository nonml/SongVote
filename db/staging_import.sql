CREATE UNLOGGED TABLE IF NOT EXISTS staging_units (
  unitId TEXT,
  provinceId INT,
  provinceName TEXT,
  divisionNumber INT,
  subDistrictId INT,
  subDistrictName TEXT,
  unitNumber INT,
  unitName TEXT
);

-- \copy staging_units FROM '/path/to/ect66_units.csv' WITH (FORMAT csv, HEADER true);

INSERT INTO provinces (id, name_th)
SELECT DISTINCT provinceId, provinceName
FROM staging_units
WHERE provinceId IS NOT NULL
ON CONFLICT (id) DO UPDATE SET name_th = EXCLUDED.name_th;

INSERT INTO constituencies (province_id, khet_number)
SELECT DISTINCT provinceId, divisionNumber
FROM staging_units
WHERE provinceId IS NOT NULL AND divisionNumber IS NOT NULL
ON CONFLICT (province_id, khet_number) DO NOTHING;

INSERT INTO stations (
  id, constituency_id, subdistrict_id, subdistrict_name, station_number,
  location_name, is_verified_exist, source_ref
)
SELECT
  s.unitId,
  c.id,
  s.subDistrictId,
  COALESCE(s.subDistrictName, 'UNKNOWN'),
  s.unitNumber,
  s.unitName,
  TRUE,
  to_jsonb(s)::text
FROM staging_units s
JOIN constituencies c
  ON c.province_id = s.provinceId
 AND c.khet_number = s.divisionNumber
ON CONFLICT (id) DO UPDATE SET
  constituency_id = EXCLUDED.constituency_id,
  subdistrict_id = EXCLUDED.subdistrict_id,
  subdistrict_name = EXCLUDED.subdistrict_name,
  station_number = EXCLUDED.station_number,
  location_name = EXCLUDED.location_name,
  source_ref = EXCLUDED.source_ref;
