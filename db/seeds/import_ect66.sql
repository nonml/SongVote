-- ECT66 Import Script for Thai Election Data
-- This script imports all provinces, constituencies, and stations from ECT66 data
--
-- Usage:
-- 1. First, load the provinces seed data: psql <conn> -f db/seeds/provinces.sql
-- 2. Load your ECT66 CSV into staging_units table
-- 3. Run this script to import constituencies and stations
--
-- ECT66 data format (staging_units):
-- unitId, provinceId, provinceName, divisionNumber, subDistrictId, subDistrictName, unitNumber, unitName

-- Import constituencies from ECT66 data
-- Uses (province_id, khet_number) as the unique constraint
INSERT INTO constituencies (province_id, khet_number)
SELECT DISTINCT provinceId, divisionNumber
FROM staging_units
WHERE provinceId IS NOT NULL AND divisionNumber IS NOT NULL
ON CONFLICT (province_id, khet_number) DO NOTHING;

-- Import stations from ECT66 data
-- Links to constituencies via (province_id, khet_number) lookup
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

-- Verify imports
SELECT 'Provinces: ' || COUNT(*)::text FROM provinces;
SELECT 'Constituencies: ' || COUNT(*)::text FROM constituencies;
SELECT 'Stations: ' || COUNT(*)::text FROM stations;