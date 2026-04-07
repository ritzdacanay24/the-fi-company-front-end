<?php
/**
 * Inspection Report API
 * Public endpoint – no authentication required for GET (read report by token).
 * Auth required for POST (create/manage share tokens).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

$conn = $database->pdo;
$method  = $_SERVER['REQUEST_METHOD'];
$request = $_GET['request'] ?? '';

// ── Simple session-based auth helper (same pattern as other APIs) ──────────
function getCurrentUserId() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    return $_SESSION['user_id'] ?? null;
}
function getCurrentUserName() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $first = $_SESSION['first_name'] ?? '';
    $last  = $_SESSION['last_name']  ?? '';
    return trim("$first $last") ?: ($_SESSION['username'] ?? null);
}

// ── Auto-create table if missing ────────────────────────────────────────────
function ensureShareTokensTable($conn) {
    $conn->exec("CREATE TABLE IF NOT EXISTS checklist_share_tokens (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        token            VARCHAR(64)  NOT NULL UNIQUE,
        instance_id      INT UNSIGNED NOT NULL,
        visible_item_ids JSON         NULL,
        label            VARCHAR(255) NULL,
        expires_at       DATETIME     NULL,
        created_by       INT UNSIGNED NULL,
        created_by_name  VARCHAR(150) NULL,
        created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        accessed_count   INT UNSIGNED NOT NULL DEFAULT 0,
        last_accessed_at DATETIME     NULL,
        INDEX idx_token       (token),
        INDEX idx_instance_id (instance_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

try {
    ensureShareTokensTable($conn);

    // Build absolute base URL so media links work from any domain
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $baseUrl   = $protocol . ($_SERVER['HTTP_HOST'] ?? 'dashboard.eye-fi.com');

    function toAbsoluteUrl($url, $base) {
        if (!$url) return $url;
        if (strpos($url, 'http://') === 0 || strpos($url, 'https://') === 0) return $url;
        return $base . (strpos($url, '/') === 0 ? $url : '/' . $url);
    }

    // ── GET: download media as attachment (proxy to avoid browser CORS download issues) ──
    if ($method === 'GET' && $request === 'download_media') {
        $url = trim($_GET['url'] ?? '');
        $filename = trim($_GET['filename'] ?? '');

        if (!$url) {
            http_response_code(400);
            echo json_encode(['error' => 'url is required']);
            exit;
        }

        $parsed = parse_url($url);
        if (!$parsed || empty($parsed['scheme'])) {
            // Treat as relative path under current host
            $url = toAbsoluteUrl($url, $baseUrl);
            $parsed = parse_url($url);
        }

        $scheme = strtolower($parsed['scheme'] ?? '');
        $host = strtolower($parsed['host'] ?? '');
        if (!in_array($scheme, ['http', 'https'], true)) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid url scheme']);
            exit;
        }

        // Restrict to trusted hosts only
        $currentHost = strtolower($_SERVER['HTTP_HOST'] ?? '');
        $allowedHosts = array_filter([
            'dashboard.eye-fi.com',
            $currentHost
        ]);

        if (!in_array($host, $allowedHosts, true)) {
            http_response_code(403);
            echo json_encode(['error' => 'host not allowed']);
            exit;
        }

        $path = $parsed['path'] ?? '';
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'heic', 'heif'];
        if ($extension && !in_array($extension, $allowedExt, true)) {
            http_response_code(400);
            echo json_encode(['error' => 'unsupported file type']);
            exit;
        }

        if ($filename === '') {
            $filename = basename($path ?: 'audit-photo.jpg');
        }
        // Sanitize filename for header safety
        $filename = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename);
        if ($filename === '' || $filename === '.' || $filename === '..') {
            $filename = 'audit-photo.jpg';
        }

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);

        $response = curl_exec($ch);
        if ($response === false) {
            $err = curl_error($ch);
            curl_close($ch);
            http_response_code(502);
            echo json_encode(['error' => 'download failed', 'detail' => $err]);
            exit;
        }

        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if ($statusCode < 200 || $statusCode >= 300) {
            http_response_code(502);
            echo json_encode(['error' => 'upstream media unavailable']);
            exit;
        }

        $body = substr($response, $headerSize);
        if ($body === false || $body === '') {
            http_response_code(502);
            echo json_encode(['error' => 'empty media response']);
            exit;
        }

        // Switch to binary response headers
        header_remove('Content-Type');
        header('Content-Type: ' . ($contentType ?: 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . strlen($body));
        header('Cache-Control: private, max-age=0, no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        echo $body;
        exit;
    }

    // ── GET: fetch public report by token ────────────────────────────────
    if ($method === 'GET' && $request === 'get_report') {
        $token = trim($_GET['token'] ?? '');
        if (!$token) {
            http_response_code(400);
            echo json_encode(['error' => 'Token is required.']);
            exit;
        }

        $stmt = $conn->prepare("
            SELECT t.*, i.template_id, i.work_order_number, i.part_number, i.serial_number,
                   i.operator_name, i.status, i.progress_percentage, i.item_completion,
                   i.created_at AS instance_created_at, i.updated_at AS instance_updated_at,
                   i.submitted_at, i.completed_at,
                   tmpl.name AS template_name, tmpl.description AS template_description,
                   tmpl.version AS template_version, tmpl.customer_name
            FROM checklist_share_tokens t
            JOIN checklist_instances i  ON i.id = t.instance_id
            JOIN checklist_templates tmpl ON tmpl.id = i.template_id
            WHERE t.token = :token
              AND (t.expires_at IS NULL OR t.expires_at > NOW())
        ");
        $stmt->execute([':token' => $token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Report not found or link has expired.']);
            exit;
        }

        // Update access tracking
        $conn->prepare("
            UPDATE checklist_share_tokens
            SET accessed_count = accessed_count + 1, last_accessed_at = NOW()
            WHERE token = :token
        ")->execute([':token' => $token]);

        $instanceId      = (int)$row['instance_id'];
        $visibleItemIds  = $row['visible_item_ids'] ? json_decode($row['visible_item_ids'], true) : null;

        // Fetch template items
        // Detect optional columns (schema may vary)
        $hasSubmissionType = $conn->query("SHOW COLUMNS FROM checklist_items LIKE 'submission_type'")->rowCount() > 0;
        $hasLinks          = $conn->query("SHOW COLUMNS FROM checklist_items LIKE 'links'")->rowCount() > 0;

        $selectFields = "ci.id, ci.order_index, ci.title, ci.description,
                   ci.is_required, ci.level, ci.parent_id, ci.photo_requirements";
        if ($hasSubmissionType) { $selectFields .= ", ci.submission_type"; }
        if ($hasLinks)          { $selectFields .= ", ci.links"; }

        $itemStmt = $conn->prepare("
            SELECT $selectFields
            FROM checklist_items ci
            WHERE ci.template_id = :template_id
            ORDER BY ci.order_index ASC
        ");
        $itemStmt->execute([':template_id' => (int)$row['template_id']]);
        $allItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        // Filter items if visible_item_ids is set
        if ($visibleItemIds !== null && is_array($visibleItemIds)) {
            $visibleSet = array_map('intval', $visibleItemIds);
            $allItems = array_filter($allItems, function($item) use ($visibleSet) {
                return in_array((int)$item['id'], $visibleSet, true);
            });
            $allItems = array_values($allItems);
        }

        // Decode JSON columns per item
        foreach ($allItems as &$item) {
            $item['photo_requirements'] = isset($item['photo_requirements']) && $item['photo_requirements']
                ? json_decode($item['photo_requirements'], true) : null;
            $item['links'] = isset($item['links']) && $item['links']
                ? json_decode($item['links'], true) : [];
            if (!isset($item['submission_type'])) {
                $item['submission_type'] = null;
            }
        }
        unset($item);

        // Fetch photos/videos per item
        $photoStmt = $conn->prepare("
            SELECT ps.item_id, ps.file_url, ps.file_type, ps.created_at, ps.id AS submission_id,
                   ps.photo_metadata
            FROM photo_submissions ps
            WHERE ps.instance_id = :instance_id
            ORDER BY ps.item_id ASC, ps.created_at ASC
        ");
        $photoStmt->execute([':instance_id' => $instanceId]);
        $allMedia = $photoStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group media by item_id
        $mediaByItem = [];
        foreach ($allMedia as $media) {
            $mediaByItem[(int)$media['item_id']][] = $media;
        }

        // Parse item_completion for notes/status
        // itemId may be a compound string "instanceId_baseItemId" (e.g. "78_16054") or a plain int.
        // Normalise to the base (database) item ID so the lookup works in both cases.
        $itemCompletion = [];
        try {
            $raw = $row['item_completion'];
            $parsed = is_string($raw) ? json_decode($raw, true) : $raw;
            if (is_array($parsed)) {
                foreach ($parsed as $entry) {
                    if (!isset($entry['itemId'])) continue;
                    $rawId = $entry['itemId'];
                    // Compound format:  "instanceId_baseItemId"  e.g. "78_16054"
                    if (is_string($rawId) && strpos($rawId, '_') !== false) {
                        $parts  = explode('_', $rawId);
                        $baseId = (int)end($parts); // last segment is the real item ID
                    } else {
                        $baseId = (int)$rawId;
                    }
                    if ($baseId > 0) {
                        $itemCompletion[$baseId] = $entry;
                    }
                }
            }
        } catch (Exception $e) { /* ignore */ }

        $instanceStatus = $row['status'] ?? '';
        $instanceDone  = in_array($instanceStatus, ['completed', 'submitted'], true);

        // Merge media + completion into items
        foreach ($allItems as &$item) {
            $itemId  = (int)$item['id'];
            $media   = $mediaByItem[$itemId] ?? [];
            $photos  = array_values(array_filter($media, function($m) { return $m['file_type'] !== 'video'; }));
            $videos  = array_values(array_filter($media, function($m) { return $m['file_type'] === 'video'; }));

            // item_completion JSON stores {itemId, completed, notes, ...}
            // Key may be int or numeric string – PHP array coerces both to int, so lookup works.
            $comp        = isset($itemCompletion[$itemId]) ? $itemCompletion[$itemId] : null;
            $hasMedia    = !empty($photos) || !empty($videos);

            if ($comp !== null && isset($comp['completed'])) {
                // Explicit value from the app's save – trust it.
                // Exception: if the instance is fully done and the item has media, override a stale false.
                $isCompleted = (bool)$comp['completed'] || ($instanceDone && $hasMedia);
            } else {
                // Not tracked in item_completion at all.
                // Fall back to: has media OR instance is completed (operator finished without toggling).
                $isCompleted = $hasMedia || $instanceDone;
            }

            $item['photos']    = array_map(function($p) use ($baseUrl) {
                $meta = isset($p['photo_metadata']) ? json_decode($p['photo_metadata'], true) : null;
                return [
                    'url'    => toAbsoluteUrl($p['file_url'], $baseUrl),
                    'source' => $meta['capture_source'] ?? null
                ];
            }, $photos);
            $item['videos']    = array_map(function($url) use ($baseUrl) { return toAbsoluteUrl($url, $baseUrl); }, array_column($videos, 'file_url'));
            $item['notes']            = $comp !== null ? ($comp['notes']           ?? '') : '';
            $item['completed']        = $isCompleted;
            $item['completed_at']     = $comp['completedAt']       ?? null;
            $item['completed_by']     = $comp['completedByName']   ?? null;
            $item['last_modified_at'] = $comp['lastModifiedAt']    ?? null;
            $item['last_modified_by'] = $comp['lastModifiedByName']?? null;
        }
        unset($item);

        echo json_encode([
            'success'      => true,
            'token'        => $token,
            'label'        => $row['label'],
            'expires_at'   => $row['expires_at'],
            'instance' => [
                'id'                  => $instanceId,
                'work_order_number'   => $row['work_order_number'],
                'part_number'         => $row['part_number'],
                'serial_number'       => $row['serial_number'],
                'operator_name'       => $row['operator_name'],
                'status'              => $row['status'],
                'progress_percentage' => $row['progress_percentage'],
                'template_name'       => $row['template_name'],
                'template_description'=> $row['template_description'],
                'template_version'    => $row['template_version'],
                'customer_name'       => $row['customer_name'],
                'submitted_at'        => $row['submitted_at'],
                'completed_at'        => $row['completed_at'],
                'created_at'          => $row['instance_created_at'],
            ],
            'items'        => array_values($allItems),
            'total_items'  => count($allItems),
        ]);
        exit;
    }

    // ── GET: list share tokens for an instance (auth required) ──────────
    if ($method === 'GET' && $request === 'list_tokens') {
        $instanceId = (int)($_GET['instance_id'] ?? 0);
        if (!$instanceId) {
            http_response_code(400);
            echo json_encode(['error' => 'instance_id required.']);
            exit;
        }

        $stmt = $conn->prepare("
            SELECT id, token, label, visible_item_ids, expires_at,
                   created_by_name, created_at, accessed_count, last_accessed_at
            FROM checklist_share_tokens
            WHERE instance_id = :id
            ORDER BY created_at DESC
        ");
        $stmt->execute([':id' => $instanceId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['visible_item_ids'] = $r['visible_item_ids'] ? json_decode($r['visible_item_ids'], true) : null;
        }
        echo json_encode(['success' => true, 'tokens' => $rows]);
        exit;
    }

    // ── POST: create share token ────────────────────────────────────────
    if ($method === 'POST' && $request === 'create_share_token') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $instanceId     = (int)($body['instance_id']      ?? 0);
        $visibleItemIds = $body['visible_item_ids']        ?? null; // null = all
        $label          = trim($body['label']              ?? '');
        $expiresAt      = $body['expires_at']              ?? null; // ISO date string or null
        $userId         = getCurrentUserId();
        $userName       = getCurrentUserName();

        if (!$instanceId) {
            http_response_code(400);
            echo json_encode(['error' => 'instance_id is required.']);
            exit;
        }

        // Validate instance exists
        $check = $conn->prepare("SELECT id FROM checklist_instances WHERE id = :id");
        $check->execute([':id' => $instanceId]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Checklist instance not found.']);
            exit;
        }

        $token = bin2hex(random_bytes(24)); // 48-char hex token

        $visibleJson = null;
        if ($visibleItemIds !== null && is_array($visibleItemIds) && count($visibleItemIds) > 0) {
            $visibleJson = json_encode(array_values(array_map('intval', $visibleItemIds)));
        }

        $expiresFormatted = null;
        if ($expiresAt) {
            try {
                $dt = new DateTime($expiresAt);
                $expiresFormatted = $dt->format('Y-m-d H:i:s');
            } catch (Exception $e) {
                $expiresFormatted = null;
            }
        }

        $stmt = $conn->prepare("
            INSERT INTO checklist_share_tokens
                (token, instance_id, visible_item_ids, label, expires_at, created_by, created_by_name)
            VALUES
                (:token, :instance_id, :visible_item_ids, :label, :expires_at, :created_by, :created_by_name)
        ");
        $stmt->execute([
            ':token'           => $token,
            ':instance_id'     => $instanceId,
            ':visible_item_ids'=> $visibleJson,
            ':label'           => $label ?: null,
            ':expires_at'      => $expiresFormatted,
            ':created_by'      => $userId,
            ':created_by_name' => $userName,
        ]);

        echo json_encode([
            'success'    => true,
            'token'      => $token,
            'expires_at' => $expiresFormatted,
            'label'      => $label,
        ]);
        exit;
    }

    // ── DELETE: revoke a share token ────────────────────────────────────
    if ($method === 'DELETE' && $request === 'delete_token') {
        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $tokenId = (int)($body['id'] ?? $_GET['id'] ?? 0);

        if (!$tokenId) {
            http_response_code(400);
            echo json_encode(['error' => 'Token id is required.']);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM checklist_share_tokens WHERE id = :id");
        $stmt->execute([':id' => $tokenId]);

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => "Unknown request: $request"]);

} catch (Exception $e) {
    error_log('inspection-report.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error. Please try again.', 'detail' => $e->getMessage()]);
}
