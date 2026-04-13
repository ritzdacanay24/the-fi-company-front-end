<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];
    $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Route: /api/operations/project-manager/{id}
    if (preg_match('#/project-manager/([^/]+)$#', $uri, $m)) {
        $id = $m[1];
        switch ($method) {
            case 'GET':    handleGetOne($pdo, $id);    break;
            case 'PUT':    handleUpdate($pdo, $id);    break;
            case 'DELETE': handleDelete($pdo, $id);    break;
            default:       methodNotAllowed();
        }
    // Route: /api/operations/project-manager
    } elseif (preg_match('#/project-manager/?$#', $uri)) {
        switch ($method) {
            case 'GET':  handleGetAll($pdo); break;
            case 'POST': handleCreate($pdo); break;
            default:     methodNotAllowed();
        }
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// ── GET /project-manager ─────────────────────────────────────────────────────
function handleGetAll(PDO $pdo): void {
    $stmt = $pdo->query('SELECT * FROM v_pm_project_dashboard ORDER BY created_at DESC');
    echo json_encode($stmt->fetchAll());
}

// ── GET /project-manager/{id} ────────────────────────────────────────────────
function handleGetOne(PDO $pdo, string $id): void {
    $stmt = $pdo->prepare('SELECT * FROM pm_projects WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Project not found']);
        return;
    }
    echo json_encode($row);
}

// ── POST /project-manager ────────────────────────────────────────────────────
function handleCreate(PDO $pdo): void {
    $body = getBody();
    $data = validateAndMap($body);
    if (isset($data['_error'])) {
        http_response_code(422);
        echo json_encode(['error' => $data['_error']]);
        return;
    }

    $sql = '
        INSERT INTO pm_projects (
            id, product_name, customer, project_category, strategy_type,
            initial_rfp_date, target_production_date, volume_estimate,
            rough_revenue_potential, price_proposal_submitted,
            business_awarded, business_awarded_date, forecast_confirmed,
            concept_architecture_defined, rough_cost_entered,
            preliminary_bom_uploaded, long_lead_items_identified,
            long_lead_items_date, dfm_completed, change_request_log,
            engineering_release_eta, proto_qty, part_number_mapped,
            eng_checklist_pixel_mapping, eng_checklist_installation,
            eng_checklist_work_instruction, eng_checklist_pdc,
            eng_checklist_quality_docs, functional_validation_complete,
            pilot_run_completed_date, final_bom_approved,
            qc_procedure_defined, packaging_instructions_complete,
            inventory_strategy_aligned, gate1_completed_at,
            gate24_completed_at, gate56_completed_at, created_by
        ) VALUES (
            :id, :product_name, :customer, :project_category, :strategy_type,
            :initial_rfp_date, :target_production_date, :volume_estimate,
            :rough_revenue_potential, :price_proposal_submitted,
            :business_awarded, :business_awarded_date, :forecast_confirmed,
            :concept_architecture_defined, :rough_cost_entered,
            :preliminary_bom_uploaded, :long_lead_items_identified,
            :long_lead_items_date, :dfm_completed, :change_request_log,
            :engineering_release_eta, :proto_qty, :part_number_mapped,
            :eng_checklist_pixel_mapping, :eng_checklist_installation,
            :eng_checklist_work_instruction, :eng_checklist_pdc,
            :eng_checklist_quality_docs, :functional_validation_complete,
            :pilot_run_completed_date, :final_bom_approved,
            :qc_procedure_defined, :packaging_instructions_complete,
            :inventory_strategy_aligned, :gate1_completed_at,
            :gate24_completed_at, :gate56_completed_at, :created_by
        )
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($data);

    $stmt2 = $pdo->prepare('SELECT * FROM v_pm_project_dashboard WHERE id = ?');
    $stmt2->execute([$data[':id']]);
    http_response_code(201);
    echo json_encode($stmt2->fetch());
}

// ── PUT /project-manager/{id} ────────────────────────────────────────────────
function handleUpdate(PDO $pdo, string $id): void {
    // Confirm project exists and snapshot old values for change log
    $stmtOld = $pdo->prepare('SELECT * FROM pm_projects WHERE id = ?');
    $stmtOld->execute([$id]);
    $old = $stmtOld->fetch();
    if (!$old) {
        http_response_code(404);
        echo json_encode(['error' => 'Project not found']);
        return;
    }

    $body = getBody();
    $data = validateAndMap($body);
    if (isset($data['_error'])) {
        http_response_code(422);
        echo json_encode(['error' => $data['_error']]);
        return;
    }

    $sql = '
        UPDATE pm_projects SET
            product_name                  = :product_name,
            customer                      = :customer,
            project_category              = :project_category,
            strategy_type                 = :strategy_type,
            initial_rfp_date              = :initial_rfp_date,
            target_production_date        = :target_production_date,
            volume_estimate               = :volume_estimate,
            rough_revenue_potential       = :rough_revenue_potential,
            price_proposal_submitted      = :price_proposal_submitted,
            business_awarded              = :business_awarded,
            business_awarded_date         = :business_awarded_date,
            forecast_confirmed            = :forecast_confirmed,
            concept_architecture_defined  = :concept_architecture_defined,
            rough_cost_entered            = :rough_cost_entered,
            preliminary_bom_uploaded      = :preliminary_bom_uploaded,
            long_lead_items_identified    = :long_lead_items_identified,
            long_lead_items_date          = :long_lead_items_date,
            dfm_completed                 = :dfm_completed,
            change_request_log            = :change_request_log,
            engineering_release_eta       = :engineering_release_eta,
            proto_qty                     = :proto_qty,
            part_number_mapped            = :part_number_mapped,
            eng_checklist_pixel_mapping   = :eng_checklist_pixel_mapping,
            eng_checklist_installation    = :eng_checklist_installation,
            eng_checklist_work_instruction= :eng_checklist_work_instruction,
            eng_checklist_pdc             = :eng_checklist_pdc,
            eng_checklist_quality_docs    = :eng_checklist_quality_docs,
            functional_validation_complete= :functional_validation_complete,
            pilot_run_completed_date      = :pilot_run_completed_date,
            final_bom_approved            = :final_bom_approved,
            qc_procedure_defined          = :qc_procedure_defined,
            packaging_instructions_complete=:packaging_instructions_complete,
            inventory_strategy_aligned    = :inventory_strategy_aligned,
            gate1_completed_at            = :gate1_completed_at,
            gate24_completed_at           = :gate24_completed_at,
            gate56_completed_at           = :gate56_completed_at,
            updated_by                    = :created_by
        WHERE id = :id
    ';

    $data[':id'] = $id;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($data);

    // Write change log rows for any field that changed
    writeChangeLog($pdo, $id, $old, $data, $body['updated_by'] ?? $body['created_by'] ?? null);

    $stmt2 = $pdo->prepare('SELECT * FROM v_pm_project_dashboard WHERE id = ?');
    $stmt2->execute([$id]);
    echo json_encode($stmt2->fetch());
}

// ── DELETE /project-manager/{id} ─────────────────────────────────────────────
function handleDelete(PDO $pdo, string $id): void {
    $stmt = $pdo->prepare('DELETE FROM pm_projects WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Project not found']);
        return;
    }
    echo json_encode(['success' => true]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function nullableDate(?string $value): ?string {
    if ($value === null || $value === '') return null;
    $d = DateTime::createFromFormat('Y-m-d', $value);
    return $d ? $d->format('Y-m-d') : null;
}

function boolInt(mixed $value): int {
    return $value ? 1 : 0;
}

function validateAndMap(array $b): array {
    if (empty($b['id']))           return ['_error' => 'id is required'];
    if (empty($b['product_name'])) return ['_error' => 'product_name is required'];
    if (empty($b['customer']))     return ['_error' => 'customer is required'];

    $allowedCategory = ['New', 'Revision', 'Cost Down', 'Custom'];
    $allowedStrategy = ['Growth', 'Retention', 'Platform', 'Sustainment'];
    $allowedRange    = ['Low', 'Medium', 'High'];

    if (!in_array($b['project_category'] ?? '', $allowedCategory, true))
        return ['_error' => 'Invalid project_category'];
    if (!in_array($b['strategy_type'] ?? '', $allowedStrategy, true))
        return ['_error' => 'Invalid strategy_type'];

    return [
        ':id'                             => substr(trim($b['id']), 0, 32),
        ':product_name'                   => substr(trim($b['product_name']), 0, 120),
        ':customer'                       => substr(trim($b['customer']), 0, 100),
        ':project_category'               => $b['project_category'],
        ':strategy_type'                  => $b['strategy_type'],
        ':initial_rfp_date'               => nullableDate($b['initial_rfp_date'] ?? null),
        ':target_production_date'         => nullableDate($b['target_production_date'] ?? null),
        ':volume_estimate'                => in_array($b['volume_estimate'] ?? '', $allowedRange, true)
                                                ? $b['volume_estimate'] : 'Medium',
        ':rough_revenue_potential'        => in_array($b['rough_revenue_potential'] ?? '', $allowedRange, true)
                                                ? $b['rough_revenue_potential'] : 'Medium',
        ':price_proposal_submitted'       => boolInt($b['price_proposal_submitted'] ?? false),
        ':business_awarded'               => boolInt($b['business_awarded'] ?? false),
        ':business_awarded_date'          => nullableDate($b['business_awarded_date'] ?? null),
        ':forecast_confirmed'             => boolInt($b['forecast_confirmed'] ?? false),
        ':concept_architecture_defined'   => boolInt($b['concept_architecture_defined'] ?? false),
        ':rough_cost_entered'             => boolInt($b['rough_cost_entered'] ?? false),
        ':preliminary_bom_uploaded'       => boolInt($b['preliminary_bom_uploaded'] ?? false),
        ':long_lead_items_identified'     => boolInt($b['long_lead_items_identified'] ?? false),
        ':long_lead_items_date'           => nullableDate($b['long_lead_items_date'] ?? null),
        ':dfm_completed'                  => boolInt($b['dfm_completed'] ?? false),
        ':change_request_log'             => isset($b['change_request_log'])
                                                ? substr($b['change_request_log'], 0, 4000) : null,
        ':engineering_release_eta'        => nullableDate($b['engineering_release_eta'] ?? null),
        ':proto_qty'                      => isset($b['proto_qty']) && is_numeric($b['proto_qty'])
                                                ? (int)$b['proto_qty'] : null,
        ':part_number_mapped'             => boolInt($b['part_number_mapped'] ?? false),
        ':eng_checklist_pixel_mapping'    => boolInt($b['eng_checklist_pixel_mapping'] ?? false),
        ':eng_checklist_installation'     => boolInt($b['eng_checklist_installation'] ?? false),
        ':eng_checklist_work_instruction' => boolInt($b['eng_checklist_work_instruction'] ?? false),
        ':eng_checklist_pdc'              => boolInt($b['eng_checklist_pdc'] ?? false),
        ':eng_checklist_quality_docs'     => boolInt($b['eng_checklist_quality_docs'] ?? false),
        ':functional_validation_complete' => boolInt($b['functional_validation_complete'] ?? false),
        ':pilot_run_completed_date'       => nullableDate($b['pilot_run_completed_date'] ?? null),
        ':final_bom_approved'             => boolInt($b['final_bom_approved'] ?? false),
        ':qc_procedure_defined'           => boolInt($b['qc_procedure_defined'] ?? false),
        ':packaging_instructions_complete'=> boolInt($b['packaging_instructions_complete'] ?? false),
        ':inventory_strategy_aligned'     => boolInt($b['inventory_strategy_aligned'] ?? false),
        ':gate1_completed_at'             => nullableDate($b['gate1_completed_at'] ?? null),
        ':gate24_completed_at'            => nullableDate($b['gate24_completed_at'] ?? null),
        ':gate56_completed_at'            => nullableDate($b['gate56_completed_at'] ?? null),
        ':created_by'                     => isset($b['created_by'])
                                                ? substr($b['created_by'], 0, 80) : null,
    ];
}

/**
 * Compares old DB row against new mapped values and inserts a change log row
 * for every field that actually changed.
 */
function writeChangeLog(PDO $pdo, string $projectId, array $old, array $mapped, ?string $changedBy): void {
    // Map between DB column names and the :param keys in $mapped
    $fieldMap = [
        'product_name'                   => ':product_name',
        'customer'                       => ':customer',
        'project_category'               => ':project_category',
        'strategy_type'                  => ':strategy_type',
        'initial_rfp_date'               => ':initial_rfp_date',
        'target_production_date'         => ':target_production_date',
        'volume_estimate'                => ':volume_estimate',
        'rough_revenue_potential'        => ':rough_revenue_potential',
        'price_proposal_submitted'       => ':price_proposal_submitted',
        'business_awarded'               => ':business_awarded',
        'business_awarded_date'          => ':business_awarded_date',
        'forecast_confirmed'             => ':forecast_confirmed',
        'concept_architecture_defined'   => ':concept_architecture_defined',
        'rough_cost_entered'             => ':rough_cost_entered',
        'preliminary_bom_uploaded'       => ':preliminary_bom_uploaded',
        'long_lead_items_identified'     => ':long_lead_items_identified',
        'long_lead_items_date'           => ':long_lead_items_date',
        'dfm_completed'                  => ':dfm_completed',
        'change_request_log'             => ':change_request_log',
        'engineering_release_eta'        => ':engineering_release_eta',
        'proto_qty'                      => ':proto_qty',
        'part_number_mapped'             => ':part_number_mapped',
        'eng_checklist_pixel_mapping'    => ':eng_checklist_pixel_mapping',
        'eng_checklist_installation'     => ':eng_checklist_installation',
        'eng_checklist_work_instruction' => ':eng_checklist_work_instruction',
        'eng_checklist_pdc'              => ':eng_checklist_pdc',
        'eng_checklist_quality_docs'     => ':eng_checklist_quality_docs',
        'functional_validation_complete' => ':functional_validation_complete',
        'pilot_run_completed_date'       => ':pilot_run_completed_date',
        'final_bom_approved'             => ':final_bom_approved',
        'qc_procedure_defined'           => ':qc_procedure_defined',
        'packaging_instructions_complete'=> ':packaging_instructions_complete',
        'inventory_strategy_aligned'     => ':inventory_strategy_aligned',
        'gate1_completed_at'             => ':gate1_completed_at',
        'gate24_completed_at'            => ':gate24_completed_at',
        'gate56_completed_at'            => ':gate56_completed_at',
    ];

    $logStmt = $pdo->prepare('
        INSERT INTO pm_project_change_log (project_id, field_name, old_value, new_value, changed_by)
        VALUES (?, ?, ?, ?, ?)
    ');

    foreach ($fieldMap as $col => $param) {
        $oldVal = (string)($old[$col] ?? '');
        $newVal = (string)($mapped[$param] ?? '');
        if ($oldVal !== $newVal) {
            $logStmt->execute([$projectId, $col, $oldVal ?: null, $newVal ?: null, $changedBy]);
        }
    }
}

function methodNotAllowed(): void {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
