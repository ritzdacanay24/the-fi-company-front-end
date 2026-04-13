-- ============================================================
--  Project Manager: Projects
--  Stores one row per project. Gate inputs are columns; the
--  system-calculated fields (readiness, gate progress,
--  overdue flag) are derived at query time via a view.
-- ============================================================

CREATE TABLE IF NOT EXISTS pm_projects (
  id                            VARCHAR(32)      NOT NULL PRIMARY KEY,  -- e.g. PRJ-12345678

  -- ── Identifiers ──────────────────────────────────────────
  product_name                  VARCHAR(120)     NOT NULL,
  customer                      VARCHAR(100)     NOT NULL,
  project_category              ENUM('New','Revision','Cost Down','Custom')  NOT NULL,
  strategy_type                 ENUM('Growth','Retention','Platform','Sustainment') NOT NULL,

  -- ── Gate #1 – static core inputs ─────────────────────────
  initial_rfp_date              DATE             NOT NULL,
  target_production_date        DATE             NOT NULL,
  volume_estimate               ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  rough_revenue_potential       ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  price_proposal_submitted      TINYINT(1)       NOT NULL DEFAULT 0,
  business_awarded              TINYINT(1)       NOT NULL DEFAULT 0,
  business_awarded_date         DATE             NULL,
  forecast_confirmed            TINYINT(1)       NOT NULL DEFAULT 0,

  -- ── Gate #2-4 inputs ─────────────────────────────────────
  concept_architecture_defined  TINYINT(1)       NOT NULL DEFAULT 0,
  rough_cost_entered            TINYINT(1)       NOT NULL DEFAULT 0,
  preliminary_bom_uploaded      TINYINT(1)       NOT NULL DEFAULT 0,
  long_lead_items_identified    TINYINT(1)       NOT NULL DEFAULT 0,
  long_lead_items_date          DATE             NULL,
  dfm_completed                 TINYINT(1)       NOT NULL DEFAULT 0,
  change_request_log            TEXT             NULL,         -- free-text, one per line
  engineering_release_eta       DATE             NULL,
  proto_qty                     SMALLINT UNSIGNED NULL,
  part_number_mapped            TINYINT(1)       NOT NULL DEFAULT 0,
  eng_checklist_pixel_mapping   TINYINT(1)       NOT NULL DEFAULT 0,
  eng_checklist_installation    TINYINT(1)       NOT NULL DEFAULT 0,
  eng_checklist_work_instruction TINYINT(1)      NOT NULL DEFAULT 0,
  eng_checklist_pdc             TINYINT(1)       NOT NULL DEFAULT 0,
  eng_checklist_quality_docs    TINYINT(1)       NOT NULL DEFAULT 0,

  -- ── Gate #5-6 inputs ─────────────────────────────────────
  functional_validation_complete TINYINT(1)      NOT NULL DEFAULT 0,
  pilot_run_completed_date      DATE             NULL,
  final_bom_approved            TINYINT(1)       NOT NULL DEFAULT 0,
  qc_procedure_defined          TINYINT(1)       NOT NULL DEFAULT 0,
  packaging_instructions_complete TINYINT(1)     NOT NULL DEFAULT 0,
  inventory_strategy_aligned    TINYINT(1)       NOT NULL DEFAULT 0,

  -- ── Gate completion timestamps (set by app when group=100%) ──
  gate1_completed_at            DATE             NULL,
  gate24_completed_at           DATE             NULL,
  gate56_completed_at           DATE             NULL,

  -- ── Audit ────────────────────────────────────────────────
  created_at                    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by                    VARCHAR(80)      NULL,
  updated_by                    VARCHAR(80)      NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  Change log – one row per field edit on any project
-- ============================================================
CREATE TABLE IF NOT EXISTS pm_project_change_log (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id    VARCHAR(32)      NOT NULL,
  field_name    VARCHAR(80)      NOT NULL,
  old_value     TEXT             NULL,
  new_value     TEXT             NULL,
  changed_by    VARCHAR(80)      NULL,
  changed_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_pmpcl_project
    FOREIGN KEY (project_id) REFERENCES pm_projects(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  View – pre-calculates gate % and readiness for the dashboard
-- ============================================================
CREATE OR REPLACE VIEW v_pm_project_dashboard AS
SELECT
  p.id,
  p.product_name,
  p.customer,
  p.project_category,
  p.strategy_type,
  p.initial_rfp_date,
  p.target_production_date,
  p.business_awarded,
  p.created_at,
  p.updated_at,
  p.gate1_completed_at,
  p.gate24_completed_at,
  p.gate56_completed_at,

  -- ── Gate #1 completion % (9 fields) ──────────────────────
  ROUND(
    (
      (CASE WHEN p.customer               <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.product_name           <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.project_category       <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.strategy_type          <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.initial_rfp_date       IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN p.target_production_date IS NOT NULL THEN 1 ELSE 0 END) +
      p.price_proposal_submitted +
      p.business_awarded +
      p.forecast_confirmed
    ) / 9.0 * 100
  ) AS gate1_pct,

  -- ── Gate #2-4 completion % (13 fields) ───────────────────
  ROUND(
    (
      p.concept_architecture_defined +
      p.rough_cost_entered +
      p.preliminary_bom_uploaded +
      p.long_lead_items_identified +
      p.dfm_completed +
      (CASE WHEN p.engineering_release_eta IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN p.proto_qty              IS NOT NULL THEN 1 ELSE 0 END) +
      p.part_number_mapped +
      p.eng_checklist_pixel_mapping +
      p.eng_checklist_installation +
      p.eng_checklist_work_instruction +
      p.eng_checklist_pdc +
      p.eng_checklist_quality_docs
    ) / 13.0 * 100
  ) AS gate24_pct,

  -- ── Gate #5-6 completion % (6 fields) ────────────────────
  ROUND(
    (
      p.functional_validation_complete +
      (CASE WHEN p.pilot_run_completed_date IS NOT NULL THEN 1 ELSE 0 END) +
      p.final_bom_approved +
      p.qc_procedure_defined +
      p.packaging_instructions_complete +
      p.inventory_strategy_aligned
    ) / 6.0 * 100
  ) AS gate56_pct,

  -- ── Overall readiness % (28 total fields) ────────────────
  ROUND(
    (
      (CASE WHEN p.customer               <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.product_name           <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.project_category       <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.strategy_type          <> '' THEN 1 ELSE 0 END) +
      (CASE WHEN p.initial_rfp_date       IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN p.target_production_date IS NOT NULL THEN 1 ELSE 0 END) +
      p.price_proposal_submitted +
      p.business_awarded +
      p.forecast_confirmed +
      p.concept_architecture_defined +
      p.rough_cost_entered +
      p.preliminary_bom_uploaded +
      p.long_lead_items_identified +
      p.dfm_completed +
      (CASE WHEN p.engineering_release_eta IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN p.proto_qty              IS NOT NULL THEN 1 ELSE 0 END) +
      p.part_number_mapped +
      p.eng_checklist_pixel_mapping +
      p.eng_checklist_installation +
      p.eng_checklist_work_instruction +
      p.eng_checklist_pdc +
      p.eng_checklist_quality_docs +
      p.functional_validation_complete +
      (CASE WHEN p.pilot_run_completed_date IS NOT NULL THEN 1 ELSE 0 END) +
      p.final_bom_approved +
      p.qc_procedure_defined +
      p.packaging_instructions_complete +
      p.inventory_strategy_aligned
    ) / 28.0 * 100
  ) AS readiness_pct,

  -- ── Overdue flag ─────────────────────────────────────────
  CASE
    WHEN p.target_production_date IS NOT NULL
     AND p.target_production_date < CURDATE()
    THEN 1
    ELSE 0
  END AS is_overdue,

  -- ── Gate age in days (from initial RFP to today) ─────────
  DATEDIFF(CURDATE(), p.initial_rfp_date) AS gate_age_days,

  -- ── Gate progress days (time spent per group) ────────────
  DATEDIFF(
    COALESCE(p.gate1_completed_at, CURDATE()),
    p.initial_rfp_date
  ) AS gate1_days,

  DATEDIFF(
    COALESCE(p.gate24_completed_at, CURDATE()),
    COALESCE(p.gate1_completed_at, p.initial_rfp_date)
  ) AS gate24_days,

  DATEDIFF(
    COALESCE(p.gate56_completed_at, CURDATE()),
    COALESCE(p.gate24_completed_at, p.initial_rfp_date)
  ) AS gate56_days

FROM pm_projects p;
