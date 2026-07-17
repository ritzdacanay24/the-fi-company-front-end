INSERT INTO forklift_information (
  forklift_type,
  unit_number,
  model_name,
  serial_number,
  department,
  fuel_type,
  year,
  created_by,
  created_date,
  active
)
SELECT
  CASE
    WHEN UPPER(src.model_number) REGEXP '^SD[0-9]+$' THEN 'Sit Down Forklift'
    WHEN UPPER(src.model_number) REGEXP '^SU[0-9]+$' THEN 'Stand Up Forklift'
    WHEN UPPER(src.model_number) REGEXP '^CP[0-9]+$' THEN 'Cherry Pickers'
    ELSE 'Forklift'
  END AS forklift_type,
  src.model_number AS unit_number,
  src.model_number AS model_name,
  NULL AS serial_number,
  NULL AS department,
  NULL AS fuel_type,
  NULL AS year,
  0 AS created_by,
  COALESCE(src.created_date, NOW()) AS created_date,
  1 AS active
FROM (
  SELECT
    TRIM(model_number) AS model_number,
    MAX(date_created) AS created_date
  FROM forms.forklift_checklist
  WHERE NULLIF(TRIM(model_number), '') IS NOT NULL
  GROUP BY TRIM(model_number)
) src
WHERE 1 = 1
  AND NOT EXISTS (
    SELECT 1
    FROM forklift_information fi
    WHERE fi.unit_number = src.model_number
  )
;
