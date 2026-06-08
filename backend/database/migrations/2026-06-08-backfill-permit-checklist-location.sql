-- Backfill Location field for existing submitted/closed Seismic and DCA tickets.
-- Closed tickets map to statuses: finalized, archived.

UPDATE quality_permit_checklist_tickets
SET
  values_json = JSON_SET(
    COALESCE(values_json, JSON_OBJECT()),
    '$.location',
    'N/A'
  ),
  updated_at = UTC_TIMESTAMP()
WHERE form_type IN ('seismic', 'dca')
  AND status IN ('submitted', 'finalized', 'archived')
  AND (
    values_json IS NULL
    OR JSON_CONTAINS_PATH(values_json, 'one', '$.location') = 0
    OR JSON_UNQUOTE(JSON_EXTRACT(values_json, '$.location')) IS NULL
    OR TRIM(JSON_UNQUOTE(JSON_EXTRACT(values_json, '$.location'))) = ''
  );
