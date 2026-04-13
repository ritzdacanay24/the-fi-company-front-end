<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../../vendor/autoload.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$database = new DatabaseEyefi();
$db = $database->getConnection();

if (!$db) {
    respond(500, ['success' => false, 'error' => 'Database connection failed']);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = strtolower(trim((string)($_GET['action'] ?? 'bootstrap')));

try {
    if ($method === 'GET' && $action === 'bootstrap') {
        handleBootstrap($db);
        exit;
    }

    if ($method === 'POST') {
        $payload = readJson();

        switch ($action) {
            case 'upsert-ticket':
                handleUpsertTicket($db, $payload);
                exit;
            case 'delete-ticket':
                handleDeleteTicket($db, $payload);
                exit;
            case 'hard-delete':
                handleHardDeleteTicket($db, $payload);
                exit;
            case 'sync-transactions':
                handleSyncTransactions($db, $payload);
                exit;
            case 'sync-directories':
                handleSyncDirectories($db, $payload);
                exit;
            case 'sync-billing-defaults':
                handleSyncBillingDefaults($db, $payload);
                exit;
            default:
                respond(400, ['success' => false, 'error' => 'Invalid action']);
        }
    }

    respond(405, ['success' => false, 'error' => 'Method not allowed']);
} catch (Throwable $e) {
    respond(500, ['success' => false, 'error' => $e->getMessage()]);
}

function handleBootstrap(PDO $db): void {
    $ticketsStmt = $db->query('SELECT * FROM quality_permit_checklist_tickets ORDER BY updated_at DESC');
    $ticketRows = $ticketsStmt->fetchAll(PDO::FETCH_ASSOC);

    $tickets = array_map(static function (array $row): array {
        return [
            'ticketId' => (string)$row['ticket_id'],
            'formType' => (string)$row['form_type'],
            'createdBy' => (string)$row['created_by'],
            'createdAt' => toIso((string)$row['created_at']),
            'updatedAt' => toIso((string)$row['updated_at']),
            'finalizedAt' => $row['finalized_at'] ? toIso((string)$row['finalized_at']) : null,
            'status' => (string)$row['status'],
            'values' => decodeJsonObject((string)$row['values_json']),
            'fieldUpdatedAt' => decodeJsonObject((string)$row['field_updated_at_json']),
            'processNoteRecords' => decodeJsonArray((string)$row['process_notes_json']),
            'financials' => decodeJsonObject((string)$row['financials_json']),
            'attachments' => decodeJsonArray((string)$row['attachments_json']),
        ];
    }, $ticketRows);

    $txStmt = $db->query('SELECT id, ticket_id, type, event_timestamp, actor, details_json FROM quality_permit_checklist_transactions ORDER BY event_timestamp DESC, created_at DESC LIMIT 5000');
    $txRows = $txStmt->fetchAll(PDO::FETCH_ASSOC);

    $transactions = array_map(static function (array $row): array {
        return [
            'id' => (string)$row['id'],
            'ticketId' => (string)$row['ticket_id'],
            'type' => (string)$row['type'],
            'timestamp' => toIso((string)$row['event_timestamp']),
            'actor' => $row['actor'] !== null ? (string)$row['actor'] : null,
            'details' => decodeJsonObjectNullable($row['details_json']),
        ];
    }, $txRows);

    $customers = fetchDirectory($db, 'quality_permit_checklist_customers');
    $architects = fetchDirectory($db, 'quality_permit_checklist_architects');

    $defaultsStmt = $db->query('SELECT form_type, fee_key, label, amount FROM quality_permit_checklist_billing_defaults WHERE is_active = 1 ORDER BY form_type ASC, sort_order ASC, updated_at ASC');
    $defaultsRows = $defaultsStmt->fetchAll(PDO::FETCH_ASSOC);

    $defaults = [
        'seismic' => [],
        'dca' => [],
    ];

    foreach ($defaultsRows as $row) {
        $formType = (string)$row['form_type'];
        if (!isset($defaults[$formType])) {
            continue;
        }

        $defaults[$formType][] = [
            'key' => (string)$row['fee_key'],
            'label' => (string)$row['label'],
            'amount' => round((float)$row['amount'], 2),
            'isApprovedAmount' => false,
        ];
    }

    respond(200, [
        'success' => true,
        'data' => [
            'tickets' => $tickets,
            'transactions' => $transactions,
            'customers' => $customers,
            'architects' => $architects,
            'customerBillingDefaultsByType' => $defaults,
        ],
    ]);
}

function handleUpsertTicket(PDO $db, array $payload): void {
    $ticket = $payload['ticket'] ?? null;
    if (!is_array($ticket)) {
        respond(422, ['success' => false, 'error' => 'ticket is required']);
    }

    $ticketId = trim((string)($ticket['ticketId'] ?? ''));
    $formType = trim((string)($ticket['formType'] ?? ''));
    $status = trim((string)($ticket['status'] ?? 'draft'));

    if ($ticketId === '') {
        respond(422, ['success' => false, 'error' => 'ticket.ticketId is required']);
    }
    if (!in_array($formType, ['seismic', 'dca'], true)) {
        respond(422, ['success' => false, 'error' => 'ticket.formType must be seismic or dca']);
    }
    if (!in_array($status, ['draft', 'saved', 'submitted', 'finalized', 'archived'], true)) {
        respond(422, ['success' => false, 'error' => 'ticket.status is invalid']);
    }

    $createdBy = truncateStr((string)($ticket['createdBy'] ?? 'Unknown User'), 255);
    $createdAt = toDbDateTime((string)($ticket['createdAt'] ?? ''));
    $updatedAt = toDbDateTime((string)($ticket['updatedAt'] ?? ''));
    $finalizedAt = nullableDbDateTime($ticket['finalizedAt'] ?? null);

    $valuesJson = encodeJsonSafe($ticket['values'] ?? new stdClass());
    $fieldUpdatedAtJson = encodeJsonSafe($ticket['fieldUpdatedAt'] ?? new stdClass());
    $processNotesJson = encodeJsonSafe($ticket['processNoteRecords'] ?? []);
    $financialsJson = encodeJsonSafe($ticket['financials'] ?? new stdClass());
    $attachmentsJson = encodeJsonSafe($ticket['attachments'] ?? []);

    $sql = "
        INSERT INTO quality_permit_checklist_tickets (
            ticket_id,
            form_type,
            status,
            created_by,
            created_at,
            updated_at,
            finalized_at,
            values_json,
            field_updated_at_json,
            process_notes_json,
            financials_json,
            attachments_json
        ) VALUES (
            :ticket_id,
            :form_type,
            :status,
            :created_by,
            :created_at,
            :updated_at,
            :finalized_at,
            CAST(:values_json AS JSON),
            CAST(:field_updated_at_json AS JSON),
            CAST(:process_notes_json AS JSON),
            CAST(:financials_json AS JSON),
            CAST(:attachments_json AS JSON)
        )
        ON DUPLICATE KEY UPDATE
            form_type = VALUES(form_type),
            status = VALUES(status),
            created_by = VALUES(created_by),
            created_at = VALUES(created_at),
            updated_at = VALUES(updated_at),
            finalized_at = VALUES(finalized_at),
            values_json = VALUES(values_json),
            field_updated_at_json = VALUES(field_updated_at_json),
            process_notes_json = VALUES(process_notes_json),
            financials_json = VALUES(financials_json),
            attachments_json = VALUES(attachments_json)
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':ticket_id' => $ticketId,
        ':form_type' => $formType,
        ':status' => $status,
        ':created_by' => $createdBy,
        ':created_at' => $createdAt,
        ':updated_at' => $updatedAt,
        ':finalized_at' => $finalizedAt,
        ':values_json' => $valuesJson,
        ':field_updated_at_json' => $fieldUpdatedAtJson,
        ':process_notes_json' => $processNotesJson,
        ':financials_json' => $financialsJson,
        ':attachments_json' => $attachmentsJson,
    ]);

    respond(200, ['success' => true, 'ticketId' => $ticketId]);
}

function handleDeleteTicket(PDO $db, array $payload): void {
    $ticketId = trim((string)($payload['ticketId'] ?? ''));
    if ($ticketId === '') {
        respond(422, ['success' => false, 'error' => 'ticketId is required']);
    }

    $stmt = $db->prepare('UPDATE quality_permit_checklist_tickets SET status = ?, updated_at = ? WHERE ticket_id = ?');
    $stmt->execute(['archived', date('Y-m-d H:i:s'), $ticketId]);

    respond(200, [
        'success' => true,
        'ticketId' => $ticketId,
        'archivedRows' => $stmt->rowCount(),
    ]);
}

function handleHardDeleteTicket(PDO $db, array $payload): void {
    $ticketId = trim((string)($payload['ticketId'] ?? ''));
    if ($ticketId === '') {
        respond(422, ['success' => false, 'error' => 'ticketId is required']);
    }

    $currentUserId = trim((string)($payload['currentUserId'] ?? ''));
    if ($currentUserId === '') {
        respond(403, ['success' => false, 'error' => 'Admin authorization required']);
    }

    $adminStmt = $db->prepare('SELECT admin isAdmin, employeeType FROM db.users WHERE id = ? LIMIT 1');
    $adminStmt->execute([$currentUserId]);
    $userRow = $adminStmt->fetch(PDO::FETCH_ASSOC);
    if (!$userRow) {
        respond(403, ['success' => false, 'error' => 'Admin authorization required']);
    }

    $isAdmin = (string)($userRow['isAdmin'] ?? '0') === '1';
    $employeeType = (int)($userRow['employeeType'] ?? 0);
    if (!$isAdmin && $employeeType === 0) {
        respond(403, ['success' => false, 'error' => 'Admin authorization required']);
    }

    $stmt = $db->prepare('DELETE FROM quality_permit_checklist_tickets WHERE ticket_id = ?');
    $stmt->execute([$ticketId]);

    respond(200, [
        'success' => true,
        'ticketId' => $ticketId,
        'deletedRows' => $stmt->rowCount(),
    ]);
}

function handleSyncTransactions(PDO $db, array $payload): void {
    $transactions = $payload['transactions'] ?? [];
    if (!is_array($transactions)) {
        respond(422, ['success' => false, 'error' => 'transactions must be an array']);
    }

    $sql = "
        INSERT INTO quality_permit_checklist_transactions (
            id,
            ticket_id,
            type,
            event_timestamp,
            actor,
            details_json
        ) VALUES (
            :id,
            :ticket_id,
            :type,
            :event_timestamp,
            :actor,
            :details_json
        )
        ON DUPLICATE KEY UPDATE
            ticket_id = VALUES(ticket_id),
            type = VALUES(type),
            event_timestamp = VALUES(event_timestamp),
            actor = VALUES(actor),
            details_json = VALUES(details_json)
    ";

    $stmt = $db->prepare($sql);
    $synced = 0;

    foreach ($transactions as $tx) {
        if (!is_array($tx)) {
            continue;
        }

        $id = trim((string)($tx['id'] ?? ''));
        $ticketId = trim((string)($tx['ticketId'] ?? ''));
        $type = trim((string)($tx['type'] ?? ''));

        if ($id === '' || $ticketId === '' || $type === '') {
            continue;
        }

        $stmt->execute([
            ':id' => truncateStr($id, 80),
            ':ticket_id' => truncateStr($ticketId, 64),
            ':type' => truncateStr($type, 50),
            ':event_timestamp' => toDbDateTime((string)($tx['timestamp'] ?? '')),
            ':actor' => nullableTruncate($tx['actor'] ?? null, 255),
            ':details_json' => isset($tx['details']) ? encodeJsonSafe($tx['details']) : null,
        ]);

        $synced += 1;
    }

    respond(200, ['success' => true, 'synced' => $synced]);
}

function handleSyncDirectories(PDO $db, array $payload): void {
    $customers = is_array($payload['customers'] ?? null) ? $payload['customers'] : [];
    $architects = is_array($payload['architects'] ?? null) ? $payload['architects'] : [];

    $db->beginTransaction();
    try {
        syncDirectoryTable($db, 'quality_permit_checklist_customers', $customers);
        syncDirectoryTable($db, 'quality_permit_checklist_architects', $architects);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    respond(200, ['success' => true]);
}

function handleSyncBillingDefaults(PDO $db, array $payload): void {
    $input = $payload['customerBillingDefaultsByType'] ?? null;
    if (!is_array($input)) {
        respond(422, ['success' => false, 'error' => 'customerBillingDefaultsByType must be an object']);
    }

    $db->beginTransaction();
    try {
        $deleteStmt = $db->prepare('DELETE FROM quality_permit_checklist_billing_defaults WHERE form_type = ?');
        $insertStmt = $db->prepare('
            INSERT INTO quality_permit_checklist_billing_defaults (
                form_type,
                fee_key,
                label,
                amount,
                sort_order,
                is_active
            ) VALUES (
                :form_type,
                :fee_key,
                :label,
                :amount,
                :sort_order,
                1
            )
            ON DUPLICATE KEY UPDATE
                label = VALUES(label),
                amount = VALUES(amount),
                sort_order = VALUES(sort_order),
                is_active = 1
        ');

        foreach (['seismic', 'dca'] as $formType) {
            $rows = is_array($input[$formType] ?? null) ? $input[$formType] : [];
            $deleteStmt->execute([$formType]);

            $sort = 0;
            foreach ($rows as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $feeKey = trim((string)($row['key'] ?? ''));
                $label = trim((string)($row['label'] ?? ''));
                if ($feeKey === '' || $label === '') {
                    continue;
                }

                $insertStmt->execute([
                    ':form_type' => $formType,
                    ':fee_key' => truncateStr($feeKey, 120),
                    ':label' => truncateStr($label, 255),
                    ':amount' => normalizeAmount($row['amount'] ?? 0),
                    ':sort_order' => $sort,
                ]);

                $sort += 1;
            }
        }

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    respond(200, ['success' => true]);
}

function syncDirectoryTable(PDO $db, string $table, array $rows): void {
    $activeIds = [];

    $upsert = $db->prepare("\n        INSERT INTO {$table} (id, name, is_active)\n        VALUES (:id, :name, 1)\n        ON DUPLICATE KEY UPDATE\n            name = VALUES(name),\n            is_active = 1\n    ");

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $id = trim((string)($row['id'] ?? ''));
        $name = trim((string)($row['name'] ?? ''));
        if ($id === '' || $name === '') {
            continue;
        }

        $id = truncateStr($id, 80);
        $name = truncateStr($name, 255);

        $upsert->execute([
            ':id' => $id,
            ':name' => $name,
        ]);

        $activeIds[] = $id;
    }

    if (count($activeIds) === 0) {
        $db->exec("UPDATE {$table} SET is_active = 0");
        return;
    }

    $placeholders = implode(',', array_fill(0, count($activeIds), '?'));
    $stmt = $db->prepare("UPDATE {$table} SET is_active = 0 WHERE id NOT IN ({$placeholders})");
    $stmt->execute($activeIds);
}

function fetchDirectory(PDO $db, string $table): array {
    $stmt = $db->query("SELECT id, name FROM {$table} WHERE is_active = 1 ORDER BY name ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return array_map(static function (array $row): array {
        return [
            'id' => (string)$row['id'],
            'name' => (string)$row['name'],
        ];
    }, $rows);
}

function readJson(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        respond(400, ['success' => false, 'error' => 'Invalid JSON payload']);
    }

    return $decoded;
}

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

function decodeJsonObject(string $json): array {
    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function decodeJsonObjectNullable($json): ?array {
    if ($json === null || $json === '') {
        return null;
    }
    $decoded = json_decode((string)$json, true);
    return is_array($decoded) ? $decoded : null;
}

function decodeJsonArray(string $json): array {
    $decoded = json_decode($json, true);
    return is_array($decoded) ? array_values($decoded) : [];
}

function encodeJsonSafe($value): string {
    $encoded = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        throw new RuntimeException('Unable to encode JSON payload');
    }
    return $encoded;
}

function toDbDateTime(string $input): string {
    if ($input === '') {
        return date('Y-m-d H:i:s');
    }

    try {
        $dt = new DateTime($input);
        return $dt->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return date('Y-m-d H:i:s');
    }
}

function nullableDbDateTime($input): ?string {
    if ($input === null || $input === '') {
        return null;
    }

    try {
        $dt = new DateTime((string)$input);
        return $dt->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return null;
    }
}

function toIso(string $dbDate): string {
    try {
        $dt = new DateTime($dbDate, new DateTimeZone('UTC'));
        return $dt->format('Y-m-d\TH:i:s\Z');
    } catch (Throwable $e) {
        return gmdate('Y-m-d\TH:i:s\Z');
    }
}

function normalizeAmount($value): float {
    $n = (float)$value;
    if (!is_finite($n) || $n < 0) {
        return 0.0;
    }
    return round($n, 2);
}

function truncateStr(string $value, int $max): string {
    if (mb_strlen($value) <= $max) {
        return $value;
    }
    return mb_substr($value, 0, $max);
}

function nullableTruncate($value, int $max): ?string {
    if ($value === null || $value === '') {
        return null;
    }
    return truncateStr((string)$value, $max);
}
