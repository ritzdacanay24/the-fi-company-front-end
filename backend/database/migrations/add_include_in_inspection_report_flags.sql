ALTER TABLE vehicleInformation
  ADD COLUMN include_in_inspection_report int(11) NOT NULL DEFAULT 1 AFTER active;

ALTER TABLE forklift_information
  ADD COLUMN include_in_inspection_report int(11) NOT NULL DEFAULT 1 AFTER active;
