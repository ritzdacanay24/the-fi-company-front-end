UPDATE vehicleInformation
SET include_in_inspection_report = COALESCE(include_in_inspection_report, 1)
WHERE include_in_inspection_report IS NULL;

UPDATE forklift_information
SET include_in_inspection_report = COALESCE(include_in_inspection_report, 1)
WHERE include_in_inspection_report IS NULL;
