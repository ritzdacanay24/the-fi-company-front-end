-- Normalize forklift categories from unit_number prefix.
UPDATE forklift_information
SET forklift_type = CASE
  WHEN UPPER(TRIM(unit_number)) REGEXP '^SD[0-9]+$' THEN 'Sit Down Forklift'
  WHEN UPPER(TRIM(unit_number)) REGEXP '^SU[0-9]+$' THEN 'Stand Up Forklift'
  WHEN UPPER(TRIM(unit_number)) REGEXP '^CP[0-9]+$' THEN 'Cherry Pickers'
  ELSE forklift_type
END;

-- Collapse duplicate rows by unit_number, keeping the oldest id.
DELETE fi
FROM forklift_information fi
JOIN (
  SELECT
    TRIM(unit_number) AS unit_number,
    MIN(id) AS keep_id
  FROM forklift_information
  WHERE NULLIF(TRIM(unit_number), '') IS NOT NULL
  GROUP BY TRIM(unit_number)
  HAVING COUNT(*) > 1
) d ON TRIM(fi.unit_number) = d.unit_number
WHERE fi.id <> d.keep_id;
