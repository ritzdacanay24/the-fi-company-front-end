<?php

require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
require __DIR__ . '/TemplateChangeTracker.php';
require __DIR__ . '/ChecklistTemplateTransformer.php';
require __DIR__ . '/ChecklistSampleMediaService.php';

// Get the underlying PDO connection from Medoo
$db = $database->pdo;
/**
 * Photo Checklist Configuration API
 * Manages templates, instances, and configuration settings
 */
class PhotoChecklistConfigAPI {
    private $conn;
    private $database;
    private $mediaService;
    private $debugLog = []; // Debug log for image operations
    private $hasTemplateIsDeletedColumn = null;
    private $hasTemplateCustomerNameColumn = null;

    public function __construct($db) {
        $this->conn = $db;
        $this->mediaService = new ChecklistSampleMediaService($db);
    }

    /**
     * If the incoming payload contains links, ensure the checklist_items.links column exists.
     * We try to auto-migrate once to avoid silently dropping link data.
     * NOTE: Runs outside a transaction because ALTER TABLE causes implicit commits in MySQL.
     */
    private function ensureLinksColumnIfNeeded($data) {
        if (empty($data['items']) || !is_array($data['items'])) {
            return null;
        }

        $needsLinks = false;
        foreach ($data['items'] as $it) {
            if (!empty($it['links'])) {
                $needsLinks = true;
                break;
            }
        }

        if (!$needsLinks) {
            return null;
        }

        try {
            $checkStmt = $this->conn->prepare("SHOW COLUMNS FROM checklist_items LIKE 'links'");
            $checkStmt->execute();
            if ($checkStmt->rowCount() > 0) {
                return null;
            }

            error_log("🧩 checklist_items.links column missing but payload contains links; attempting to add column");
            $this->conn->exec("ALTER TABLE checklist_items ADD COLUMN links JSON NULL");
            error_log("✅ Added checklist_items.links column");

            return null;
        } catch (Exception $e) {
            error_log("❌ Failed to ensure checklist_items.links column: " . $e->getMessage());
            return "Links could not be saved because the database is missing checklist_items.links (JSON). Run migration backend/database/migrations/add_links_to_checklist_items.sql or grant ALTER permissions. Error: " . $e->getMessage();
        }
    }

    /**
     * Normalize links payload for storage in checklist_items.links (JSON).
     * Returns an array (possibly empty) when the column exists; otherwise returns null.
     */
    private function normalizeLinksPayload($item, $hasLinksColumn) {
        if (!$hasLinksColumn) {
            return null;
        }

        $rawLinks = $item['links'] ?? [];

        if (is_string($rawLinks)) {
            $decoded = json_decode($rawLinks, true);
            $rawLinks = is_array($decoded) ? $decoded : [];
        } elseif (!is_array($rawLinks)) {
            $rawLinks = [];
        }

        $normalized = [];
        foreach ($rawLinks as $link) {
            if (!is_array($link)) {
                continue;
            }

            // Frontend uses `title`; older payloads may use `label`
            $title = trim((string)($link['title'] ?? $link['label'] ?? ''));
            $url = trim((string)($link['url'] ?? ''));
            $description = trim((string)($link['description'] ?? ''));

            if ($title === '' && $url === '' && $description === '') {
                continue;
            }

            $normalized[] = [
                'title' => $title,
                'url' => $url,
                'description' => $description
            ];
        }

        return $normalized;
    }

    /**
     * Ensure checklist_items.submission_type supports all currently used values.
     * Some environments still have legacy ENUMs that do not include audio/none,
     * which causes MySQL to coerce unsupported values to empty string.
     */
    private function ensureSubmissionTypeColumnSupportsCurrentValues() {
        try {
            $stmt = $this->conn->prepare("SHOW COLUMNS FROM checklist_items LIKE 'submission_type'");
            $stmt->execute();
            $column = $stmt->fetch(PDO::FETCH_ASSOC);

            $targetEnum = "ENUM('photo','video','audio','either','none')";
            $targetComment = "Controls submission mode: photo, video, audio, either, or none";

            if (!$column) {
                error_log("🧩 checklist_items.submission_type missing; adding column with audio support");
                $this->conn->exec(
                    "ALTER TABLE checklist_items
                     ADD COLUMN submission_type {$targetEnum} DEFAULT 'photo'
                     COMMENT '{$targetComment}'
                     AFTER photo_requirements"
                );

                try {
                    $this->conn->exec("ALTER TABLE checklist_items ADD INDEX idx_submission_type (submission_type)");
                } catch (Exception $indexError) {
                    // Non-fatal if index already exists or cannot be created.
                    error_log("ℹ️ idx_submission_type not created/updated: " . $indexError->getMessage());
                }

                return null;
            }

            $type = strtolower((string)($column['Type'] ?? ''));
            $hasAudio = strpos($type, "'audio'") !== false;
            $hasNone = strpos($type, "'none'") !== false;

            if (!$hasAudio || !$hasNone) {
                error_log("🧩 checklist_items.submission_type ENUM is legacy; upgrading to include audio/none");
                $this->conn->exec(
                    "ALTER TABLE checklist_items
                     MODIFY COLUMN submission_type {$targetEnum} DEFAULT 'photo'
                     COMMENT '{$targetComment}'"
                );
            }

            return null;
        } catch (Exception $e) {
            error_log("❌ Failed to ensure submission_type ENUM compatibility: " . $e->getMessage());
            return "Could not ensure checklist_items.submission_type supports audio/none. " .
                   "Please run the submission_type migration (audio/none enum update). Error: " . $e->getMessage();
        }
    }

    /**
     * Handle API requests
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $request = $_GET['request'] ?? '';
        
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');

        if ($method === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        try {
            switch ($request) {
                // Template Management
                case 'templates':
                    if ($method === 'GET') {
                        $includeDeleted = isset($_GET['include_deleted']) && ($_GET['include_deleted'] === '1' || $_GET['include_deleted'] === 'true');
                        $includeInactive = isset($_GET['include_inactive']) && ($_GET['include_inactive'] === '1' || $_GET['include_inactive'] === 'true');
                        echo json_encode($this->getTemplates($includeDeleted, $includeInactive));
                    } elseif ($method === 'POST') {
                        echo json_encode($this->createTemplate());
                    }
                    break;

                case 'template':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'GET' && $id) {
                        $includeDeleted = isset($_GET['include_deleted']) && ($_GET['include_deleted'] === '1' || $_GET['include_deleted'] === 'true');
                        $includeInactive = isset($_GET['include_inactive']) && ($_GET['include_inactive'] === '1' || $_GET['include_inactive'] === 'true');
                        echo json_encode($this->getTemplate($id, $includeDeleted, $includeInactive));
                    } elseif ($method === 'PUT' && $id) {
                        echo json_encode($this->updateTemplate($id));
                    } elseif ($method === 'DELETE' && $id) {
                        echo json_encode($this->deleteTemplate($id));
                    }
                    break;

                case 'hard_delete_template':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'POST' && $id) {
                        echo json_encode($this->hardDeleteTemplate((int)$id));
                    }
                    break;

                case 'delete_major_version':
                    $groupId = $_GET['group_id'] ?? null;
                    $major = $_GET['major'] ?? null;
                    if ($method === 'POST' && $groupId && $major) {
                        echo json_encode($this->deleteMajorVersion((int)$groupId, (int)$major));
                    }
                    break;

                case 'restore_template':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'POST' && $id) {
                        echo json_encode($this->restoreTemplate($id));
                    }
                    break;

                case 'discard_draft':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'POST' && $id) {
                        echo json_encode($this->discardDraft($id));
                    }
                    break;

                case 'create_parent_version':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'POST' && $id) {
                        echo json_encode($this->createParentVersion((int)$id));
                    }
                    break;

                case 'publish':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'POST' && $id) {
                        echo json_encode($this->publishTemplate($id));
                    }
                    break;

                case 'template_history':
                    $groupId = $_GET['group_id'] ?? null;
                    $templateId = $_GET['template_id'] ?? null;
                    if ($method === 'GET' && ($groupId || $templateId)) {
                        echo json_encode($this->getTemplateHistory($groupId, $templateId));
                    }
                    break;

                case 'compare_templates':
                    $sourceId = $_GET['source_id'] ?? null;
                    $targetId = $_GET['target_id'] ?? null;
                    if ($method === 'GET' && $sourceId && $targetId) {
                        echo json_encode($this->compareTemplates($sourceId, $targetId));
                    }
                    break;

                // Instance Management  
                case 'instances':
                    if ($method === 'GET') {
                        echo json_encode($this->getInstances());
                    } elseif ($method === 'POST') {
                        echo json_encode($this->createInstance());
                    }
                    break;

                case 'search_instances':
                    if ($method === 'GET') {
                        echo json_encode($this->searchInstances());
                    }
                    break;

                case 'instance':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'GET' && $id) {
                        echo json_encode($this->getInstance($id));
                    } elseif ($method === 'PUT' && $id) {
                        echo json_encode($this->updateInstance($id));
                    } elseif ($method === 'DELETE' && $id) {
                        echo json_encode($this->deleteInstance($id));
                    }
                    break;

                // Photo Management
                case 'photos':
                    if ($method === 'POST') {
                        echo json_encode($this->uploadPhoto());
                    }
                    break;

                case 'photo':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'DELETE' && $id) {
                        echo json_encode($this->deletePhoto($id));
                    }
                    break;

                // PDF Export
                case 'instance_pdf':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'GET' && $id) {
                        $this->downloadInstancePDF($id);
                    }
                    break;

                // Configuration Management
                case 'config':
                    if ($method === 'GET') {
                        echo json_encode($this->getConfig());
                    } elseif ($method === 'POST') {
                        echo json_encode($this->updateConfig());
                    }
                    break;

                // Legacy compatibility
                case 'read':
                    echo json_encode($this->legacyRead());
                    break;

                case 'save':
                    echo json_encode($this->legacySave());
                    break;

                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Endpoint not found']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // ==============================================
    // Template Management Methods
    // ==============================================

    private function hasChecklistTemplatesIsDeletedColumn() {
        if ($this->hasTemplateIsDeletedColumn !== null) {
            return (bool)$this->hasTemplateIsDeletedColumn;
        }

        try {
            $stmt = $this->conn->prepare("SHOW COLUMNS FROM checklist_templates LIKE 'is_deleted'");
            $stmt->execute();
            $this->hasTemplateIsDeletedColumn = ($stmt->rowCount() > 0);
        } catch (Exception $e) {
            $this->hasTemplateIsDeletedColumn = false;
        }

        return (bool)$this->hasTemplateIsDeletedColumn;
    }

    private function hasChecklistTemplatesCustomerNameColumn() {
        if ($this->hasTemplateCustomerNameColumn !== null) {
            return (bool)$this->hasTemplateCustomerNameColumn;
        }

        try {
            $stmt = $this->conn->prepare("SHOW COLUMNS FROM checklist_templates LIKE 'customer_name'");
            $stmt->execute();
            $this->hasTemplateCustomerNameColumn = ($stmt->rowCount() > 0);
        } catch (Exception $e) {
            $this->hasTemplateCustomerNameColumn = false;
        }

        return (bool)$this->hasTemplateCustomerNameColumn;
    }

    public function getTemplates($includeDeleted = false, $includeInactive = false) {
        if ($includeDeleted) {
            $whereClause = "1=1";
        } else if ($includeInactive) {
            // Include inactive historical templates. If is_deleted exists, still exclude deleted.
            // If is_deleted does not exist, we cannot distinguish deleted vs inactive, so include all.
            $whereClause = $this->hasChecklistTemplatesIsDeletedColumn()
                ? "(COALESCE(ct.is_deleted, 0) = 0)"
                : "1=1";
        } else {
            // Backward-compatible default: show active published + drafts only.
            // Note: without an is_deleted column we can't safely distinguish "inactive historical" from "soft-deleted".
            $whereClause = "(ct.is_active = 1 OR ct.is_draft = 1)";
        }

        $isDeletedSelect = $this->hasChecklistTemplatesIsDeletedColumn() ? ", ct.is_deleted" : "";
        $customerNameSelect = $this->hasChecklistTemplatesCustomerNameColumn() ? ", ct.customer_name" : "";

        $sql = "SELECT ct.id, ct.name, ct.description, ct.part_number, ct.customer_part_number{$customerNameSelect}, 
                   ct.revision, ct.original_filename, ct.review_date, ct.revision_number, 
                   ct.revision_details, ct.revised_by, ct.product_type, 
                   ct.category, ct.version, ct.parent_template_id, ct.template_group_id, 
                   ct.is_active, ct.is_draft{$isDeletedSelect}, ct.created_by, ct.created_at, ct.updated_at, ct.published_at,
                       qd.id as qd_id,
                       qd.document_number,
                       qd.title as qd_title,
                       qr.id as qr_id,
                       qr.revision_number,
                       COUNT(DISTINCT ci.id) as active_instances,
                       COUNT(DISTINCT cit.id) as item_count
                FROM checklist_templates ct
                LEFT JOIN quality_documents qd ON qd.id = ct.quality_document_id
                LEFT JOIN quality_revisions qr ON qr.id = ct.quality_revision_id
                LEFT JOIN checklist_instances ci ON ct.id = ci.template_id AND ci.status != 'completed'
                LEFT JOIN checklist_items cit ON ct.id = cit.template_id
                WHERE " . $whereClause . "
                GROUP BY ct.id, ct.name, ct.description, ct.part_number, ct.customer_part_number{$customerNameSelect}, 
                         ct.revision, ct.original_filename, ct.review_date, ct.revision_number,
                         ct.revision_details, ct.revised_by, ct.product_type, 
                         ct.category, ct.version, ct.parent_template_id, ct.template_group_id,
                         ct.is_active, ct.is_draft{$isDeletedSelect}, ct.created_by, ct.created_at, ct.updated_at, ct.published_at,
                         qd.id, qd.document_number, qd.title, qr.id, qr.revision_number
                ORDER BY ct.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $bestDraftByParent = [];
        $parentTemplateIds = [];
        foreach ($results as $row) {
            if (empty($row['is_draft']) && !empty($row['id'])) {
                $parentTemplateIds[] = (int)$row['id'];
            }
        }

        $parentTemplateIds = array_values(array_unique(array_filter($parentTemplateIds, function ($value) {
            return (int)$value > 0;
        })));

        if (!empty($parentTemplateIds)) {
            $placeholders = implode(',', array_fill(0, count($parentTemplateIds), '?'));
            $draftLookupSql = "SELECT parent_template_id, id, is_active, updated_at
                               FROM checklist_templates
                               WHERE is_draft = 1 AND parent_template_id IN ($placeholders)
                               ORDER BY parent_template_id ASC, is_active DESC, updated_at DESC, id DESC";
            $draftLookupStmt = $this->conn->prepare($draftLookupSql);
            $draftLookupStmt->execute($parentTemplateIds);
            $draftRows = $draftLookupStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($draftRows as $draftRow) {
                $parentId = (int)($draftRow['parent_template_id'] ?? 0);
                if ($parentId > 0 && !isset($bestDraftByParent[$parentId])) {
                    $bestDraftByParent[$parentId] = (int)$draftRow['id'];
                }
            }
        }
        
        // Add quality_document_metadata to each template
        foreach ($results as &$template) {
            if ($template['qd_id']) {
                $template['quality_document_metadata'] = [
                    'document_id' => (int)$template['qd_id'],
                    'revision_id' => (int)$template['qr_id'],
                    'document_number' => $template['document_number'],
                    'revision_number' => (int)$template['revision_number'],
                    'title' => $template['qd_title'],
                    'version_string' => $template['document_number'] . ', Rev ' . $template['revision_number']
                ];
            } else {
                $template['quality_document_metadata'] = null;
            }

            // Normalize types for frontend (PDO returns strings)
            $template['is_active'] = (bool)$template['is_active'];
            $template['is_draft'] = (bool)$template['is_draft'];
            if (array_key_exists('is_deleted', $template)) {
                $template['is_deleted'] = (bool)$template['is_deleted'];
            }
            $template['active_instances'] = isset($template['active_instances']) ? (int)$template['active_instances'] : 0;
            $template['item_count'] = isset($template['item_count']) ? (int)$template['item_count'] : 0;

            $templateId = isset($template['id']) ? (int)$template['id'] : 0;
            if (!empty($template['is_draft'])) {
                $template['edit_target_template_id'] = $templateId > 0 ? $templateId : null;
            } else {
                $template['edit_target_template_id'] = $bestDraftByParent[$templateId] ?? null;
            }
            
            // Remove the joined fields from root level
            unset($template['qd_id'], $template['document_number'], $template['qd_title'], 
                  $template['qr_id'], $template['revision_number']);
        }
        
        return $results;
    }

    public function getTemplate($id, $includeDeleted = false, $includeInactive = false) {
        if ($includeDeleted) {
            $whereCondition = "ct.id = ?";
        } else if ($includeInactive) {
            // Include inactive historical templates. If is_deleted exists, still exclude deleted.
            $whereCondition = $this->hasChecklistTemplatesIsDeletedColumn()
                ? "ct.id = ? AND (COALESCE(ct.is_deleted, 0) = 0)"
                : "ct.id = ?";
        } else {
            $whereCondition = "ct.id = ? AND (ct.is_active = 1 OR ct.is_draft = 1)";
        }

        // First get the template with quality document metadata
        $sql = "SELECT ct.*,
                       qd.id as qd_id,
                       qd.document_number,
                       qd.title as qd_title,
                       qr.id as qr_id,
                       qr.revision_number,
                       qr.description as qr_description
                FROM checklist_templates ct
                LEFT JOIN quality_documents qd ON qd.id = ct.quality_document_id
                LEFT JOIN quality_revisions qr ON qr.id = ct.quality_revision_id
                WHERE " . $whereCondition;
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            return null;
        }
        
        // Build quality_document_metadata object if document exists
        if ($result['qd_id']) {
            $result['quality_document_metadata'] = [
                'document_id' => (int)$result['qd_id'],
                'revision_id' => (int)$result['qr_id'],
                'document_number' => $result['document_number'],
                'revision_number' => (int)$result['revision_number'],
                'title' => $result['qd_title'],
                'version_string' => $result['document_number'] . ', Rev ' . $result['revision_number']
            ];
        } else {
            $result['quality_document_metadata'] = null;
        }
        
        // Remove the joined fields from root level
        unset($result['qd_id'], $result['document_number'], $result['qd_title'], 
              $result['qr_id'], $result['revision_number'], $result['qr_description']);

        // Normalize types for frontend (PDO returns strings)
        if (isset($result['id'])) {
            $result['id'] = (int)$result['id'];
        }
        if (array_key_exists('is_active', $result)) {
            $result['is_active'] = (bool)$result['is_active'];
        }
        if (array_key_exists('is_draft', $result)) {
            $result['is_draft'] = (bool)$result['is_draft'];
        }
        if (array_key_exists('is_deleted', $result)) {
            $result['is_deleted'] = (bool)$result['is_deleted'];
        }
        if (isset($result['template_group_id']) && $result['template_group_id'] !== null) {
            $result['template_group_id'] = (int)$result['template_group_id'];
        }
        if (isset($result['parent_template_id']) && $result['parent_template_id'] !== null) {
            $result['parent_template_id'] = (int)$result['parent_template_id'];
        }

        $result['edit_target_template_id'] = null;
        if (!empty($result['id'])) {
            $templateId = (int)$result['id'];
            if (!empty($result['is_draft'])) {
                $result['edit_target_template_id'] = $templateId;
            } else {
                $draftStmt = $this->conn->prepare(
                    "SELECT id FROM checklist_templates WHERE parent_template_id = ? AND is_draft = 1 ORDER BY is_active DESC, updated_at DESC, id DESC LIMIT 1"
                );
                $draftStmt->execute([$templateId]);
                $draftId = (int)($draftStmt->fetchColumn() ?: 0);
                if ($draftId > 0) {
                    $result['edit_target_template_id'] = $draftId;
                }
            }
        }
        
        // Then get items separately with proper ordering
        // Detect if sample_videos and video_requirements columns exist to avoid SQL errors on older schemas
        $checkVideosSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_videos'";
        $checkVideosStmt = $this->conn->prepare($checkVideosSql);
        $checkVideosStmt->execute();
        $hasSampleVideosColumn = $checkVideosStmt->rowCount() > 0;

        $checkVideoReqSql = "SHOW COLUMNS FROM checklist_items LIKE 'video_requirements'";
        $checkVideoReqStmt = $this->conn->prepare($checkVideoReqSql);
        $checkVideoReqStmt->execute();
        $hasVideoRequirementsColumn = $checkVideoReqStmt->rowCount() > 0;

        $checkSubmissionTypeSql = "SHOW COLUMNS FROM checklist_items LIKE 'submission_type'";
        $checkSubmissionTypeStmt = $this->conn->prepare($checkSubmissionTypeSql);
        $checkSubmissionTypeStmt->execute();
        $hasSubmissionTypeColumn = $checkSubmissionTypeStmt->rowCount() > 0;

        $checkLinksSql = "SHOW COLUMNS FROM checklist_items LIKE 'links'";
        $checkLinksStmt = $this->conn->prepare($checkLinksSql);
        $checkLinksStmt->execute();
        $hasLinksColumn = $checkLinksStmt->rowCount() > 0;

        $selectFields = "id, template_id, order_index, parent_id, level, title, description, photo_requirements, sample_images, sample_image_url, is_required";
        if ($hasSubmissionTypeColumn) {
            $selectFields .= ", submission_type";
        }
        if ($hasSampleVideosColumn) {
            $selectFields .= ", sample_videos, sample_video_url";
        }
        if ($hasVideoRequirementsColumn) {
            $selectFields .= ", video_requirements";
        }
        if ($hasLinksColumn) {
            $selectFields .= ", links";
        }

        $sql = "SELECT " . $selectFields . " FROM checklist_items 
                WHERE template_id = ?
                ORDER BY 
                    CASE 
                        WHEN level = 0 OR level IS NULL THEN order_index 
                        ELSE parent_id + 0.001 * order_index 
                    END,
                    level,
                    order_index";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Parse JSON fields for each item
        if (is_array($items)) {
            foreach ($items as &$item) {
                // Debug: Log the raw item data
                error_log("📦 Raw DB item: id={$item['id']}, parent_id=" . ($item['parent_id'] ?? 'NULL') . ", level=" . ($item['level'] ?? 'NULL') . ", order_index={$item['order_index']}, title={$item['title']}");
                
                // Parse photo_requirements
                if (isset($item['photo_requirements']) && is_string($item['photo_requirements'])) {
                    $item['photo_requirements'] = json_decode($item['photo_requirements'], true) ?: [];
                } else if (!isset($item['photo_requirements'])) {
                    $item['photo_requirements'] = [];
                }
                
                // Handle submission_type from column or JSON fallback
                if ($hasSubmissionTypeColumn && isset($item['submission_type'])) {
                    // Column exists - use it directly (already in $item)
                } else {
                    // Column doesn't exist - try to extract from photo_requirements JSON
                    if (!isset($item['submission_type']) && isset($item['photo_requirements']['submission_type'])) {
                        $item['submission_type'] = $item['photo_requirements']['submission_type'];
                    }
                    if (!isset($item['submission_type'])) {
                        $item['submission_type'] = 'photo'; // Default
                    }
                }
                
                // Parse sample_images
                if (isset($item['sample_images']) && is_string($item['sample_images'])) {
                    $item['sample_images'] = json_decode($item['sample_images'], true) ?: [];
                    
                    // DEBUG: Log what we fetched from DB
                    if (!empty($item['sample_images'])) {
                        error_log("  📖 Read sample_images from DB (item {$item['id']}): " . json_encode($item['sample_images']));
                    }
                } else {
                    $item['sample_images'] = [];
                }

                // Parse sample_videos (if present)
                if (isset($item['sample_videos']) && is_string($item['sample_videos'])) {
                    $item['sample_videos'] = json_decode($item['sample_videos'], true) ?: [];
                } else {
                    $item['sample_videos'] = [];
                }

                // Parse video_requirements (if present)
                if (isset($item['video_requirements']) && is_string($item['video_requirements'])) {
                    $item['video_requirements'] = json_decode($item['video_requirements'], true) ?: [];
                    // Extract submission_time_seconds for backward compatibility with frontend
                    if (isset($item['video_requirements']['submission_time_seconds'])) {
                        $item['submission_time_seconds'] = $item['video_requirements']['submission_time_seconds'];
                    }
                } else if (!isset($item['video_requirements'])) {
                    $item['video_requirements'] = [];
                }

                // Parse links (if present)
                if ($hasLinksColumn) {
                    if (isset($item['links']) && is_string($item['links'])) {
                        $item['links'] = json_decode($item['links'], true) ?: [];
                    } else if (!isset($item['links'])) {
                        $item['links'] = [];
                    }
                }
                
                // Ensure numeric types
                $item['level'] = isset($item['level']) ? (int)$item['level'] : 0;
                $item['parent_id'] = isset($item['parent_id']) ? (int)$item['parent_id'] : null;
                $item['id'] = (int)$item['id'];
                $item['order_index'] = (float)$item['order_index'];
                $item['is_required'] = (bool)$item['is_required'];
                
                // Extract min/max photos from photo_requirements
                $item['min_photos'] = isset($item['photo_requirements']['min_photos']) ? $item['photo_requirements']['min_photos'] : 0;
                $item['max_photos'] = isset($item['photo_requirements']['max_photos']) ? $item['photo_requirements']['max_photos'] : 10;
            }
            unset($item); // Break reference

            // Load sample media from new table and merge with items
            $itemIds = array_column($items, 'id');
            $mediaByItem = $this->mediaService->getMediaForItems($itemIds);
            
            // Merge media into items (convert new format back to legacy for backward compatibility)
            foreach ($items as &$item) {
                $itemId = $item['id'];
                if (isset($mediaByItem[$itemId])) {
                    $legacyMedia = $this->convertMediaToLegacyFormat($mediaByItem[$itemId]);
                    // Override JSON column data with data from new table (new table is source of truth)
                    $item['sample_images'] = $legacyMedia['sample_images'];
                    $item['sample_videos'] = $legacyMedia['sample_videos'];
                }
            }
            unset($item);
        }
        
        // Return items as FLAT LIST (matches frontend expectation and ONE-PASS save algorithm)
        // Frontend uses 'level' and 'parent_id' fields to understand hierarchy
        $result['items'] = $items;
        
        // Transform to clean enterprise format
        return ChecklistTemplateTransformer::toApiResponse($result);
    }

    /**
     * Convert media from new table format to legacy JSON format
     * @param array $media Media items from checklist_item_sample_media table
     * @return array Legacy format with sample_images and sample_videos arrays
     */
    private function convertMediaToLegacyFormat($media) {
        $sampleImages = [];
        $sampleVideos = [];

        foreach ($media as $item) {
            $legacyItem = [
                'url' => $item['url'],
                'label' => $item['label'],
                'description' => $item['description'],
                'order_index' => (int)$item['order_index'],
                'is_primary' => $item['media_category'] === 'primary_sample',
                'image_type' => $this->mapCategoryToImageType($item['media_category'])
            ];

            if ($item['media_type'] === 'video') {
                $sampleVideos[] = $legacyItem;
            } else {
                $sampleImages[] = $legacyItem;
            }
        }

        return [
            'sample_images' => $sampleImages,
            'sample_videos' => $sampleVideos
        ];
    }

    /**
     * Map database media_category to legacy image_type
     */
    private function mapCategoryToImageType($category) {
        $mapping = [
            'primary_sample' => 'sample',
            'reference' => 'reference',
            'diagram' => 'diagram',
            'defect_example' => 'defect_example'
        ];
        return $mapping[$category] ?? 'reference';
    }

    /**
     * Nest child items under their parent items
     * @param array $items Flat array of items
     * @return array Nested array with children
     */
    private function nestItems($items) {
        if (!is_array($items) || empty($items)) {
            return [];
        }
        
        error_log("🔍 nestItems: Processing " . count($items) . " items");
        
        $itemsById = [];
        $rootItems = [];
        
        // First pass: index all items by their ID
        foreach ($items as $item) {
            $itemId = $item['id'];
            $itemsById[$itemId] = $item;
            
            // Initialize children array for all items
            $itemsById[$itemId]['children'] = [];
            
            error_log("   Item indexed: id={$itemId}, order_index={$item['order_index']}, parent_id={$item['parent_id']}, level={$item['level']}, title={$item['title']}");
        }
        
        error_log("   Indexed " . count($itemsById) . " items by ID");
        
        // Second pass: nest children under parents using parent_id (which refers to parent's ID)
        foreach ($itemsById as $itemId => $item) {
            $parentId = $item['parent_id'];
            $level = $item['level'];
            
            // If this is a root item (level 0 or no parent_id)
            if ($level == 0 || $parentId === null || $parentId === 0) {
                $rootItems[] = $itemId;
                error_log("   Root item: id={$itemId}, order_index={$item['order_index']}");
            } 
            // If this item has a parent, nest it under the parent
            elseif (isset($itemsById[$parentId])) {
                $itemsById[$parentId]['children'][] = $itemsById[$itemId];
                error_log("   ✓ Nested child id={$itemId} under parent id={$parentId}");
            } else {
                error_log("   ⚠️ WARNING: Child id={$itemId} has parent_id={$parentId} but parent not found!");
                // Treat as root item if parent not found
                $rootItems[] = $itemId;
            }
        }
        
        error_log("   Found " . count($rootItems) . " root items");
        
        // Third pass: build final result with only root items (children are already nested)
        $result = [];
        foreach ($rootItems as $rootId) {
            $item = $itemsById[$rootId];
            
            $childCount = count($item['children']);
            if ($childCount > 0) {
                error_log("   Root item id={$rootId} has {$childCount} children");
                
                // Sort children by order_index
                usort($item['children'], function($a, $b) {
                    return $a['order_index'] <=> $b['order_index'];
                });
            } else {
                // Remove empty children array
                unset($item['children']);
            }
            
            $result[] = $item;
        }
        
        // Sort root items by order_index
        usort($result, function($a, $b) {
            return $a['order_index'] <=> $b['order_index'];
        });
        
        error_log("   Returning " . count($result) . " root items (with nested children)");
        
        return $result;
    }

    /**
     * Flatten a nested items structure (items with optional children arrays) into a flat list.
     * This is used for cloning templates (e.g., creating a new major version) because createTemplate()
     * expects a flat list where `level` indicates nesting depth.
     *
     * Notes:
     * - getTemplate() returns nested items (children arrays) via ChecklistTemplateTransformer.
     * - createTemplate() currently only iterates a flat list; without flattening, child items are dropped.
     */
    private function flattenNestedTemplateItemsForCreate($items, $level = 0) {
        if (empty($items) || !is_array($items)) {
            return [];
        }

        // Defensive sort by order_index if present
        $itemsCopy = $items;
        usort($itemsCopy, function ($a, $b) {
            $ao = isset($a['order_index']) ? (float)$a['order_index'] : 0;
            $bo = isset($b['order_index']) ? (float)$b['order_index'] : 0;
            return $ao <=> $bo;
        });

        $flat = [];
        foreach ($itemsCopy as $item) {
            if (!is_array($item)) {
                continue;
            }

            $children = [];
            if (isset($item['children']) && is_array($item['children'])) {
                $children = $item['children'];
            }

            $row = $item;
            $row['level'] = (int)$level;
            unset($row['children']);

            $flat[] = $row;

            if (!empty($children)) {
                $flat = array_merge($flat, $this->flattenNestedTemplateItemsForCreate($children, $level + 1));
            }
        }

        return $flat;
    }

    /**
     * Validate sample images array
     * Ensures only 1 primary sample image and max 5 reference images
     * 
     * @param array $sampleImages Array of sample image objects
     * @return array [bool success, string error_message]
     */
    private function validateSampleImages($sampleImages) {
        if (empty($sampleImages) || !is_array($sampleImages)) {
            return [true, '']; // Empty is valid
        }

        $primaryCount = 0;
        $referenceCount = 0;

        foreach ($sampleImages as $image) {
            // Ensure image_type is set (default to 'reference' if not specified)
            $imageType = $image['image_type'] ?? 'reference';
            $isPrimary = $image['is_primary'] ?? false;

            // Count primary sample images
            if ($isPrimary && $imageType === 'sample') {
                $primaryCount++;
            }

            // Count reference images (any image that's not the primary sample)
            if (!$isPrimary || $imageType !== 'sample') {
                $referenceCount++;
            }
        }

        // Validation rules
        if ($primaryCount > 1) {
            return [false, 'Only one primary sample image is allowed per checklist item'];
        }

        if ($referenceCount > 5) {
            return [false, 'Maximum of 5 reference images allowed per checklist item'];
        }

        //** 
        // this will result in too many restrictions for users trying to add images. 
        // Total images should not exceed 6 (1 sample + 5 reference)
        // we need to make sure that the rules are enforced. 
        //  */

        $totalImages = count($sampleImages);
        if ($totalImages > 6) {
            return [false, 'Maximum of 6 total images allowed (1 sample + 5 reference)'];
        }

        return [true, ''];
    }

    /**
     * Normalize sample images array
     * Ensures all images have required fields including image_type
     * 
     * @param array $sampleImages Array of sample image objects
     * @return array Normalized array
     */
    private function normalizeSampleImages($sampleImages) {
        if (empty($sampleImages) || !is_array($sampleImages)) {
            return [];
        }

        $normalized = [];
        foreach ($sampleImages as $index => $image) {
            $isPrimary = $image['is_primary'] ?? false;
            
            $normalized[] = [
                'url' => $image['url'] ?? '',
                'label' => $image['label'] ?? ($isPrimary ? 'Primary Sample Image' : 'Reference Image'),
                'description' => $image['description'] ?? '',
                'type' => $image['type'] ?? 'photo',
                'image_type' => $image['image_type'] ?? ($isPrimary ? 'sample' : 'reference'),
                'is_primary' => $isPrimary,
                'order_index' => $image['order_index'] ?? $index
            ];
        }

        return $normalized;
    }

    /**
     * Parse version string into [major, minor, patch]
     */
    private function parseVersionParts($version) {
        $versionStr = trim((string)$version);
        if ($versionStr === '') {
            return [1, 0, 0];
        }

        if (preg_match('/(\d+)(?:\.(\d+))?(?:\.(\d+))?/', $versionStr, $matches)) {
            $major = isset($matches[1]) ? (int)$matches[1] : 1;
            $minor = isset($matches[2]) ? (int)$matches[2] : 0;
            $patch = isset($matches[3]) ? (int)$matches[3] : 0;
            return [$major, $minor, $patch];
        }

        return [1, 0, 0];
    }

    /**
     * Normalize version to a canonical string.
     * Uses major.minor unless patch is present, then major.minor.patch.
     */
    private function normalizeVersionString($version) {
        [$major, $minor, $patch] = $this->parseVersionParts($version);
        if ($patch > 0) {
            return $major . '.' . $minor . '.' . $patch;
        }
        return $major . '.' . $minor;
    }

    /**
     * Compare two version strings.
     * Returns -1 if $a < $b, 0 if equal, 1 if $a > $b.
     */
    private function compareVersions($a, $b) {
        [$aMajor, $aMinor, $aPatch] = $this->parseVersionParts($a);
        [$bMajor, $bMinor, $bPatch] = $this->parseVersionParts($b);

        if ($aMajor !== $bMajor) {
            return $aMajor <=> $bMajor;
        }
        if ($aMinor !== $bMinor) {
            return $aMinor <=> $bMinor;
        }
        return $aPatch <=> $bPatch;
    }

    /**
     * Increment a version string.
     * If patch exists, increment patch; otherwise increment minor.
     */
    private function incrementVersion($version) {
        [$major, $minor, $patch] = $this->parseVersionParts($version);
        if ($patch > 0) {
            $patch++;
            return $major . '.' . $minor . '.' . $patch;
        }

        $minor++;
        return $major . '.' . $minor;
    }

    /**
     * Resolve a unique version for a template group.
     * - Keeps the requested version whenever possible (even if it's lower than the group's max),
     *   because major lines are independent (e.g., v1.x and v3.x can co-exist).
     * - If requested version is a duplicate within the group (excluding an optional template ID), auto-bump.
     * - Guarantees unique version string within the group.
     */
    private function resolveVersionForTemplateGroup($templateGroupId, $requestedVersion, $excludeTemplateId = null) {
        $requested = $this->normalizeVersionString($requestedVersion ?: '1.0');

        $excludeTemplateId = $excludeTemplateId !== null ? (int)$excludeTemplateId : null;

        $sql = "SELECT id, version FROM checklist_templates WHERE template_group_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([(int)$templateGroupId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            return $requested;
        }

        $existing = [];

        foreach ($rows as $row) {
            $rowId = isset($row['id']) ? (int)$row['id'] : 0;
            if ($excludeTemplateId !== null && $excludeTemplateId > 0 && $rowId === $excludeTemplateId) {
                continue;
            }

            $v = $this->normalizeVersionString($row['version'] ?? '1.0');
            $existing[$v] = true;
        }

        $candidate = $requested;
        while (isset($existing[$candidate])) {
            $candidate = $this->incrementVersion($candidate);
        }

        return $candidate;
    }

    /**
     * Resolve the next branch version for a specific parent template.
     * Examples:
     * - parent v1.0 -> first publish from its draft = v1.0.1
     * - parent v4 -> first publish from its draft = v4.1
     * - parent v4 with existing children v4.1, v4.2 -> next = v4.3
     */
    private function resolveNextBranchVersionForParent($parentTemplateId, $fallbackParentVersion = '1.0', $excludeTemplateId = null) {
        $parentTemplateId = (int)$parentTemplateId;
        $excludeTemplateId = $excludeTemplateId !== null ? (int)$excludeTemplateId : null;

        $baseVersion = $this->normalizeVersionString($fallbackParentVersion ?: '1.0');

        if ($parentTemplateId > 0) {
            $parentVersionStmt = $this->conn->prepare("SELECT version FROM checklist_templates WHERE id = ? LIMIT 1");
            $parentVersionStmt->execute([$parentTemplateId]);
            $parentVersion = $parentVersionStmt->fetchColumn();
            if (!empty($parentVersion)) {
                $baseVersion = $this->normalizeVersionString((string)$parentVersion);
            }
        }

        $sql = "SELECT id, version
                FROM checklist_templates
                WHERE parent_template_id = ?
                  AND is_draft = 0";
        $params = [$parentTemplateId];

        if ($excludeTemplateId !== null && $excludeTemplateId > 0) {
            $sql .= " AND id != ?";
            $params[] = $excludeTemplateId;
        }

        $sql .= " ORDER BY id DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $pattern = '/^' . preg_quote($baseVersion, '/') . '\\.(\\d+)$/';
        $maxSuffix = 0;

        foreach ($rows as $row) {
            $candidateVersion = trim((string)($row['version'] ?? ''));
            if ($candidateVersion === '') {
                continue;
            }

            if (preg_match($pattern, $candidateVersion, $matches)) {
                $suffix = isset($matches[1]) ? (int)$matches[1] : 0;
                if ($suffix > $maxSuffix) {
                    $maxSuffix = $suffix;
                }
            }
        }

        return $baseVersion . '.' . ($maxSuffix + 1);
    }

    /**
     * Keep only one active published template per major line within a template family.
     * Called after a draft is published.
     */
    private function deactivateOtherPublishedInSameMajor($templateId) {
        $templateId = (int)$templateId;
        if ($templateId <= 0) {
            return;
        }

        $rowStmt = $this->conn->prepare("SELECT id, template_group_id, version FROM checklist_templates WHERE id = ? LIMIT 1");
        $rowStmt->execute([$templateId]);
        $row = $rowStmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return;
        }

        $groupId = (int)($row['template_group_id'] ?? 0);
        if ($groupId <= 0) {
            $groupId = $templateId;
        }

        [$major] = $this->parseVersionParts($row['version'] ?? '1.0');
        $major = (int)$major;

        $whereDeleted = '';
        if ($this->hasChecklistTemplatesIsDeletedColumn()) {
            $whereDeleted = ' AND COALESCE(is_deleted, 0) = 0';
        }

        $sql = "UPDATE checklist_templates
                SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE template_group_id = ?
                  AND is_draft = 0
                  AND id != ?
                  AND CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) = ?
                  {$whereDeleted}";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$groupId, $templateId, $major]);
    }

    public function createTemplate($dataOverride = null) {
        $data = $dataOverride ?? json_decode(file_get_contents('php://input'), true);

        $linksError = $this->ensureLinksColumnIfNeeded($data);
        if ($linksError) {
            return ['success' => false, 'error' => $linksError];
        }

        $submissionTypeError = $this->ensureSubmissionTypeColumnSupportsCurrentValues();
        if ($submissionTypeError) {
            return ['success' => false, 'error' => $submissionTypeError];
        }

        // Single-draft policy guard for direct create calls:
        // if a draft already exists for the same parent template, block creating another.
        $requestedIsDraft = isset($data['is_draft']) ? (int)$data['is_draft'] : 0;
        if ($requestedIsDraft === 1) {
            $draftParentTemplateId = 0;

            if (!empty($data['parent_template_id'])) {
                $draftParentTemplateId = (int)$data['parent_template_id'];
            } elseif (!empty($data['source_template_id'])) {
                // Save Draft flows may clone from a published source template.
                $draftParentTemplateId = (int)$data['source_template_id'];
            }

            if ($draftParentTemplateId > 0) {
                $existingDraftStmt = $this->conn->prepare(
                    "SELECT id FROM checklist_templates WHERE parent_template_id = ? AND is_draft = 1 ORDER BY is_active DESC, updated_at DESC, id DESC LIMIT 1"
                );
                $existingDraftStmt->execute([$draftParentTemplateId]);
                $existingDraftId = (int)($existingDraftStmt->fetchColumn() ?: 0);

                if ($existingDraftId > 0) {
                    return [
                        'success' => false,
                        'code' => 'DRAFT_ALREADY_EXISTS',
                        'error' => 'A draft already exists for this template. Open the existing draft instead of creating another.',
                        'existing_draft_id' => $existingDraftId,
                        'parent_template_id' => $draftParentTemplateId
                    ];
                }
            }
        }
        
        // Debug: Log the received data
        error_log("createTemplate received data: " . json_encode($data, JSON_PRETTY_PRINT));
        
        $this->conn->beginTransaction();
        
        try {
            // Handle versioning - if source_template_id is provided, this is a new version
            $parentTemplateId = null;
            $templateGroupId = null;
            $version = $data['version'] ?? '1.0';
            
            if (isset($data['source_template_id']) && !empty($data['source_template_id'])) {
                $sourceTemplateId = $data['source_template_id'];
                error_log("Creating new version from source template ID: $sourceTemplateId");
                
                // Get the source template to inherit group ID
                $sql = "SELECT template_group_id, is_active FROM checklist_templates WHERE id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$sourceTemplateId]);
                $sourceTemplate = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($sourceTemplate) {
                    $parentTemplateId = (int)$sourceTemplateId;
                    $templateGroupId = $sourceTemplate['template_group_id'];
                    if (empty($templateGroupId)) {
                        // Legacy safety: if source template has no group, use source ID as group root
                        $templateGroupId = (int)$sourceTemplateId;
                    }
                    
                    // Deactivate the previous version (only if it's currently active)
                    if ($sourceTemplate['is_active']) {
                        $sql = "UPDATE checklist_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
                        $stmt = $this->conn->prepare($sql);
                        $stmt->execute([$sourceTemplateId]);
                        error_log("Deactivated previous version (template ID: $sourceTemplateId)");
                    }
                } else {
                    error_log("Warning: Source template $sourceTemplateId not found, creating as new template");
                }
            }

            // Allow explicitly setting parent/group IDs (used for drafts created from a published template)
            if ($parentTemplateId === null && isset($data['parent_template_id']) && !empty($data['parent_template_id'])) {
                $parentTemplateId = (int)$data['parent_template_id'];
            }
            if ($templateGroupId === null && isset($data['template_group_id']) && !empty($data['template_group_id'])) {
                $templateGroupId = (int)$data['template_group_id'];
            }

            // If parent is provided but group is missing, inherit group from parent to avoid detaching this row
            // into its own family.
            if ($templateGroupId === null && !empty($parentTemplateId)) {
                $parentGroupStmt = $this->conn->prepare("SELECT template_group_id FROM checklist_templates WHERE id = ?");
                $parentGroupStmt->execute([(int)$parentTemplateId]);
                $parentGroupId = (int)($parentGroupStmt->fetchColumn() ?: 0);
                if ($parentGroupId > 0) {
                    $templateGroupId = $parentGroupId;
                }
            }

            // Enforce unique, monotonic versioning for template families.
            // This prevents duplicates like multiple "v1.1" entries in the same group.
            if ($templateGroupId !== null) {
                $resolvedVersion = $this->resolveVersionForTemplateGroup((int)$templateGroupId, $version);
                if ((string)$resolvedVersion !== (string)$version) {
                    error_log("Version override for group {$templateGroupId}: requested={$version}, resolved={$resolvedVersion}");
                }
                $version = $resolvedVersion;
            } else {
                $version = $this->normalizeVersionString($version);
            }
            
            // For normal template creation ("Save"), default to published.
            // Drafts must be created explicitly via is_draft=1 (e.g., Save Draft).
            $isDraft = isset($data['is_draft']) ? (int)$data['is_draft'] : 0;
            $publishedAt = ($isDraft === 0) ? date('Y-m-d H:i:s') : null;

            $hasCustomerNameColumn = $this->hasChecklistTemplatesCustomerNameColumn();
            $customerNameValue = $hasCustomerNameColumn ? ($data['customer_name'] ?? null) : null;
            
            if ($templateGroupId === null) {
                // Insert template without template_group_id (omit from INSERT for new templates)
                $columns = ['name', 'description', 'part_number', 'customer_part_number'];
                $values = ['?', '?', '?', '?'];
                $params = [
                    $data['name'],
                    $data['description'] ?? '',
                    $data['part_number'] ?? '',
                    $data['customer_part_number'] ?? null
                ];

                if ($hasCustomerNameColumn) {
                    $columns[] = 'customer_name';
                    $values[] = '?';
                    $params[] = $customerNameValue;
                }

                $columns = array_merge($columns, ['revision', 'original_filename', 'review_date', 'revision_number', 'revision_details', 'revised_by', 'product_type', 'category', 'version', 'parent_template_id', 'created_by', 'is_active', 'is_draft', 'published_at']);
                $values = array_merge($values, ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '1', '?', '?']);
                $params = array_merge($params, [
                    $data['revision'] ?? null,
                    $data['original_filename'] ?? null,
                    $data['review_date'] ?? null,
                    $data['revision_number'] ?? null,
                    $data['revision_details'] ?? null,
                    $data['revised_by'] ?? null,
                    $data['product_type'] ?? '',
                    $data['category'] ?? 'quality_control',
                    $version,
                    $parentTemplateId,
                    $data['created_by'] ?? null,
                    $isDraft,
                    $publishedAt
                ]);

                $sql = "INSERT INTO checklist_templates (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ")";
                $stmt = $this->conn->prepare($sql);
                $success = $stmt->execute($params);
            } else {
                // Insert template with versioning fields and metadata (for versions)
                $columns = ['name', 'description', 'part_number', 'customer_part_number'];
                $values = ['?', '?', '?', '?'];
                $params = [
                    $data['name'],
                    $data['description'] ?? '',
                    $data['part_number'] ?? '',
                    $data['customer_part_number'] ?? null
                ];

                if ($hasCustomerNameColumn) {
                    $columns[] = 'customer_name';
                    $values[] = '?';
                    $params[] = $customerNameValue;
                }

                $columns = array_merge($columns, ['revision', 'original_filename', 'review_date', 'revision_number', 'revision_details', 'revised_by', 'product_type', 'category', 'version', 'parent_template_id', 'template_group_id', 'created_by', 'is_active', 'is_draft', 'published_at']);
                $values = array_merge($values, ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '1', '?', '?']);
                $params = array_merge($params, [
                    $data['revision'] ?? null,
                    $data['original_filename'] ?? null,
                    $data['review_date'] ?? null,
                    $data['revision_number'] ?? null,
                    $data['revision_details'] ?? null,
                    $data['revised_by'] ?? null,
                    $data['product_type'] ?? '',
                    $data['category'] ?? 'quality_control',
                    $version,
                    $parentTemplateId,
                    $templateGroupId,
                    $data['created_by'] ?? null,
                    $isDraft,
                    $publishedAt
                ]);

                $sql = "INSERT INTO checklist_templates (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ")";
                $stmt = $this->conn->prepare($sql);
                $success = $stmt->execute($params);
            }

            if (!$success) {
                throw new Exception("Failed to insert template: " . implode(", ", $stmt->errorInfo()));
            }
            
            $templateId = $this->conn->lastInsertId();
            error_log("Template inserted with ID: " . $templateId);
            
            $templateId = (int)$templateId;
            if ($templateId <= 0) {
                throw new Exception("Failed to get template ID after insert");
            }

            $existsStmt = $this->conn->prepare("SELECT id FROM checklist_templates WHERE id = ?");
            $existsStmt->execute([$templateId]);
            if (!$existsStmt->fetch(PDO::FETCH_ASSOC)) {
                throw new Exception("Template insert verification failed for ID: " . $templateId);
            }
            
            // If this is a brand new template (not a version), set template_group_id to its own ID
            if ($templateGroupId === null) {
                $sql = "UPDATE checklist_templates SET template_group_id = ? WHERE id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$templateId, $templateId]);
                error_log("Set template_group_id = $templateId for new template");
            }
            
            // Insert items with TWO-PASS approach to handle parent_id mapping
            if (!empty($data['items'])) {
                error_log("🔵 createTemplate: Starting to insert " . count($data['items']) . " items");
                
                // Check if sample_images and sample_videos columns exist once (moved outside loop for efficiency)
                $checkColumnSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_images'";
                $checkStmt = $this->conn->prepare($checkColumnSql);
                $checkStmt->execute();
                $hasSampleImagesColumn = $checkStmt->rowCount() > 0;

                $checkVideosSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_videos'";
                $checkVideosStmt = $this->conn->prepare($checkVideosSql);
                $checkVideosStmt->execute();
                $hasSampleVideosColumn = $checkVideosStmt->rowCount() > 0;

                $checkVideoReqSql = "SHOW COLUMNS FROM checklist_items LIKE 'video_requirements'";
                $checkVideoReqStmt = $this->conn->prepare($checkVideoReqSql);
                $checkVideoReqStmt->execute();
                $hasVideoRequirementsColumn = $checkVideoReqStmt->rowCount() > 0;

                $checkSubmissionTypeSql = "SHOW COLUMNS FROM checklist_items LIKE 'submission_type'";
                $checkSubmissionTypeStmt = $this->conn->prepare($checkSubmissionTypeSql);
                $checkSubmissionTypeStmt->execute();
                $hasSubmissionTypeColumn = $checkSubmissionTypeStmt->rowCount() > 0;

                $checkLinksSql = "SHOW COLUMNS FROM checklist_items LIKE 'links'";
                $checkLinksStmt = $this->conn->prepare($checkLinksSql);
                $checkLinksStmt->execute();
                $hasLinksColumn = $checkLinksStmt->rowCount() > 0;
                
                // ============================================================
                // ONE-PASS SAVE ALGORITHM (Fixed parent_id bug)
                // ============================================================
                error_log("=== Starting ONE-PASS item save for template $templateId ===");
                
                $lastItemAtLevel = []; // Track last inserted database ID at each level
                
                // SINGLE PASS: Insert items sequentially and set parent_id immediately
                foreach ($data['items'] as $index => $item) {
                    // Persist strict list position instead of outline decimals.
                    // This keeps sibling ordering stable even when order_index column
                    // is INT/low-precision DECIMAL in older schemas.
                    $orderIndex = $index + 1;
                    $level = $item['level'] ?? 0;
                    $title = $item['title'];
                    
                    // Determine parent_id from lastItemAtLevel array
                    $parentId = null;
                    if ($level > 0 && isset($lastItemAtLevel[$level - 1])) {
                        $parentId = $lastItemAtLevel[$level - 1];
                    }
                    
                    error_log("  📝 Item #$index: order=$orderIndex, level=$level, parent_id=" . ($parentId ?? 'NULL') . ", title='$title'");
                    
                    // Get sample image URL from frontend (single string format)
                    $sampleImageUrl = $item['sample_image_url'] ?? '';
                    
                    // Build the SQL based on available columns
                    if ($hasSampleImagesColumn) {
                        // Use sample_images array from frontend if provided (includes primary + reference images)
                        // Otherwise, create array from single sample_image_url for backward compatibility
                        $sampleImagesArray = [];
                        
                        if (!empty($item['sample_images']) && is_array($item['sample_images'])) {
                            // Frontend sent full array with primary + reference images
                            // IMPORTANT: Move temp images to permanent storage and update URLs
                            $sampleImagesArray = [];
                            foreach ($item['sample_images'] as $img) {
                                $imageUrl = $img['url'];
                                
                                error_log("  [DEBUG] Processing image URL: $imageUrl");
                                
                                // Check if this is a temp image (contains '/temp/')
                                if (strpos($imageUrl, '/temp/') !== false) {
                                    // Move from temp to permanent storage
                                    $originalUrl = $imageUrl;
                                    $imageUrl = $this->moveTempImageToPermanent($imageUrl);
                                    error_log("  [DEBUG] After moveTempImageToPermanent: original=$originalUrl, new=$imageUrl");
                                } else {
                                    error_log("  [DEBUG] URL is already permanent (no /temp/)");
                                }
                                
                                $sampleImagesArray[] = [
                                    'url' => $imageUrl,
                                    'label' => $img['label'] ?? '',
                                    'description' => $img['description'] ?? '',
                                    'type' => $img['type'] ?? 'photo',
                                    'image_type' => $img['image_type'] ?? 'sample',
                                    'is_primary' => $img['is_primary'] ?? false,
                                    'order_index' => $img['order_index'] ?? 0
                                ];
                            }
                            
                            // Update sample_image_url with the primary image URL
                            $primaryImage = array_filter($sampleImagesArray, function($img) {
                                return $img['is_primary'] === true;
                            });
                            if (!empty($primaryImage)) {
                                $sampleImageUrl = reset($primaryImage)['url'];
                            } elseif (!empty($sampleImagesArray)) {
                                $sampleImageUrl = $sampleImagesArray[0]['url'];
                            }
                            
                            error_log("  📸 Processed sample_images array with " . count($sampleImagesArray) . " images");
                        } elseif (!empty($sampleImageUrl)) {
                            // Fallback: Only sample_image_url provided - create single-image array
                            // Check if it's a temp image
                            if (strpos($sampleImageUrl, '/temp/') !== false) {
                                $sampleImageUrl = $this->moveTempImageToPermanent($sampleImageUrl);
                                error_log("  🔄 Moved temp sample_image_url to permanent: " . $sampleImageUrl);
                            }
                            
                            $sampleImagesArray = [[
                                'url' => $sampleImageUrl,
                                'label' => 'Primary Sample Image',
                                'description' => '',
                                'type' => 'photo',
                                'image_type' => 'sample',
                                'is_primary' => true,
                                'order_index' => 0
                            ]];
                            error_log("  📸 Created single-image array from sample_image_url");
                        }

                        // Process sample_videos if column exists
                        $sampleVideosArray = [];
                        if ($hasSampleVideosColumn && !empty($item['sample_videos']) && is_array($item['sample_videos'])) {
                            foreach ($item['sample_videos'] as $vid) {
                                $videoUrl = $vid['url'];
                                
                                // Check if this is a temp video (contains '/temp/')
                                if (strpos($videoUrl, '/temp/') !== false) {
                                    // Move from temp to permanent storage
                                    $videoUrl = $this->moveTempImageToPermanent($videoUrl);
                                    error_log("  🎬 Moved temp video to permanent: " . $videoUrl);
                                }
                                
                                $sampleVideosArray[] = [
                                    'url' => $videoUrl,
                                    'label' => $vid['label'] ?? '',
                                    'description' => $vid['description'] ?? '',
                                    'type' => $vid['type'] ?? 'video',
                                    'is_primary' => $vid['is_primary'] ?? false,
                                    'order_index' => $vid['order_index'] ?? 0,
                                    'duration_seconds' => $vid['duration_seconds'] ?? null
                                ];
                            }
                            error_log("  🎬 Processed sample_videos array with " . count($sampleVideosArray) . " videos");
                        }
                        
                        // Normalize photo_requirements to ensure submission_type is present
                        $photoRequirements = $item['photo_requirements'] ?? [];
                        $submissionType = $item['submission_type'] ?? 'photo'; // ✅ Read from TOP-LEVEL (not photo_requirements JSON)
                        
                        // Clean up: ensure photo_requirements doesn't have old submission_type remnants
                        if (isset($photoRequirements['submission_type'])) {
                            unset($photoRequirements['submission_type']);
                        }
                        
                        // Build video_requirements JSON from frontend data
                        $videoRequirements = [];
                        if (array_key_exists('submission_time_seconds', $item) && $item['submission_time_seconds'] !== null) {
                            $videoRequirements['submission_time_seconds'] = (int)$item['submission_time_seconds'];
                        }
                        if (isset($item['photo_requirements']['max_video_duration_seconds'])) {
                            $videoRequirements['max_video_duration_seconds'] = (int)$item['photo_requirements']['max_video_duration_seconds'];
                        }

                        $linksPayload = $this->normalizeLinksPayload($item, $hasLinksColumn);
                        
                        // Insert item with correct parent_id IMMEDIATELY
                        $insertColumns = ['template_id', 'order_index', 'parent_id', 'level', 'title', 'description', 'photo_requirements', 'sample_image_url', 'sample_images'];
                        $insertValues = ['?', '?', '?', '?', '?', '?', '?', '?', '?'];
                        $executeParams = [
                            $templateId,
                            $orderIndex,
                            $parentId,  // ← Set parent_id NOW, not in second pass!
                            $level,
                            $title,
                            $item['description'] ?? '',
                            json_encode($photoRequirements),
                            $sampleImageUrl,
                            json_encode($sampleImagesArray)
                        ];
                        
                        if ($hasSampleVideosColumn) {
                            $insertColumns[] = 'sample_videos';
                            $insertValues[] = '?';
                            $executeParams[] = json_encode($sampleVideosArray);
                        }
                        
                        if ($hasSubmissionTypeColumn) {
                            $insertColumns[] = 'submission_type';
                            $insertValues[] = '?';
                            $executeParams[] = $submissionType;
                        }
                        
                        if ($hasVideoRequirementsColumn) {
                            $insertColumns[] = 'video_requirements';
                            $insertValues[] = '?';
                            $executeParams[] = !empty($videoRequirements) ? json_encode($videoRequirements) : null;
                        }

                        if ($hasLinksColumn) {
                            $insertColumns[] = 'links';
                            $insertValues[] = '?';
                            $executeParams[] = json_encode($linksPayload ?? []);
                        }
                        
                        $insertColumns[] = 'is_required';
                        $insertValues[] = '?';
                        $executeParams[] = $item['is_required'] ?? true;
                        
                        // DEBUG: Log what we're about to save to database
                        if (!empty($sampleImagesArray)) {
                            error_log("  💾 About to save sample_images JSON to DB: " . json_encode($sampleImagesArray));
                        }
                        
                        $sql = "INSERT INTO checklist_items (" . implode(', ', $insertColumns) . ") 
                                VALUES (" . implode(', ', $insertValues) . ")";
                        $stmt = $this->conn->prepare($sql);
                        $stmt->execute($executeParams);
                    }
                    
                    // Get the database ID for this item
                    $dbId = $this->conn->lastInsertId();
                    
                    // Save sample media to new table (use processed arrays to avoid temp URLs)
                    $this->saveSampleMediaForItem($dbId, $item, $sampleImagesArray ?? null, $sampleVideosArray ?? null);
                    
                    // Track this item's database ID for its level (for child items to use as parent_id)
                    $lastItemAtLevel[$level] = $dbId;
                    
                    error_log("    ✅ Inserted with DB ID=$dbId, stored at level[$level] for future children");
                }
                
                error_log("=== ONE-PASS save complete ===");
            }
            
            $this->conn->commit();

            $this->ensureTemplateFamilyIntegrity($templateId);
            
            // Fetch the saved template with updated URLs to return to frontend
            $savedTemplate = $this->getTemplate($templateId);
            
            return [
                'success' => true, 
                'template_id' => $templateId,
                'template' => $savedTemplate,
                'image_move_log' => $this->debugLog, // Include debug log in response
                'debug_info' => [
                    'items_saved' => count($data['items'] ?? []),
                    'algorithm' => 'ONE-PASS (sequential parent_id assignment)',
                    'message' => 'All items saved with correct parent_id in single pass'
                ]
            ];
            
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function updateTemplate($id, $dataOverride = null) {
        $data = $dataOverride ?? json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            $data = [];
        }

        $linksError = $this->ensureLinksColumnIfNeeded($data);
        if ($linksError) {
            return ['success' => false, 'error' => $linksError];
        }

        $submissionTypeError = $this->ensureSubmissionTypeColumnSupportsCurrentValues();
        if ($submissionTypeError) {
            return ['success' => false, 'error' => $submissionTypeError];
        }
        
        // Debug: Log the received data
        error_log("updateTemplate received data: " . json_encode($data, JSON_PRETTY_PRINT));

        // Read requested draft flag early (used by publish transition logic)
        $requestedIsDraft = isset($data['is_draft']) ? (int)$data['is_draft'] : null;
        
        // If frontend sends is_draft=1 while editing a published template, DO NOT update the published
        // template in-place (it may have instances/photo_submissions referencing its checklist_items).
        // Instead, create/update a separate draft template and save items there.
        $selectCustomerName = $this->hasChecklistTemplatesCustomerNameColumn() ? ", customer_name" : "";
        $currentStmt = $this->conn->prepare(
            "SELECT id, name, description, part_number, customer_part_number{$selectCustomerName}, revision, original_filename, review_date,
                revision_number, revision_details, revised_by, product_type, category,
                version, is_draft, is_active, parent_template_id, template_group_id
             FROM checklist_templates WHERE id = ?"
        );
        $currentStmt->execute([$id]);
        $currentTemplate = $currentStmt->fetch(PDO::FETCH_ASSOC);
        if (!$currentTemplate) {
            return ['success' => false, 'error' => 'Template not found'];
        }

        // Support partial updates: when a field isn't provided, keep the current DB value.
        $name = array_key_exists('name', $data) ? $data['name'] : ($currentTemplate['name'] ?? '');
        $description = array_key_exists('description', $data) ? ($data['description'] ?? '') : ($currentTemplate['description'] ?? '');
        $partNumber = array_key_exists('part_number', $data) ? ($data['part_number'] ?? '') : ($currentTemplate['part_number'] ?? '');
        $customerPartNumber = array_key_exists('customer_part_number', $data) ? ($data['customer_part_number'] ?? null) : ($currentTemplate['customer_part_number'] ?? null);
        $customerName = null;
        if ($this->hasChecklistTemplatesCustomerNameColumn()) {
            $customerName = array_key_exists('customer_name', $data) ? ($data['customer_name'] ?? null) : ($currentTemplate['customer_name'] ?? null);
        }
        $revision = array_key_exists('revision', $data) ? ($data['revision'] ?? null) : ($currentTemplate['revision'] ?? null);
        $originalFilename = array_key_exists('original_filename', $data) ? ($data['original_filename'] ?? null) : ($currentTemplate['original_filename'] ?? null);
        $reviewDate = array_key_exists('review_date', $data) ? ($data['review_date'] ?? null) : ($currentTemplate['review_date'] ?? null);
        $revisionNumber = array_key_exists('revision_number', $data) ? ($data['revision_number'] ?? null) : ($currentTemplate['revision_number'] ?? null);
        $revisionDetails = array_key_exists('revision_details', $data) ? ($data['revision_details'] ?? null) : ($currentTemplate['revision_details'] ?? null);
        $revisedBy = array_key_exists('revised_by', $data) ? ($data['revised_by'] ?? null) : ($currentTemplate['revised_by'] ?? null);
        $productType = array_key_exists('product_type', $data) ? ($data['product_type'] ?? '') : ($currentTemplate['product_type'] ?? '');
        $category = array_key_exists('category', $data) ? ($data['category'] ?? 'quality_control') : ($currentTemplate['category'] ?? 'quality_control');
        $isActive = array_key_exists('is_active', $data) ? ($data['is_active'] ?? 1) : ($currentTemplate['is_active'] ?? 1);

        $publishingDraft = ($requestedIsDraft === 0 && (int)$currentTemplate['is_draft'] === 1);
        $resolvedPublishVersion = null;
        if ($publishingDraft) {
            // Publishing a draft should keep its current major.minor version (e.g., 2.1 stays 2.1).
            // If that version collides with an existing template in the same family, auto-bump to the next available.
            $groupIdForPublish = (int)($currentTemplate['template_group_id'] ?? 0);
            if ($groupIdForPublish <= 0) {
                $groupIdForPublish = $this->resolveTemplateGroupIdForTemplate((int)$id, (int)($currentTemplate['parent_template_id'] ?? 0));
            }

            if ($groupIdForPublish > 0) {
                $resolvedPublishVersion = $this->resolveVersionForTemplateGroup(
                    $groupIdForPublish,
                    $currentTemplate['version'] ?? ($data['version'] ?? '1.0'),
                    (int)$id
                );
                if (!empty($resolvedPublishVersion) && (string)$resolvedPublishVersion !== (string)($currentTemplate['version'] ?? '')) {
                    error_log("🧮 Publishing draft template ID=$id; requested_version=" . ($currentTemplate['version'] ?? '') . ", resolved_unique_version={$resolvedPublishVersion}");
                } else {
                    error_log("🧮 Publishing draft template ID=$id; keeping version=" . ($currentTemplate['version'] ?? ''));
                }
            }
        }

        $submissionCount = 0;
        $instanceCount = 0;

        if (!empty($data['items']) && is_array($data['items'])) {
            $instanceStmt = $this->conn->prepare(
                "SELECT COUNT(*) FROM checklist_instances WHERE template_id = ?"
            );
            $instanceStmt->execute([$id]);
            $instanceCount = (int)$instanceStmt->fetchColumn();

            $subStmt = $this->conn->prepare(
                "SELECT COUNT(*) FROM photo_submissions ps INNER JOIN checklist_items citm ON ps.item_id = citm.id WHERE citm.template_id = ?"
            );
            $subStmt->execute([$id]);
            $submissionCount = (int)$subStmt->fetchColumn();
        }

        if ($requestedIsDraft === 1 && (int)$currentTemplate['is_draft'] === 0) {
            error_log("🧩 updateTemplate called with is_draft=1 on published template ID=$id; saving to draft copy instead of updating published");
            return $this->saveDraftForPublishedTemplate((int)$id, $data, $currentTemplate);
        }

        // If this template already has submissions referencing its items, we cannot delete/recreate checklist_items
        // without breaking FK constraints.
        // IMPORTANT: only allow clone-on-save for published templates. Draft-on-draft must stay on the same ID.
        if ($requestedIsDraft === 1 && (int)$currentTemplate['is_draft'] === 0 && !empty($data['items']) && is_array($data['items'])) {
            if ($submissionCount > 0) {
                $groupId = !empty($currentTemplate['template_group_id']) ? (int)$currentTemplate['template_group_id'] : null;

                // Preserve nesting dynamically:
                // - If editing a draft, new snapshot draft should be a child of the current draft (this exact level).
                // - If editing published (handled earlier), parenting is resolved in saveDraftForPublishedTemplate().
                $baseParentId = ((int)$currentTemplate['is_draft'] === 1)
                    ? (int)$id
                    : $this->resolveDraftParentTemplateId((int)$id, $currentTemplate['parent_template_id'] ?? null, $groupId);

                if ($groupId === null || $groupId <= 0) {
                    $groupId = $this->resolveTemplateGroupIdForTemplate((int)$id, $baseParentId);
                }

                error_log("🧩 updateTemplate draft save blocked by FK (template ID=$id has $submissionCount submissions). Creating new draft template instead.");

                // Deactivate the old draft so it doesn't stay editable/visible as the latest draft.
                // Instances will still reference it via template_id; leaving row intact preserves history.
                try {
                    $deactivateStmt = $this->conn->prepare("UPDATE checklist_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $deactivateStmt->execute([$id]);
                } catch (Exception $e) {
                    // Non-fatal; continue creating a new draft.
                    error_log("⚠️ Failed to deactivate old draft template ID=$id: " . $e->getMessage());
                }

                if ($baseParentId !== null && (int)$baseParentId > 0 && (int)$baseParentId !== (int)$id) {
                    $data['parent_template_id'] = (int)$baseParentId;
                } else {
                    unset($data['parent_template_id']);
                }
                if ($groupId !== null) {
                    $data['template_group_id'] = $groupId;
                }
                $data['is_draft'] = 1;
                $data['is_active'] = 1;

                return $this->createTemplate($data);
            }
        }

        $this->conn->beginTransaction();
        
        try {

            // Update template (removed is_active = 1 check to allow updating inactive templates)
            $isDraft = isset($data['is_draft']) ? (int)$data['is_draft'] : null;
            
            if ($isDraft !== null) {
                // Update with draft status
                $sql = "UPDATE checklist_templates SET name = ?, description = ?, part_number = ?, customer_part_number = ?";
                $params = [$name, $description, $partNumber, $customerPartNumber];

                if ($this->hasChecklistTemplatesCustomerNameColumn()) {
                    $sql .= ", customer_name = ?";
                    $params[] = $customerName;
                }

                $sql .= ", revision = ?, original_filename = ?, review_date = ?, revision_number = ?, revision_details = ?, revised_by = ?, product_type = ?, category = ?, is_active = ?, is_draft = ?, published_at = CASE WHEN ? = 0 THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
                $params = array_merge($params, [
                    $revision,
                    $originalFilename,
                    $reviewDate,
                    $revisionNumber,
                    $revisionDetails,
                    $revisedBy,
                    $productType,
                    $category,
                    $isActive,
                    $isDraft,
                    $isDraft,
                    $id
                ]);

                $stmt = $this->conn->prepare($sql);
                $stmt->execute($params);

                if ($resolvedPublishVersion !== null) {
                    $versionStmt = $this->conn->prepare("UPDATE checklist_templates SET version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $versionStmt->execute([$resolvedPublishVersion, $id]);
                }

                if ((int)$isDraft === 0) {
                    $this->deactivateOtherPublishedInSameMajor((int)$id);
                }
            } else {
                // Update without changing draft status
                $sql = "UPDATE checklist_templates SET name = ?, description = ?, part_number = ?, customer_part_number = ?";
                $params = [$name, $description, $partNumber, $customerPartNumber];

                if ($this->hasChecklistTemplatesCustomerNameColumn()) {
                    $sql .= ", customer_name = ?";
                    $params[] = $customerName;
                }

                $sql .= ", revision = ?, original_filename = ?, review_date = ?, revision_number = ?, revision_details = ?, revised_by = ?, product_type = ?, category = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
                $params = array_merge($params, [
                    $revision,
                    $originalFilename,
                    $reviewDate,
                    $revisionNumber,
                    $revisionDetails,
                    $revisedBy,
                    $productType,
                    $category,
                    $isActive,
                    $id
                ]);

                $stmt = $this->conn->prepare($sql);
                $stmt->execute($params);
            }
            
            $itemsReorderedInPlace = false;
            $requiresIdPreservingItemUpdate = (!empty($data['items']) && is_array($data['items']) && ($submissionCount > 0 || $instanceCount > 0));

            if ($requiresIdPreservingItemUpdate) {
                $itemsReorderedInPlace = $this->applyInPlaceReorderOnlyUpdate((int)$id, $data['items']);
                if ($itemsReorderedInPlace) {
                    error_log("✅ updateTemplate: template ID=$id has dependent instances/submissions; applied in-place reorder-only item update");
                } else {
                    error_log("❌ updateTemplate: unsafe item mutation blocked for template ID=$id (instance_count=$instanceCount, submission_count=$submissionCount)");
                    throw new Exception('UNSAFE_ITEM_ID_MUTATION_BLOCKED');
                }
            }

            // Delete/reinsert items only when safe (no dependent submissions)
            if (!empty($data['items']) && !$itemsReorderedInPlace) {
                $sql = "DELETE FROM checklist_items WHERE template_id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$id]);

                // Insert updated items with ONE-PASS approach (same as createTemplate)
                error_log("=== Starting ONE-PASS item save for template update ID=$id ===");
                
                // Check if sample_images and sample_videos columns exist once (moved outside loop for efficiency)
                $checkColumnSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_images'";
                $checkStmt = $this->conn->prepare($checkColumnSql);
                $checkStmt->execute();
                $hasSampleImagesColumn = $checkStmt->rowCount() > 0;

                $checkVideosSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_videos'";
                $checkVideosStmt = $this->conn->prepare($checkVideosSql);
                $checkVideosStmt->execute();
                $hasSampleVideosColumn = $checkVideosStmt->rowCount() > 0;

                $checkVideoReqSql = "SHOW COLUMNS FROM checklist_items LIKE 'video_requirements'";
                $checkVideoReqStmt = $this->conn->prepare($checkVideoReqSql);
                $checkVideoReqStmt->execute();
                $hasVideoRequirementsColumn = $checkVideoReqStmt->rowCount() > 0;
                
                $checkSubmissionTypeSql = "SHOW COLUMNS FROM checklist_items LIKE 'submission_type'";
                $checkSubmissionTypeStmt = $this->conn->prepare($checkSubmissionTypeSql);
                $checkSubmissionTypeStmt->execute();
                $hasSubmissionTypeColumn = $checkSubmissionTypeStmt->rowCount() > 0;

                $checkLinksSql = "SHOW COLUMNS FROM checklist_items LIKE 'links'";
                $checkLinksStmt = $this->conn->prepare($checkLinksSql);
                $checkLinksStmt->execute();
                $hasLinksColumn = $checkLinksStmt->rowCount() > 0;
                
                // ONE-PASS ALGORITHM: Track last inserted database ID at each level
                $lastItemAtLevel = [];
                
                // SINGLE PASS: Insert items sequentially and set parent_id immediately
                foreach ($data['items'] as $index => $item) {
                    // Persist strict list position instead of outline decimals.
                    // This keeps sibling ordering stable even when order_index column
                    // is INT/low-precision DECIMAL in older schemas.
                    $orderIndex = $index + 1;
                    $level = $item['level'] ?? 0;
                    $title = $item['title'];
                    
                    // Determine parent_id from lastItemAtLevel array
                    $parentId = null;
                    if ($level > 0 && isset($lastItemAtLevel[$level - 1])) {
                        $parentId = $lastItemAtLevel[$level - 1];
                    }
                    
                    error_log("  📝 Item #$index: order=$orderIndex, level=$level, parent_id=" . ($parentId ?? 'NULL') . ", title='$title'");
                    
                    // Get sample image URL from frontend (single string format)
                    $sampleImageUrl = $item['sample_image_url'] ?? '';
                    
                    // Build the SQL based on available columns
                    if ($hasSampleImagesColumn) {
                        // Use sample_images array from frontend if provided (includes primary + reference images)
                        // Otherwise, create array from single sample_image_url for backward compatibility
                        $sampleImagesArray = [];
                        
                        if (!empty($item['sample_images']) && is_array($item['sample_images'])) {
                            // Frontend sent full array with primary + reference images
                            error_log("  📸 Processing frontend sample_images array with " . count($item['sample_images']) . " images");
                            
                            // Process each image: move from temp to permanent storage if needed
                            foreach ($item['sample_images'] as $img) {
                                $imageUrl = $img['url'];
                                
                                // Check if this is a temp image that needs to be moved
                                if (strpos($imageUrl, '/temp/') !== false) {
                                    error_log("    🔄 Found temp image: $imageUrl");
                                    $imageUrl = $this->moveTempImageToPermanent($imageUrl);
                                    error_log("    ✅ Moved to permanent: $imageUrl");
                                }
                                
                                // Add image with permanent URL to array
                                $sampleImagesArray[] = [
                                    'url' => $imageUrl,
                                    'label' => $img['label'] ?? '',
                                    'description' => $img['description'] ?? '',
                                    'type' => $img['type'] ?? 'photo',
                                    'image_type' => $img['image_type'] ?? 'sample',
                                    'is_primary' => $img['is_primary'] ?? false,
                                    'order_index' => $img['order_index'] ?? 0
                                ];
                            }
                            
                            // Update primary image URL from the array (for backward compatibility with sample_image_url column)
                            foreach ($sampleImagesArray as $img) {
                                if ($img['is_primary']) {
                                    $sampleImageUrl = $img['url'];
                                    error_log("  🔵 Extracted primary image URL: $sampleImageUrl");
                                    break;
                                }
                            }
                            
                            error_log("  📸 Processed " . count($sampleImagesArray) . " images (all now in permanent storage)");
                        } elseif (!empty($sampleImageUrl)) {
                            // Fallback: Only sample_image_url provided - check if temp and move if needed
                            if (strpos($sampleImageUrl, '/temp/') !== false) {
                                error_log("    🔄 Found temp sample_image_url: $sampleImageUrl");
                                $sampleImageUrl = $this->moveTempImageToPermanent($sampleImageUrl);
                                error_log("    ✅ Moved to permanent: $sampleImageUrl");
                            }
                            
                            // Create single-image array
                            $sampleImagesArray = [[
                                'url' => $sampleImageUrl,
                                'label' => 'Sample Image',
                                'description' => '',
                                'type' => 'photo',
                                'is_primary' => true,
                                'order_index' => 0
                            ]];
                            error_log("  📸 Created single-image array from sample_image_url");
                        }

                        // Process sample_videos if column exists
                        $sampleVideosArray = [];
                        if ($hasSampleVideosColumn && !empty($item['sample_videos']) && is_array($item['sample_videos'])) {
                            foreach ($item['sample_videos'] as $vid) {
                                $videoUrl = $vid['url'];
                                
                                // Check if this is a temp video (contains '/temp/')
                                if (strpos($videoUrl, '/temp/') !== false) {
                                    // Move from temp to permanent storage
                                    $videoUrl = $this->moveTempImageToPermanent($videoUrl);
                                    error_log("  🎬 Moved temp video to permanent: " . $videoUrl);
                                }
                                
                                $sampleVideosArray[] = [
                                    'url' => $videoUrl,
                                    'label' => $vid['label'] ?? '',
                                    'description' => $vid['description'] ?? '',
                                    'type' => $vid['type'] ?? 'video',
                                    'is_primary' => $vid['is_primary'] ?? false,
                                    'order_index' => $vid['order_index'] ?? 0,
                                    'duration_seconds' => $vid['duration_seconds'] ?? null
                                ];
                            }
                            error_log("  🎬 Processed sample_videos array with " . count($sampleVideosArray) . " videos");
                        }
                        
                        // Normalize photo_requirements to ensure submission_type is present
                        $photoRequirements = $item['photo_requirements'] ?? [];
                        $submissionType = $item['submission_type'] ?? 'photo'; // ✅ Read from TOP-LEVEL (not photo_requirements JSON)
                        
                        // Clean up: ensure photo_requirements doesn't have old submission_type remnants
                        if (isset($photoRequirements['submission_type'])) {
                            unset($photoRequirements['submission_type']);
                        }
                        
                        // Build video_requirements JSON from frontend data
                        $videoRequirements = [];
                        if (array_key_exists('submission_time_seconds', $item) && $item['submission_time_seconds'] !== null) {
                            $videoRequirements['submission_time_seconds'] = (int)$item['submission_time_seconds'];
                        }
                        if (isset($item['photo_requirements']['max_video_duration_seconds'])) {
                            $videoRequirements['max_video_duration_seconds'] = (int)$item['photo_requirements']['max_video_duration_seconds'];
                        }

                        $linksPayload = $this->normalizeLinksPayload($item, $hasLinksColumn);
                        
                        // Insert item with correct parent_id IMMEDIATELY
                        $insertColumns = ['template_id', 'order_index', 'parent_id', 'level', 'title', 'description', 'photo_requirements', 'sample_image_url', 'sample_images'];
                        $insertValues = ['?', '?', '?', '?', '?', '?', '?', '?', '?'];
                        $executeParams = [
                            $id,
                            $orderIndex,
                            $parentId,  // ← Set parent_id NOW, not in second pass!
                            $level,
                            $title,
                            $item['description'] ?? '',
                            json_encode($photoRequirements),
                            $sampleImageUrl,
                            json_encode($sampleImagesArray)
                        ];
                        
                        if ($hasSampleVideosColumn) {
                            $insertColumns[] = 'sample_videos';
                            $insertValues[] = '?';
                            $executeParams[] = json_encode($sampleVideosArray);
                        }
                        
                        if ($hasSubmissionTypeColumn) {
                            $insertColumns[] = 'submission_type';
                            $insertValues[] = '?';
                            $executeParams[] = $submissionType;
                        }
                        
                        if ($hasVideoRequirementsColumn) {
                            $insertColumns[] = 'video_requirements';
                            $insertValues[] = '?';
                            $executeParams[] = !empty($videoRequirements) ? json_encode($videoRequirements) : null;
                        }

                        if ($hasLinksColumn) {
                            $insertColumns[] = 'links';
                            $insertValues[] = '?';
                            $executeParams[] = json_encode($linksPayload ?? []);
                        }
                        
                        $insertColumns[] = 'is_required';
                        $insertValues[] = '?';
                        $executeParams[] = $item['is_required'] ?? true;
                        
                        $sql = "INSERT INTO checklist_items (" . implode(', ', $insertColumns) . ") 
                                VALUES (" . implode(', ', $insertValues) . ")";
                        $stmt = $this->conn->prepare($sql);
                        $stmt->execute($executeParams);
                    }
                    
                    // Get the database ID for this item
                    $dbId = $this->conn->lastInsertId();
                    
                    // Save sample media to new table (use processed arrays to avoid temp URLs)
                    $this->saveSampleMediaForItem($dbId, $item, $sampleImagesArray ?? null, $sampleVideosArray ?? null);
                    
                    // Track this item's database ID for its level (for child items to use as parent_id)
                    $lastItemAtLevel[$level] = $dbId;
                    
                    error_log("    ✅ Inserted with DB ID=$dbId, stored at level[$level] for future children");
                }
                
                error_log("=== ONE-PASS update complete ===");
            }
            
            $this->conn->commit();
            
            // Fetch the updated template with new URLs to return to frontend
            if ($isDraft !== null && (int)$isDraft === 0) {
                $this->ensureTemplateFamilyIntegrity($id);
            }
            $updatedTemplate = $this->getTemplate($id);
            
            return [
                'success' => true, 
                'template_id' => $id, 
                'template' => $updatedTemplate,
                'algorithm' => 'ONE-PASS',
                'submission_count' => $submissionCount,
                'instance_count' => $instanceCount
            ];
            
        } catch (Exception $e) {
            $this->conn->rollback();
            if ($e->getMessage() === 'UNSAFE_ITEM_ID_MUTATION_BLOCKED') {
                return [
                    'success' => false,
                    'code' => 'UNSAFE_ITEM_ID_MUTATION_BLOCKED',
                    'error' => 'Cannot apply this change in-place because this template has existing checklist instances or submissions. Reorder-only updates are allowed.',
                    'instance_count' => $instanceCount,
                    'submission_count' => $submissionCount
                ];
            }
            throw $e;
        }
    }

    private function applyInPlaceReorderOnlyUpdate(int $templateId, array $incomingItems): bool {
        if (empty($incomingItems)) {
            return false;
        }

        $checkLinksSql = "SHOW COLUMNS FROM checklist_items LIKE 'links'";
        $checkLinksStmt = $this->conn->prepare($checkLinksSql);
        $checkLinksStmt->execute();
        $hasLinksColumn = $checkLinksStmt->rowCount() > 0;

        $selectFields = "id, title, description, is_required, sample_image_url, sample_images, sample_videos, photo_requirements, submission_type";
        if ($hasLinksColumn) {
            $selectFields .= ", links";
        }

        $currentSql = "SELECT {$selectFields} FROM checklist_items WHERE template_id = ?";
        $currentStmt = $this->conn->prepare($currentSql);
        $currentStmt->execute([$templateId]);
        $currentRows = $currentStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        if (count($currentRows) !== count($incomingItems)) {
            return false;
        }

        $currentById = [];
        foreach ($currentRows as $row) {
            $rowId = (int)($row['id'] ?? 0);
            if ($rowId <= 0) {
                return false;
            }
            $currentById[$rowId] = $row;
        }

        $seenIds = [];
        foreach ($incomingItems as $item) {
            $itemId = (int)($item['id'] ?? 0);
            if ($itemId <= 0 || isset($seenIds[$itemId]) || !isset($currentById[$itemId])) {
                return false;
            }
            $seenIds[$itemId] = true;
        }

        $lastItemAtLevel = [];
        $maxSeenLevel = 0;

        $updateSql = "UPDATE checklist_items SET order_index = ?, level = ?, parent_id = ? WHERE id = ? AND template_id = ?";
        $updateStmt = $this->conn->prepare($updateSql);

        foreach ($incomingItems as $index => $item) {
            $itemId = (int)($item['id'] ?? 0);
            $level = isset($item['level']) ? (int)$item['level'] : 0;
            if ($level < 0) {
                $level = 0;
            }

            // Persist strict list position to keep ordering deterministic across
            // schemas that may store order_index as INT or DECIMAL.
            $orderIndex = (float)($index + 1);

            $parentId = null;
            if ($level > 0) {
                if (!isset($lastItemAtLevel[$level - 1])) {
                    return false;
                }
                $parentId = (int)$lastItemAtLevel[$level - 1];
            }

            for ($lvl = $level + 1; $lvl <= $maxSeenLevel; $lvl++) {
                unset($lastItemAtLevel[$lvl]);
            }

            $lastItemAtLevel[$level] = $itemId;
            if ($level > $maxSeenLevel) {
                $maxSeenLevel = $level;
            }

            $updateStmt->execute([$orderIndex, $level, $parentId, $itemId, $templateId]);
        }

        return true;
    }

    private function valuesEquivalent($a, $b): bool {
        $na = $this->normalizeComparableValue($a);
        $nb = $this->normalizeComparableValue($b);

        if (is_array($na) || is_array($nb)) {
            return json_encode($na) === json_encode($nb);
        }

        return $na === $nb;
    }

    private function normalizeComparableValue($value) {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return null;
            }

            if (($trimmed[0] === '{' || $trimmed[0] === '[')) {
                $decoded = json_decode($trimmed, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $value = $decoded;
                } else {
                    return $trimmed;
                }
            } else {
                return $trimmed;
            }
        }

        if (is_array($value)) {
            return $this->sortRecursiveForComparison($value);
        }

        if (is_bool($value)) {
            return $value ? 1 : 0;
        }

        if (is_numeric($value)) {
            return (float)$value;
        }

        return $value;
    }

    private function sortRecursiveForComparison(array $value): array {
        $isAssoc = array_keys($value) !== range(0, count($value) - 1);

        if ($isAssoc) {
            ksort($value);
        }

        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortRecursiveForComparison($item);
            } elseif (is_string($item)) {
                $value[$key] = trim($item);
            }
        }

        return $value;
    }

    /**
     * Create a new parent/root version (major version) from an existing template.
     * - New template shares template_group_id with the source (same family)
     * - New template has parent_template_id = NULL (new root branch)
     * - Version defaults to next major: (source major + 1).0
     *
     * This is how users create v2.0 from v1.0 without it becoming a child like v1.0.1.
     */
    public function createParentVersion($sourceTemplateId) {
        $sourceTemplateId = (int)$sourceTemplateId;
        if ($sourceTemplateId <= 0) {
            return ['success' => false, 'error' => 'Invalid source template ID'];
        }

        $selectCustomerName = $this->hasChecklistTemplatesCustomerNameColumn() ? ", customer_name" : "";
        $sourceRowStmt = $this->conn->prepare(
            "SELECT id, name, description, part_number, customer_part_number{$selectCustomerName}, revision, original_filename, review_date,
                revision_number, revision_details, revised_by, product_type, category, version,
                template_group_id, created_by
             FROM checklist_templates
             WHERE id = ?")
        ;
        $sourceRowStmt->execute([$sourceTemplateId]);
        $sourceRow = $sourceRowStmt->fetch(PDO::FETCH_ASSOC);
        if (!$sourceRow) {
            return ['success' => false, 'error' => 'Source template not found'];
        }

        $templateGroupId = !empty($sourceRow['template_group_id']) ? (int)$sourceRow['template_group_id'] : (int)$sourceTemplateId;

        // Compute the next major based on the latest major that exists in this template family,
        // not just the specific template the user clicked.
        $maxMajor = 0;

        $whereDeleted = '';
        if ($this->hasChecklistTemplatesIsDeletedColumn()) {
            $whereDeleted = ' AND COALESCE(is_deleted, 0) = 0';
        }

        // IMPORTANT: base next major on PUBLISHED templates only.
        // Drafts must not advance the next-major computation (otherwise v4.0 draft would cause next click to create v5.0 draft).
        $versionsStmt = $this->conn->prepare(
            "SELECT version FROM checklist_templates WHERE template_group_id = ? AND is_draft = 0 {$whereDeleted}"
        );
        $versionsStmt->execute([(int)$templateGroupId]);
        $versionRows = $versionsStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($versionRows as $vr) {
            [$maj] = $this->parseVersionParts($vr['version'] ?? '');
            $maj = (int)$maj;
            if ($maj > $maxMajor) {
                $maxMajor = $maj;
            }
        }

        if ($maxMajor <= 0) {
            [$maxMajor] = $this->parseVersionParts($sourceRow['version'] ?? '1.0');
            $maxMajor = (int)$maxMajor;
        }

        $nextMajorVersion = ((int)$maxMajor + 1) . '.0';

        // Single-draft policy for major versions: if the next major draft already exists for this family,
        // reuse it instead of creating duplicates.
        $whereDeleted = '';
        if ($this->hasChecklistTemplatesIsDeletedColumn()) {
            $whereDeleted = ' AND COALESCE(is_deleted, 0) = 0';
        }

        $existingMajorDraftStmt = $this->conn->prepare(
            "SELECT id
             FROM checklist_templates
             WHERE template_group_id = ?
               AND is_draft = 1
               AND parent_template_id IS NULL
               AND version = ?
               {$whereDeleted}
             ORDER BY is_active DESC, updated_at DESC, id DESC
             LIMIT 1"
        );
        $existingMajorDraftStmt->execute([(int)$templateGroupId, (string)$nextMajorVersion]);
        $existingMajorDraftId = (int)($existingMajorDraftStmt->fetchColumn() ?: 0);

        if ($existingMajorDraftId > 0) {
            try {
                // Make chosen draft active and hide any siblings (defensive cleanup).
                $activateStmt = $this->conn->prepare(
                    "UPDATE checklist_templates SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                );
                $activateStmt->execute([(int)$existingMajorDraftId]);

                $deactivateSiblingsStmt = $this->conn->prepare(
                    "UPDATE checklist_templates
                     SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                     WHERE template_group_id = ?
                       AND is_draft = 1
                       AND parent_template_id IS NULL
                       AND id != ?
                       {$whereDeleted}"
                );
                $deactivateSiblingsStmt->execute([(int)$templateGroupId, (int)$existingMajorDraftId]);
            } catch (Exception $e) {
                // Non-fatal
                error_log("⚠️ createParentVersion: failed to enforce single major draft policy: " . $e->getMessage());
            }

            $existingTemplate = $this->getTemplate($existingMajorDraftId, true, true);
            return [
                'success' => true,
                'template_id' => $existingMajorDraftId,
                'template' => $existingTemplate,
                'reused_existing_draft' => true,
                'version' => (string)$nextMajorVersion
            ];
        }

        // Enforce only one active root major draft in the family before creating a new one.
        // (Even though drafts remain visible in history views, this prevents multiple "Active" drafts like v4.0 and v5.0.)
        try {
            $deactivateOtherRootDraftsStmt = $this->conn->prepare(
                "UPDATE checklist_templates
                 SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                 WHERE template_group_id = ?
                   AND is_draft = 1
                   AND parent_template_id IS NULL
                   {$whereDeleted}"
            );
            $deactivateOtherRootDraftsStmt->execute([(int)$templateGroupId]);
        } catch (Exception $e) {
            // Non-fatal
            error_log("⚠️ createParentVersion: failed to deactivate existing root drafts before create: " . $e->getMessage());
        }

        // Fetch items from the source template (include inactive OK)
        // IMPORTANT: getTemplate() returns NESTED items (children arrays). createTemplate() expects a FLAT list.
        $sourceFull = $this->getTemplate($sourceTemplateId, true, true);
        $items = [];
        if (is_array($sourceFull) && !empty($sourceFull['items']) && is_array($sourceFull['items'])) {
            $flatItems = $this->flattenNestedTemplateItemsForCreate($sourceFull['items'], 0);
            foreach ($flatItems as $item) {
                if (!is_array($item)) {
                    continue;
                }

                // Strip fields that should not be client-controlled on create
                unset($item['id'], $item['template_id'], $item['created_at'], $item['updated_at']);
                // Ensure no nested structures remain
                unset($item['children']);
                $items[] = $item;
            }
        }

        $payload = [
            'name' => (string)($sourceRow['name'] ?? ''),
            'description' => (string)($sourceRow['description'] ?? ''),
            'part_number' => $sourceRow['part_number'] ?? '',
            'customer_part_number' => $sourceRow['customer_part_number'] ?? null,
            'customer_name' => $this->hasChecklistTemplatesCustomerNameColumn() ? ($sourceRow['customer_name'] ?? null) : null,
            'revision' => $sourceRow['revision'] ?? null,
            'original_filename' => $sourceRow['original_filename'] ?? null,
            'review_date' => $sourceRow['review_date'] ?? null,
            'revision_number' => $sourceRow['revision_number'] ?? null,
            'revision_details' => $sourceRow['revision_details'] ?? null,
            'revised_by' => $sourceRow['revised_by'] ?? null,
            'product_type' => $sourceRow['product_type'] ?? '',
            'category' => $sourceRow['category'] ?? 'quality_control',
            'version' => $nextMajorVersion,
            'template_group_id' => $templateGroupId,
            'is_draft' => 1,
            'is_active' => 1,
            'created_by' => $sourceRow['created_by'] ?? null,
            'items' => $items
        ];

        // New parent version: no parent_template_id, and do not pass source_template_id (that would create a child).
        unset($payload['parent_template_id'], $payload['source_template_id']);

        return $this->createTemplate($payload);
    }

    /**
     * Save Draft behavior (copy-on-write): if user is editing a published template and clicks Save Draft,
     * never update the published row in-place. Instead, create or update a separate draft linked via
     * parent_template_id.
     */
    private function saveDraftForPublishedTemplate($publishedTemplateId, $data, $publishedTemplateRow = null) {
        $data['is_draft'] = 1;
        $data['is_active'] = $data['is_active'] ?? 1;
        unset($data['source_template_id']);

        $templateGroupId = null;
        if (is_array($publishedTemplateRow) && !empty($publishedTemplateRow['template_group_id'])) {
            $templateGroupId = (int)$publishedTemplateRow['template_group_id'];
        }
        if (!$templateGroupId) {
            $tplStmt = $this->conn->prepare("SELECT template_group_id FROM checklist_templates WHERE id = ?");
            $tplStmt->execute([(int)$publishedTemplateId]);
            $templateGroupId = (int)($tplStmt->fetchColumn() ?: 0);
        }

        $stableParentId = (int)$publishedTemplateId;

        $data['parent_template_id'] = (int)$stableParentId;
        if ($templateGroupId) {
            $data['template_group_id'] = (int)$templateGroupId;
        }

        // Single-draft policy: reuse one existing draft for this published template.
        // Prefer currently active draft; otherwise reuse the most recently updated draft.
        $existingDraftId = null;
        try {
            $findActiveStmt = $this->conn->prepare(
                "SELECT id FROM checklist_templates WHERE parent_template_id = ? AND is_draft = 1 AND is_active = 1 ORDER BY updated_at DESC, id DESC LIMIT 1"
            );
            $findActiveStmt->execute([(int)$stableParentId]);
            $existingDraftId = (int)($findActiveStmt->fetchColumn() ?: 0);

            if ($existingDraftId <= 0) {
                $findAnyStmt = $this->conn->prepare(
                    "SELECT id FROM checklist_templates WHERE parent_template_id = ? AND is_draft = 1 ORDER BY updated_at DESC, id DESC LIMIT 1"
                );
                $findAnyStmt->execute([(int)$stableParentId]);
                $existingDraftId = (int)($findAnyStmt->fetchColumn() ?: 0);
            }
        } catch (Exception $e) {
            error_log("⚠️ Save Draft: failed while locating existing draft for parent ID=$publishedTemplateId: " . $e->getMessage());
            $existingDraftId = 0;
        }

        if ($existingDraftId > 0) {
            try {
                // Keep only one active draft visible for this parent.
                $deactivateOthersStmt = $this->conn->prepare(
                    "UPDATE checklist_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE parent_template_id = ? AND is_draft = 1 AND id != ?"
                );
                $deactivateOthersStmt->execute([(int)$stableParentId, (int)$existingDraftId]);
            } catch (Exception $e) {
                error_log("⚠️ Save Draft: failed to deactivate sibling drafts for parent ID=$publishedTemplateId: " . $e->getMessage());
            }

            error_log("♻️ Save Draft: updating existing draft template ID=$existingDraftId for published template ID=$publishedTemplateId (group_id=$templateGroupId)");
            return $this->updateTemplate((int)$existingDraftId, $data);
        }

        error_log("🆕 Save Draft: creating first draft template for published template ID=$publishedTemplateId (group_id=$templateGroupId)");
        return $this->createTemplate($data);
    }

    /**
     * Resolve stable parent template for a draft save operation.
     * Never returns the same ID as the current template.
     */
    private function resolveDraftParentTemplateId($templateId, $currentParentId = null, $templateGroupId = null) {
        $templateId = (int)$templateId;
        $parentId = !empty($currentParentId) ? (int)$currentParentId : null;

        if ($parentId !== null && $parentId > 0 && $parentId !== $templateId) {
            return $parentId;
        }

        // If no parent exists, create the new draft as a child of the current template.
        return $templateId;
    }

    /**
     * Resolve a template group id using current template and optional parent.
     */
    private function resolveTemplateGroupIdForTemplate($templateId, $parentTemplateId = null) {
        $templateId = (int)$templateId;

        if (!empty($parentTemplateId)) {
            $parentStmt = $this->conn->prepare("SELECT template_group_id FROM checklist_templates WHERE id = ?");
            $parentStmt->execute([(int)$parentTemplateId]);
            $parentGroupId = (int)($parentStmt->fetchColumn() ?: 0);
            if ($parentGroupId > 0) {
                return $parentGroupId;
            }
        }

        $stmt = $this->conn->prepare("SELECT template_group_id FROM checklist_templates WHERE id = ?");
        $stmt->execute([$templateId]);
        $groupId = (int)($stmt->fetchColumn() ?: 0);

        if ($groupId > 0) {
            return $groupId;
        }

        return $templateId;
    }

    /**
     * Ensure template family linkage is preserved:
     * - Keep existing parent_template_id untouched.
     * - Backfill template_group_id when missing.
     */
    private function ensureTemplateFamilyIntegrity($id) {
        $stmt = $this->conn->prepare("SELECT id, parent_template_id, template_group_id FROM checklist_templates WHERE id = ?");
        $stmt->execute([(int)$id]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$template) {
            return;
        }

        $templateId = (int)$template['id'];
        $parentTemplateId = !empty($template['parent_template_id']) ? (int)$template['parent_template_id'] : null;
        $currentGroupId = !empty($template['template_group_id']) ? (int)$template['template_group_id'] : 0;

        // Never allow self-parenting
        if ($parentTemplateId !== null && $parentTemplateId === $templateId) {
            $parentTemplateId = null;
        }

        // Keep direct parent/child relationship; only ensure group consistency.

        // If this is not the group root and parent is missing, recover a canonical parent from the same family.
        if ($parentTemplateId === null && $currentGroupId > 0 && $templateId !== $currentGroupId) {
            $inferredParentId = $this->resolveDraftParentTemplateId($templateId, null, $currentGroupId);
            if (!empty($inferredParentId) && (int)$inferredParentId !== $templateId) {
                $parentTemplateId = (int)$inferredParentId;
            }
        }

        $resolvedGroupId = null;

        if ($parentTemplateId) {
            $parentStmt = $this->conn->prepare("SELECT template_group_id FROM checklist_templates WHERE id = ?");
            $parentStmt->execute([$parentTemplateId]);
            $parentGroupId = (int)($parentStmt->fetchColumn() ?: 0);
            if ($parentGroupId > 0) {
                $resolvedGroupId = $parentGroupId;
            }
        }

        if (!$resolvedGroupId && $currentGroupId > 0) {
            $resolvedGroupId = $currentGroupId;
        }

        if (!$resolvedGroupId) {
            $resolvedGroupId = $templateId;
        }

        $updateStmt = $this->conn->prepare("UPDATE checklist_templates SET parent_template_id = ?, template_group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $updateStmt->execute([$parentTemplateId, $resolvedGroupId, $templateId]);

        error_log("🧬 ensureTemplateFamilyIntegrity: template ID={$templateId}, parent_id=" . ($parentTemplateId ?? 'NULL') . ", group_id={$resolvedGroupId}");
    }

    /**
     * Publish template (convert draft to published)
     */
    public function publishTemplate($id) {
        try {
            $templateStmt = $this->conn->prepare("SELECT id, version, is_draft, parent_template_id, template_group_id FROM checklist_templates WHERE id = ?");
            $templateStmt->execute([(int)$id]);
            $template = $templateStmt->fetch(PDO::FETCH_ASSOC);

            if (!$template) {
                return ['success' => false, 'error' => 'Template not found'];
            }

            $newVersion = null;
            if ((int)$template['is_draft'] === 1) {
                $groupIdForPublish = (int)($template['template_group_id'] ?? 0);
                if ($groupIdForPublish <= 0) {
                    $groupIdForPublish = $this->resolveTemplateGroupIdForTemplate((int)$id, (int)($template['parent_template_id'] ?? 0));
                }

                if ($groupIdForPublish > 0) {
                    $newVersion = $this->resolveVersionForTemplateGroup(
                        $groupIdForPublish,
                        $template['version'] ?? '1.0',
                        (int)$id
                    );
                }
            }

            $sql = "UPDATE checklist_templates 
                    SET is_draft = 0,
                        is_active = 1,
                        version = COALESCE(?, version),
                        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$newVersion, $id]);

            $this->ensureTemplateFamilyIntegrity($id);
            $this->deactivateOtherPublishedInSameMajor((int)$id);
            
            error_log("✅ Published template ID=$id");
            
            return ['success' => true, 'template_id' => $id, 'published' => true];
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function deleteTemplate($id) {
        // Check if template has any existing instances (regardless of status)
        $sql = "SELECT COUNT(*) as instance_count FROM checklist_instances 
            WHERE template_id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ((int)$result['instance_count'] > 0) {
            return [
                'success' => false, 
            'error' => 'Cannot delete template with existing instances.',
            'instance_count' => (int)$result['instance_count']
            ];
        }
        
        $this->conn->beginTransaction();
        
        try {
            // Soft delete - mark as inactive and clear draft flag to hide from manager list
            if ($this->hasChecklistTemplatesIsDeletedColumn()) {
                $sql = "UPDATE checklist_templates SET is_active = 0, is_draft = 0, is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            } else {
                $sql = "UPDATE checklist_templates SET is_active = 0, is_draft = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            }
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$id]);
            
            // Log the deletion
            $sql = "INSERT INTO checklist_audit_log (instance_id, action, user_id, details, ip_address, user_agent) 
                    VALUES (NULL, 'template_deleted', NULL, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                json_encode(['template_id' => $id, 'deleted_at' => date('Y-m-d H:i:s')]),
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
            
            $this->conn->commit();
            return ['success' => true, 'message' => 'Template marked as inactive'];
            
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    /**
     * Permanently delete a template version and its line items.
     * Safety checks (must all be zero):
     * - No checklist instances exist for this template_id
     * - No photo submissions exist referencing this template's items
     * - No document control revisions reference this template_id
     * - Not the current_template_id of any document_control record
     * - No other templates reference this template as parent_template_id
     */
    public function hardDeleteTemplate($id) {
        $templateId = (int)$id;

        $stmt = $this->conn->prepare("SELECT id, name, is_draft, is_active, parent_template_id, template_group_id FROM checklist_templates WHERE id = ?");
        $stmt->execute([$templateId]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$template) {
            return ['success' => false, 'error' => 'Template not found'];
        }

        // Block if any instances exist.
        $instanceStmt = $this->conn->prepare("SELECT COUNT(*) FROM checklist_instances WHERE template_id = ?");
        $instanceStmt->execute([$templateId]);
        $instanceCount = (int)$instanceStmt->fetchColumn();
        if ($instanceCount > 0) {
            return ['success' => false, 'error' => 'Cannot hard delete template with existing instances.', 'instance_count' => $instanceCount];
        }

        // Block if any photo submissions exist for this template's items.
        $submissionStmt = $this->conn->prepare(
            "SELECT COUNT(*)
             FROM photo_submissions ps
             INNER JOIN checklist_items citm ON ps.item_id = citm.id
             WHERE citm.template_id = ?"
        );
        $submissionStmt->execute([$templateId]);
        $submissionCount = (int)$submissionStmt->fetchColumn();
        if ($submissionCount > 0) {
            return ['success' => false, 'error' => 'Cannot hard delete template because photo submissions reference its items.', 'submission_count' => $submissionCount];
        }

        // Block if document control revisions reference this template.
        try {
            $docRevStmt = $this->conn->prepare("SELECT COUNT(*) FROM document_revisions WHERE template_id = ?");
            $docRevStmt->execute([$templateId]);
            $docRevCount = (int)$docRevStmt->fetchColumn();
            if ($docRevCount > 0) {
                return ['success' => false, 'error' => 'Cannot hard delete template because document control revisions reference it.', 'document_revision_count' => $docRevCount];
            }
        } catch (Exception $e) {
            // document_revisions table may not exist in some deployments; ignore.
        }

        // Block if it is the current template for any controlled document.
        try {
            $docCurrentStmt = $this->conn->prepare("SELECT COUNT(*) FROM document_control WHERE current_template_id = ?");
            $docCurrentStmt->execute([$templateId]);
            $docCurrentCount = (int)$docCurrentStmt->fetchColumn();
            if ($docCurrentCount > 0) {
                return ['success' => false, 'error' => 'Cannot hard delete template because it is the current template for a controlled document.', 'document_current_count' => $docCurrentCount];
            }
        } catch (Exception $e) {
            // document_control table may not exist; ignore.
        }

        // Block if any other templates point to this as a parent.
        $childStmt = $this->conn->prepare("SELECT COUNT(*) FROM checklist_templates WHERE parent_template_id = ?");
        $childStmt->execute([$templateId]);
        $childCount = (int)$childStmt->fetchColumn();
        if ($childCount > 0) {
            return ['success' => false, 'error' => 'Cannot hard delete template because other versions/drafts reference it as a parent.', 'child_count' => $childCount];
        }

        $this->conn->beginTransaction();
        try {
            // Delete line items for this version.
            $deleteItemsStmt = $this->conn->prepare("DELETE FROM checklist_items WHERE template_id = ?");
            $deleteItemsStmt->execute([$templateId]);

            // Delete the template row.
            $deleteTemplateStmt = $this->conn->prepare("DELETE FROM checklist_templates WHERE id = ?");
            $deleteTemplateStmt->execute([$templateId]);

            // Audit log
            $auditStmt = $this->conn->prepare(
                "INSERT INTO checklist_audit_log (instance_id, action, user_id, details, ip_address, user_agent)
                 VALUES (NULL, 'template_hard_deleted', NULL, ?, ?, ?)"
            );
            $auditStmt->execute([
                json_encode(['template_id' => $templateId, 'template_name' => $template['name'] ?? null, 'deleted_at' => date('Y-m-d H:i:s')]),
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);

            $this->conn->commit();
            return ['success' => true, 'template_id' => $templateId, 'message' => 'Template permanently deleted'];
        } catch (Exception $e) {
            $this->conn->rollback();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Soft delete an entire major line for a template family.
     * - Marks all templates with version major=$major in template_group_id=$groupId as inactive and deleted.
     * - Blocks if any checklist_instances or photo_submissions exist for ANY template in that major.
     */
    public function deleteMajorVersion($groupId, $major) {
        $groupId = (int)$groupId;
        $major = (int)$major;

        if ($groupId <= 0 || $major <= 0) {
            return ['success' => false, 'error' => 'Invalid group_id or major'];
        }

        $whereDeleted = '';
        if ($this->hasChecklistTemplatesIsDeletedColumn()) {
            $whereDeleted = ' AND COALESCE(is_deleted, 0) = 0';
        }

        $tplStmt = $this->conn->prepare(
            "SELECT id, name, version, is_draft, is_active
             FROM checklist_templates
             WHERE template_group_id = ?
               AND CAST(SUBSTRING_INDEX(version, '.', 1) AS UNSIGNED) = ?
               {$whereDeleted}"
        );
        $tplStmt->execute([$groupId, $major]);
        $templates = $tplStmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($templates)) {
            return ['success' => false, 'error' => 'No templates found for that major'];
        }

        $templateIds = array_values(array_filter(array_map(function ($row) {
            return isset($row['id']) ? (int)$row['id'] : 0;
        }, $templates), function ($id) {
            return (int)$id > 0;
        }));

        if (empty($templateIds)) {
            return ['success' => false, 'error' => 'No valid template IDs found for that major'];
        }

        // Block if ANY instances exist for these templates.
        $placeholders = implode(',', array_fill(0, count($templateIds), '?'));
        $instanceStmt = $this->conn->prepare("SELECT COUNT(*) FROM checklist_instances WHERE template_id IN ({$placeholders})");
        $instanceStmt->execute($templateIds);
        $instanceCount = (int)$instanceStmt->fetchColumn();
        if ($instanceCount > 0) {
            return ['success' => false, 'error' => 'Cannot delete major version because one or more versions have checklist instances.', 'instance_count' => $instanceCount];
        }

        // Block if ANY submissions exist referencing items from these templates.
        $submissionStmt = $this->conn->prepare(
            "SELECT COUNT(*)
             FROM photo_submissions ps
             INNER JOIN checklist_items citm ON ps.item_id = citm.id
             WHERE citm.template_id IN ({$placeholders})"
        );
        $submissionStmt->execute($templateIds);
        $submissionCount = (int)$submissionStmt->fetchColumn();
        if ($submissionCount > 0) {
            return ['success' => false, 'error' => 'Cannot delete major version because photo submissions reference one or more of its items.', 'submission_count' => $submissionCount];
        }

        // Block if any templates outside this set reference these as a parent.
        $childOutsideStmt = $this->conn->prepare(
            "SELECT COUNT(*)
             FROM checklist_templates
             WHERE parent_template_id IN ({$placeholders})
               AND id NOT IN ({$placeholders})"
        );
        $childOutsideStmt->execute(array_merge($templateIds, $templateIds));
        $childOutsideCount = (int)$childOutsideStmt->fetchColumn();
        if ($childOutsideCount > 0) {
            return ['success' => false, 'error' => 'Cannot delete major version because other templates reference versions in this major as a parent.', 'child_outside_count' => $childOutsideCount];
        }

        // Best-effort doc control checks (if tables exist).
        try {
            $docRevStmt = $this->conn->prepare("SELECT COUNT(*) FROM document_revisions WHERE template_id IN ({$placeholders})");
            $docRevStmt->execute($templateIds);
            $docRevCount = (int)$docRevStmt->fetchColumn();
            if ($docRevCount > 0) {
                return ['success' => false, 'error' => 'Cannot delete major version because document control revisions reference one or more templates in this major.', 'document_revision_count' => $docRevCount];
            }
        } catch (Exception $e) {
            // ignore if document control not installed
        }

        try {
            $docCurrentStmt = $this->conn->prepare("SELECT COUNT(*) FROM document_control WHERE current_template_id IN ({$placeholders})");
            $docCurrentStmt->execute($templateIds);
            $docCurrentCount = (int)$docCurrentStmt->fetchColumn();
            if ($docCurrentCount > 0) {
                return ['success' => false, 'error' => 'Cannot delete major version because it contains a template that is currently active for a controlled document.', 'document_current_count' => $docCurrentCount];
            }
        } catch (Exception $e) {
            // ignore if document control not installed
        }

        $this->conn->beginTransaction();
        try {
            if ($this->hasChecklistTemplatesIsDeletedColumn()) {
                $updateSql = "UPDATE checklist_templates
                              SET is_active = 0,
                                  is_draft = 0,
                                  is_deleted = 1,
                                  updated_at = CURRENT_TIMESTAMP
                              WHERE id IN ({$placeholders})";
            } else {
                $updateSql = "UPDATE checklist_templates
                              SET is_active = 0,
                                  is_draft = 0,
                                  updated_at = CURRENT_TIMESTAMP
                              WHERE id IN ({$placeholders})";
            }

            $updateStmt = $this->conn->prepare($updateSql);
            $updateStmt->execute($templateIds);

            $auditStmt = $this->conn->prepare(
                "INSERT INTO checklist_audit_log (instance_id, action, user_id, details, ip_address, user_agent)
                 VALUES (NULL, 'template_major_deleted', NULL, ?, ?, ?)"
            );
            $auditStmt->execute([
                json_encode(['template_group_id' => $groupId, 'major' => $major, 'template_ids' => $templateIds, 'deleted_at' => date('Y-m-d H:i:s')]),
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);

            $this->conn->commit();
            return ['success' => true, 'message' => 'Major version deleted (soft)', 'template_ids' => $templateIds];
        } catch (Exception $e) {
            $this->conn->rollback();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Restore a soft-deleted template.
     * Admin-only caller responsibility is enforced at route/middleware level.
     */
    public function restoreTemplate($id) {
        $sql = "SELECT id, is_active, is_draft FROM checklist_templates WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$template) {
            return ['success' => false, 'error' => 'Template not found'];
        }

        if ((int)$template['is_active'] === 1) {
            return ['success' => true, 'message' => 'Template is already active', 'template_id' => (int)$id];
        }

        // Restore as active published template by default.
        if ($this->hasChecklistTemplatesIsDeletedColumn()) {
            $sql = "UPDATE checklist_templates
                    SET is_active = 1,
                        is_draft = 0,
                        is_deleted = 0,
                        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?";
        } else {
            $sql = "UPDATE checklist_templates
                    SET is_active = 1,
                        is_draft = 0,
                        published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?";
        }
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);

        return ['success' => true, 'message' => 'Template restored successfully', 'template_id' => (int)$id];
    }

    /**
     * Discard an existing draft template.
     * - Only draft templates can be discarded.
     * - Drafts linked to existing checklist instances are blocked for safety.
     */
    public function discardDraft($id) {
        $templateId = (int)$id;

        $sql = "SELECT id, name, is_draft, parent_template_id FROM checklist_templates WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$templateId]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$template) {
            return ['success' => false, 'error' => 'Template not found'];
        }

        if ((int)$template['is_draft'] !== 1) {
            return ['success' => false, 'error' => 'Only draft templates can be discarded'];
        }

        $instanceCountStmt = $this->conn->prepare("SELECT COUNT(*) FROM checklist_instances WHERE template_id = ?");
        $instanceCountStmt->execute([$templateId]);
        $instanceCount = (int)$instanceCountStmt->fetchColumn();

        if ($instanceCount > 0) {
            return [
                'success' => false,
                'error' => 'Cannot discard draft because it has existing checklist instances.',
                'instance_count' => $instanceCount
            ];
        }

        $this->conn->beginTransaction();
        try {
            $parentTemplateId = (int)($template['parent_template_id'] ?? 0);

            $deleteItemsStmt = $this->conn->prepare("DELETE FROM checklist_items WHERE template_id = ?");
            $deleteItemsStmt->execute([$templateId]);

            $deleteTemplateStmt = $this->conn->prepare("DELETE FROM checklist_templates WHERE id = ? AND is_draft = 1");
            $deleteTemplateStmt->execute([$templateId]);

            if ($parentTemplateId > 0) {
                $reactivateParentStmt = $this->conn->prepare(
                    "UPDATE checklist_templates
                     SET is_active = 1,
                         is_draft = 0,
                         published_at = COALESCE(published_at, CURRENT_TIMESTAMP),
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND is_draft = 0"
                );
                $reactivateParentStmt->execute([$parentTemplateId]);
            }

            $this->conn->commit();

            return [
                'success' => true,
                'template_id' => $templateId,
                'message' => 'Draft discarded successfully'
            ];
        } catch (Exception $e) {
            $this->conn->rollback();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ==============================================
    // Instance Management Methods
    // ==============================================

    public function getInstances() {
        $status = $_GET['status'] ?? '';
        $workOrder = $_GET['work_order'] ?? '';
        
        $sql = "SELECT ci.id, ci.template_id, ci.work_order_number, ci.part_number, ci.serial_number, 
                       ci.operator_id, ci.operator_name, ci.status, ci.progress_percentage,
                       ci.created_at, ci.updated_at, ci.started_at, ci.completed_at, ci.submitted_at,
                       ct.name as template_name, ct.category, ct.version as template_version,
                       u.image as operator_image,
                       COUNT(DISTINCT ps.id) as photo_count,
                       COUNT(DISTINCT CASE WHEN citm.is_required = 1 THEN citm.id END) as required_items,
                       COUNT(DISTINCT CASE WHEN ps.id IS NOT NULL AND citm.is_required = 1 THEN ps.id END) as completed_required
                FROM checklist_instances ci
                INNER JOIN checklist_templates ct ON ci.template_id = ct.id
                LEFT JOIN db.users u ON ci.operator_id = u.id
                LEFT JOIN checklist_items citm ON ct.id = citm.template_id
                LEFT JOIN photo_submissions ps ON ci.id = ps.instance_id AND citm.id = ps.item_id
                WHERE 1=1";
        
        $params = [];
        
        if ($status) {
            $sql .= " AND ci.status = ?";
            $params[] = $status;
        }
        
        if ($workOrder) {
            $sql .= " AND ci.work_order_number LIKE ?";
            $params[] = "%$workOrder%";
        }
        
        $sql .= " GROUP BY ci.id, ci.template_id, ci.work_order_number, ci.part_number, ci.serial_number, 
                           ci.operator_id, ci.operator_name, ci.status, ci.progress_percentage,
                           ci.created_at, ci.updated_at, ci.started_at, ci.completed_at, ci.submitted_at,
                           ct.name, ct.category, ct.version, u.image
                  ORDER BY ci.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function searchInstances() {
        $partNumber = $_GET['part_number'] ?? '';
        $serialNumber = $_GET['serial_number'] ?? '';
        $workOrder = $_GET['work_order'] ?? '';
        $templateName = $_GET['template_name'] ?? '';
        $dateFrom = $_GET['date_from'] ?? '';
        $dateTo = $_GET['date_to'] ?? '';
        $status = $_GET['status'] ?? '';
        $operator = $_GET['operator'] ?? '';
        
        $sql = "SELECT ci.id, ci.template_id, ci.work_order_number, ci.part_number, ci.serial_number, 
                       ci.operator_id, ci.operator_name, ci.status, ci.progress_percentage,
                       ci.created_at, ci.updated_at, ci.started_at, ci.completed_at, ci.submitted_at,
                       ct.name as template_name, ct.description as template_description,
                       ct.category as template_category, ct.version as template_version,
                       COUNT(DISTINCT ps.id) as photo_count,
                       COUNT(DISTINCT CASE WHEN citm.is_required = 1 THEN citm.id END) as required_items,
                       COUNT(DISTINCT CASE WHEN ps.id IS NOT NULL AND citm.is_required = 1 THEN ps.id END) as completed_required
                FROM checklist_instances ci
                INNER JOIN checklist_templates ct ON ci.template_id = ct.id
                LEFT JOIN checklist_items citm ON ct.id = citm.template_id
                LEFT JOIN photo_submissions ps ON ci.id = ps.instance_id AND citm.id = ps.item_id
                WHERE 1=1";
        
        $params = [];
        
        // Primary search criteria (at least one required)
        $hasRequiredCriteria = false;
        
        if ($partNumber) {
            $sql .= " AND ci.part_number LIKE ?";
            $params[] = "%$partNumber%";
            $hasRequiredCriteria = true;
        }
        
        if ($serialNumber) {
            $sql .= " AND ci.serial_number LIKE ?";
            $params[] = "%$serialNumber%";
            $hasRequiredCriteria = true;
        }
        
        if ($workOrder) {
            $sql .= " AND ci.work_order_number LIKE ?";
            $params[] = "%$workOrder%";
            $hasRequiredCriteria = true;
        }
        
        // If no required criteria provided, return empty result
        if (!$hasRequiredCriteria) {
            return ['error' => 'At least one search criteria (part_number, serial_number, or work_order) is required'];
        }
        
        // Additional filters
        if ($templateName) {
            $sql .= " AND ct.name LIKE ?";
            $params[] = "%$templateName%";
        }
        
        if ($status) {
            $sql .= " AND ci.status = ?";
            $params[] = $status;
        }
        
        if ($operator) {
            $sql .= " AND ci.operator_name LIKE ?";
            $params[] = "%$operator%";
        }
        
        if ($dateFrom) {
            $sql .= " AND DATE(ci.created_at) >= ?";
            $params[] = $dateFrom;
        }
        
        if ($dateTo) {
            $sql .= " AND DATE(ci.created_at) <= ?";
            $params[] = $dateTo;
        }
        
        $sql .= " GROUP BY ci.id, ci.template_id, ci.work_order_number, ci.part_number, ci.serial_number, 
                           ci.operator_id, ci.operator_name, ci.status, ci.progress_percentage,
                           ci.created_at, ci.updated_at, ci.started_at, ci.completed_at, ci.submitted_at,
                           ct.name, ct.description, ct.category, ct.version
                  ORDER BY ci.created_at DESC
                  LIMIT 100"; // Limit results for performance
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getInstance($id) {
        // Get instance details
        $sql = "SELECT ci.*, ct.name as template_name, ct.description as template_description, ct.version as template_version, ct.category as template_category
                FROM checklist_instances ci
                INNER JOIN checklist_templates ct ON ci.template_id = ct.id
                WHERE ci.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $instance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$instance) {
            return null;
        }
        
        // Get checklist items with photos - order hierarchically
        $sql = "SELECT citm.*, 
                   ps.id as photo_id, ps.file_name, ps.file_url, ps.file_type, ps.created_at as photo_created_at,
                   ps.photo_metadata,
                       ps.is_approved, ps.review_notes
                FROM checklist_items citm
                LEFT JOIN photo_submissions ps ON citm.id = ps.item_id AND ps.instance_id = ?
                WHERE citm.template_id = ?
                ORDER BY 
                    CASE 
                        WHEN citm.level = 0 OR citm.level IS NULL THEN citm.order_index 
                        ELSE citm.parent_id + 0.001 * citm.order_index 
                    END,
                    citm.level,
                    citm.order_index,
                    ps.created_at";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id, $instance['template_id']]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group photos by item
        $items = [];
        foreach ($results as $row) {
            $itemId = $row['id'];
            
            if (!isset($items[$itemId])) {
                // Parse photo_requirements if it's a JSON string
                $photoRequirements = $row['photo_requirements'];
                if (is_string($photoRequirements)) {
                    $photoRequirements = json_decode($photoRequirements, true) ?: [];
                }

                $links = $row['links'] ?? [];
                if (is_string($links)) {
                    $links = json_decode($links, true) ?: [];
                }
                
                $items[$itemId] = [
                    'id' => (int)$row['id'],
                    'template_id' => (int)$row['template_id'],
                    'order_index' => (int)$row['order_index'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'photo_requirements' => $photoRequirements,
                    'links' => $links,
                    'sample_image_url' => $row['sample_image_url'],
                    'is_required' => (bool)$row['is_required'],
                    'level' => isset($row['level']) ? (int)$row['level'] : 0,
                    'parent_id' => isset($row['parent_id']) ? (int)$row['parent_id'] : null,
                    'photos' => [],
                    'videos' => []  // Add videos array
                ];
            }
            
            // Add photo or video if exists
            if ($row['photo_id']) {
                $captureSource = null;
                $metadataRaw = $row['photo_metadata'] ?? null;
                if (is_string($metadataRaw) && trim($metadataRaw) !== '') {
                    $decoded = json_decode($metadataRaw, true);
                    if (is_array($decoded) && array_key_exists('capture_source', $decoded)) {
                        $captureSource = $this->normalizeCaptureSource($decoded['capture_source']);
                    }
                }

                $submission = [
                    'id' => $row['photo_id'],
                    'file_name' => $row['file_name'],
                    'file_url' => $row['file_url'],
                    'file_type' => $row['file_type'],
                    'created_at' => $row['photo_created_at'],
                    'capture_source' => $captureSource,
                    'is_approved' => $row['is_approved'],
                    'review_notes' => $row['review_notes']
                ];
                
                // Separate photos and videos based on file_type
                if ($row['file_type'] === 'video') {
                    $items[$itemId]['videos'][] = $submission;
                } else {
                    $items[$itemId]['photos'][] = $submission;
                }
            }
        }
        
        $instance['items'] = array_values($items);
        return $instance;
    }

    public function createInstance() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sql = "INSERT INTO checklist_instances (template_id, work_order_number, part_number, serial_number, operator_id, operator_name, status) 
                VALUES (?, ?, ?, ?, ?, ?, 'draft')";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $data['template_id'],
            $data['work_order_number'],
            $data['part_number'] ?? '',
            $data['serial_number'] ?? '',
            $data['operator_id'] ?? null,
            $data['operator_name'] ?? ''
        ]);
        
        $instanceId = $this->conn->lastInsertId();
        
        // Log creation
        $this->logAction($instanceId, 'created', $data['operator_id'] ?? null, [
            'work_order' => $data['work_order_number'],
            'template_id' => $data['template_id']
        ]);
        
        return ['success' => true, 'instance_id' => $instanceId];
    }

    public function updateInstance($id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $updateFields = [];
        $params = [];
        
        // Build dynamic update query based on provided fields
        $allowedFields = ['status', 'operator_id', 'operator_name', 'part_number', 'serial_number', 'progress_percentage', 'item_completion'];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $updateFields[] = "$field = ?";
                if ($field === 'item_completion') {
                    if ($data[$field] === null) {
                        $params[] = null;
                    } else if (is_string($data[$field])) {
                        // Validate JSON string
                        $decoded = json_decode($data[$field], true);
                        if (json_last_error() !== JSON_ERROR_NONE) {
                            return ['success' => false, 'error' => 'Invalid item_completion JSON'];
                        }
                        $params[] = json_encode($decoded);
                    } else {
                        // Encode arrays/objects
                        $params[] = json_encode($data[$field]);
                    }
                } else {
                    $params[] = $data[$field];
                }
            }
        }
        
        if (empty($updateFields)) {
            return ['success' => false, 'error' => 'No valid fields to update'];
        }
        
        // Add timestamp fields based on status
        if (isset($data['status'])) {
            switch ($data['status']) {
                case 'in_progress':
                    if (!isset($data['started_at'])) {
                        $updateFields[] = "started_at = CURRENT_TIMESTAMP";
                    }
                    break;
                case 'completed':
                    $updateFields[] = "completed_at = CURRENT_TIMESTAMP";
                    break;
                case 'submitted':
                    $updateFields[] = "submitted_at = CURRENT_TIMESTAMP";
                    break;
            }
        }
        
        $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
        $params[] = $id;
        
        $sql = "UPDATE checklist_instances SET " . implode(', ', $updateFields) . " WHERE id = ?";
        
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            
            // Only recalculate progress if progress_percentage was NOT explicitly provided by frontend
            // If frontend sent progress_percentage, trust that value (includes verified items without photos)
            if (isset($data['status']) && !array_key_exists('progress_percentage', $data)) {
                $this->updateInstanceProgress($id);
                
                // Log status change
                $this->logAction($id, 'status_changed', $data['operator_id'] ?? null, [
                    'new_status' => $data['status'],
                    'updated_fields' => array_keys($data)
                ]);
            }
            
            return ['success' => true, 'instance_id' => $id];
            
        } catch (Exception $e) {
            throw $e;
        }
    }

    public function deleteInstance($id) {
        $instanceId = (int)$id;
        if ($instanceId <= 0) {
            return ['success' => false, 'error' => 'Invalid instance id'];
        }

        // Check current status
        $stmt = $this->conn->prepare('SELECT id, status FROM checklist_instances WHERE id = ?');
        $stmt->execute([$instanceId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['success' => false, 'error' => 'Instance not found'];
        }

        $status = $row['status'] ?? '';
        if ($status === 'completed' || $status === 'submitted') {
            return ['success' => false, 'error' => 'Cannot delete a completed/submitted inspection'];
        }

        try {
            $this->conn->beginTransaction();

            // Delete files for all submissions in this instance
            $stmt = $this->conn->prepare('SELECT id, file_path FROM photo_submissions WHERE instance_id = ?');
            $stmt->execute([$instanceId]);
            $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($subs as $sub) {
                $path = $sub['file_path'] ?? null;
                if ($path && file_exists($path)) {
                    @unlink($path);
                }
            }

            // Remove submissions
            $stmt = $this->conn->prepare('DELETE FROM photo_submissions WHERE instance_id = ?');
            $stmt->execute([$instanceId]);

            // Remove audit log
            $stmt = $this->conn->prepare('DELETE FROM checklist_audit_log WHERE instance_id = ?');
            $stmt->execute([$instanceId]);

            // Remove instance
            $stmt = $this->conn->prepare('DELETE FROM checklist_instances WHERE id = ?');
            $stmt->execute([$instanceId]);

            $this->conn->commit();
            return ['success' => true, 'message' => 'Inspection deleted'];
        } catch (Exception $e) {
            try {
                $this->conn->rollBack();
            } catch (Exception $e2) {
                // ignore
            }
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    // ==============================================
    // Photo Management Methods
    // ==============================================

    public function uploadPhoto() {
        $instanceId = $_POST['instance_id'] ?? null;
        $itemId = $_POST['item_id'] ?? null;
        $uploadedFile = $_FILES['photo'] ?? null;
        $userId = $_POST['user_id'] ?? null;
        $captureSource = $this->normalizeCaptureSource($_POST['capture_source'] ?? null);
        
        if (!$instanceId || !$itemId || !$uploadedFile) {
            throw new Exception('Missing required parameters');
        }
        
        // Validate that item belongs to this instance's template
        if (!$this->validateItemBelongsToInstance($itemId, $instanceId)) {
            throw new Exception('Invalid item ID or item does not belong to this instance template');
        }
        
        // Validate file
        $config = $this->getConfigValues();
        
        // Determine if this is a video or photo based on MIME type
        $isVideo = strpos($uploadedFile['type'], 'video') !== false;
        
        // Debug logging
        error_log("Upload file type: " . $uploadedFile['type']);
        error_log("Is video: " . ($isVideo ? 'YES' : 'NO'));
        error_log("Config values: " . json_encode($config));
        
        // Use appropriate size limit based on file type
        $maxSizeConfig = $isVideo ? 'max_video_size_mb' : 'max_photo_size_mb';
        $maxSize = ($config[$maxSizeConfig] ?? ($isVideo ? 50 : 10)) * 1024 * 1024;

        // Config switch: disable media size validation by default.
        // When true, uploads are allowed regardless of configured max size.
        // Set disable_media_size_validation = false in checklist_config to enforce limits.
        $disableMediaSizeValidation = true;
        if (array_key_exists('disable_media_size_validation', $config)) {
            $rawDisable = $config['disable_media_size_validation'];
            if (is_bool($rawDisable)) {
                $disableMediaSizeValidation = $rawDisable;
            } else {
                $disableMediaSizeValidation = in_array(strtolower((string)$rawDisable), ['1', 'true', 'yes', 'on'], true);
            }
        }
        
        error_log("Max size config key: " . $maxSizeConfig);
        error_log("Max size from config: " . ($config[$maxSizeConfig] ?? 'NOT FOUND'));
        error_log("Max size used: " . ($maxSize / 1024 / 1024) . "MB");
        
        if (!$disableMediaSizeValidation && $uploadedFile['size'] > $maxSize) {
            $actualSizeMB = round($uploadedFile['size'] / 1024 / 1024, 2);
            $maxSizeMB = $config[$maxSizeConfig] ?? ($isVideo ? 50 : 10);
            $fileType = $isVideo ? 'Video' : 'Photo';
            throw new Exception("{$fileType} size ({$actualSizeMB}MB) exceeds maximum allowed size ({$maxSizeMB}MB)");
        }
        

        // Get allowed types based on file type - they're already decoded as array by getConfigValues()
        $allowedTypesConfig = $isVideo ? 'allowed_video_types' : 'allowed_photo_types';
        $allowedTypes = $config[$allowedTypesConfig] ?? ($isVideo ? ['video/mp4', 'video/webm'] : ['image/jpeg', 'image/png']);
        
        error_log("Allowed types config key: " . $allowedTypesConfig);
        error_log("Allowed types from config: " . json_encode($config[$allowedTypesConfig] ?? 'NOT FOUND'));
        error_log("Allowed types used: " . json_encode($allowedTypes));
        error_log("Uploaded file MIME type: " . $uploadedFile['type']);
        error_log("Is MIME type allowed? " . (in_array($uploadedFile['type'], $allowedTypes) ? 'YES' : 'NO'));
        
        if (!in_array($uploadedFile['type'], $allowedTypes)) {
            $fileType = $isVideo ? 'Video' : 'Photo';
            throw new Exception("{$fileType} type '{$uploadedFile['type']}' not allowed. Allowed types: " . implode(', ', $allowedTypes));
        }
        
        // Generate unique filename
        $extension = pathinfo($uploadedFile['name'], PATHINFO_EXTENSION);
        $fileName = 'submission_' . $instanceId . '_' . $itemId . '_' . time() . '.' . $extension;
        $uploadPath = '../../../attachments/photo-submissions/' . $fileName;
        
        // Create directory if it doesn't exist
        if (!file_exists('../../../attachments/photo-submissions/')) {
            mkdir('../../../attachments/photo-submissions/', 0755, true);
        }
        
        if (move_uploaded_file($uploadedFile['tmp_name'], $uploadPath)) {
            // Build photo_metadata, including capture source
            $photoMetadata = json_encode([
                'capture_source' => $captureSource
            ]);

            // Save to database
            $sql = "INSERT INTO photo_submissions (instance_id, item_id, file_name, file_path, file_url, file_type, file_size, mime_type, photo_metadata) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    file_name = VALUES(file_name), 
                    file_path = VALUES(file_path),
                    file_url = VALUES(file_url),
                    photo_metadata = VALUES(photo_metadata),
                    updated_at = CURRENT_TIMESTAMP";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $instanceId,
                $itemId,
                $fileName,
                $uploadPath,
                '/attachments/photo-submissions/' . $fileName,
                strpos($uploadedFile['type'], 'video') !== false ? 'video' : 'image',
                $uploadedFile['size'],
                $uploadedFile['type'],
                $photoMetadata
            ]);
            
            // Update instance progress
            $this->updateInstanceProgress($instanceId);
            
            // Log action
            $this->logAction($instanceId, 'photo_added', $userId, [
                'item_id' => $itemId,
                'file_name' => $fileName,
                'mime_type' => $uploadedFile['type'] ?? null,
                'file_type' => strpos($uploadedFile['type'], 'video') !== false ? 'video' : 'image',
                'capture_source' => $captureSource
            ]);
            
            return ['success' => true, 'file_url' => '/attachments/photo-submissions/' . $fileName];
        } else {
            throw new Exception('Failed to upload file');
        }
    }

    private function normalizeCaptureSource($rawSource): ?string {
        if ($rawSource === null) {
            return null;
        }

        $source = strtolower(trim((string)$rawSource));
        if ($source === '') {
            return null;
        }

        if ($source === 'in-app' || $source === 'in_app' || $source === 'inapp') {
            return 'in-app';
        }

        if ($source === 'library' || $source === 'gallery' || $source === 'upload' || $source === 'file') {
            return 'library';
        }

        if ($source === 'system' || $source === 'camera' || $source === 'native-camera' || $source === 'device-camera') {
            return 'system';
        }

        return null;
    }

    public function deletePhoto($photoId) {
        // Get photo details first
        $sql = "SELECT * FROM photo_submissions WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$photoId]);
        $photo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$photo) {
            return ['success' => false, 'error' => 'Photo not found'];
        }
        
        try {
            // Delete file from filesystem
            if ($photo['file_path'] && file_exists($photo['file_path'])) {
                unlink($photo['file_path']);
            }
            
            // Delete from database
            $sql = "DELETE FROM photo_submissions WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$photoId]);
            
            // Update instance progress
            $this->updateInstanceProgress($photo['instance_id']);
            
            // Log action
            $this->logAction($photo['instance_id'], 'photo_deleted', null, [
                'photo_id' => $photoId,
                'item_id' => $photo['item_id'],
                'file_name' => $photo['file_name']
            ]);
            
            return ['success' => true, 'message' => 'Photo deleted successfully'];
            
        } catch (Exception $e) {
            throw $e;
        }
    }

    // ==============================================
    // Configuration Management Methods
    // ==============================================

    public function getConfig() {
        $sql = "SELECT config_key, config_value, description, config_type FROM checklist_config ORDER BY config_key";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getConfigValues() {
        $sql = "SELECT config_key, config_value, config_type FROM checklist_config";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $config = [];
        foreach ($rows as $row) {
            $value = $row['config_value'];
            
            switch ($row['config_type']) {
                case 'number':
                    $value = (float) $value;
                    break;
                case 'boolean':
                    $value = $value === 'true' || $value === '1';
                    break;
                case 'json':
                    $value = json_decode($value, true);
                    break;
            }
            
            $config[$row['config_key']] = $value;
        }
        
        return $config;
    }

    public function updateConfig() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data)) {
            return ['success' => false, 'error' => 'No configuration data provided'];
        }
        
        $this->conn->beginTransaction();
        
        try {
            foreach ($data as $key => $value) {
                // Validate that the config key exists
                $sql = "SELECT config_type FROM checklist_config WHERE config_key = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$key]);
                $configItem = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$configItem) {
                    // Skip unknown config keys
                    continue;
                }
                
                // Convert value based on type
                $configValue = $value;
                switch ($configItem['config_type']) {
                    case 'boolean':
                        $configValue = $value ? 'true' : 'false';
                        break;
                    case 'json':
                        $configValue = json_encode($value);
                        break;
                    default:
                        $configValue = (string) $value;
                }
                
                // Update the configuration
                $sql = "UPDATE checklist_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$configValue, $key]);
            }
            
            $this->conn->commit();
            
            // Log configuration change
            $sql = "INSERT INTO checklist_audit_log (instance_id, action, user_id, details, ip_address, user_agent) 
                    VALUES (NULL, 'config_updated', NULL, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                json_encode(['updated_keys' => array_keys($data), 'timestamp' => date('Y-m-d H:i:s')]),
                $_SERVER['REMOTE_ADDR'] ?? '',
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
            
            return ['success' => true, 'message' => 'Configuration updated successfully'];
            
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    // ==============================================
    // Helper Methods
    // ==============================================

    private function validateItemBelongsToInstance($itemId, $instanceId) {
        $sql = "SELECT ci.template_id, cit.id 
                FROM checklist_instances ci
                INNER JOIN checklist_items cit ON ci.template_id = cit.template_id
                WHERE ci.id = ? AND cit.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$instanceId, $itemId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result !== false;
    }

    private function updateInstanceProgress($instanceId) {
        $sql = "UPDATE checklist_instances ci
                SET progress_percentage = (
                    SELECT CASE 
                        WHEN COUNT(citm.id) = 0 THEN 0
                        ELSE ROUND(
                            (COUNT(CASE WHEN ps.id IS NOT NULL THEN 1 END) * 100.0) / COUNT(citm.id), 2
                        )
                    END
                    FROM checklist_items citm
                    LEFT JOIN photo_submissions ps ON citm.id = ps.item_id AND ps.instance_id = ?
                    WHERE citm.template_id = ci.template_id
                )
                WHERE ci.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$instanceId, $instanceId]);
    }

    private function logAction($instanceId, $action, $userId = null, $details = []) {
        $sql = "INSERT INTO checklist_audit_log (instance_id, action, user_id, details, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $instanceId,
            $action,
            $userId,
            json_encode($details),
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    }

    // ==============================================
    // Legacy Compatibility Methods
    // ==============================================

    public function legacyRead() {
        $woNumber = $_GET['woNumber'] ?? '';
        $partNumber = $_GET['partNumber'] ?? '';
        $serialNumber = $_GET['serialNumber'] ?? '';
        
        if (isset($_GET['getOpenChecklists'])) {
            return $this->getInstances();
        }
        
        if ($woNumber && $partNumber) {
            // Try to find existing instance
            $sql = "SELECT ci.id FROM checklist_instances ci
                    INNER JOIN checklist_templates ct ON ci.template_id = ct.id
                    WHERE ci.work_order_number = ? AND (ct.part_number = ? OR ct.part_number = 'GENERIC')
                    ORDER BY ct.part_number = ? DESC, ci.created_at DESC
                    LIMIT 1";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$woNumber, $partNumber, $partNumber]);
            $instance = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($instance) {
                return $this->getInstance($instance['id']);
            } else {
                // Create new instance from template
                $sql = "SELECT id FROM checklist_templates 
                        WHERE (part_number = ? OR part_number = 'GENERIC') AND is_active = 1
                        ORDER BY part_number = ? DESC
                        LIMIT 1";
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$partNumber, $partNumber]);
                $template = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($template) {
                    // Create new instance directly with SQL since createInstance() expects JSON input
                    $sql = "INSERT INTO checklist_instances (template_id, work_order_number, part_number, serial_number, status) 
                            VALUES (?, ?, ?, ?, 'draft')";
                    
                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        $template['id'],
                        $woNumber,
                        $partNumber,
                        $serialNumber
                    ]);
                    
                    $instanceId = $this->conn->lastInsertId();
                    
                    // Log creation
                    $this->logAction($instanceId, 'created', null, [
                        'work_order' => $woNumber,
                        'template_id' => $template['id'],
                        'source' => 'legacy_read'
                    ]);
                    
                    return $this->getInstance($instanceId);
                }
            }
        }
        
        return [];
    }

    public function legacySave() {
        // Handle legacy photo save requests
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            return ['success' => false, 'error' => 'No data provided'];
        }
        
        try {
            // This method provides compatibility with the old save endpoint
            // You can extend this based on the specific legacy save format you need to support
            
            if (isset($data['instance_id']) && isset($data['item_id']) && isset($data['photo_url'])) {
                // Validate that item belongs to this instance's template
                if (!$this->validateItemBelongsToInstance($data['item_id'], $data['instance_id'])) {
                    throw new Exception('Invalid item ID or item does not belong to this instance template');
                }
                
                // Handle photo submission via JSON (if needed)
                $sql = "INSERT INTO photo_submissions (instance_id, item_id, file_url, file_type, created_at) 
                        VALUES (?, ?, ?, 'image', CURRENT_TIMESTAMP)
                        ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), updated_at = CURRENT_TIMESTAMP";
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    $data['instance_id'],
                    $data['item_id'],
                    $data['photo_url']
                ]);
                
                $this->updateInstanceProgress($data['instance_id']);
                
                return ['success' => true, 'message' => 'Photo saved successfully'];
            }
            
            // Handle other legacy save operations as needed
            return ['success' => false, 'error' => 'Unsupported legacy save operation'];
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Move a temporary image file to permanent storage
     * @param string $tempUrl - Full URL to the temp image
     * @return string - New permanent URL
     */
    private function moveTempImageToPermanent($tempUrl) {
        $debugEntry = ['original_url' => $tempUrl];
        
        try {
            error_log("🔄 moveTempImageToPermanent called with: $tempUrl");
            
            // Extract the filename from the temp URL
            // Example: https://dashboard.eye-fi.com/attachments/photoChecklist/temp/temp_item-0-ref-1763481030603_691c95c69aaad.png
            $urlPath = parse_url($tempUrl, PHP_URL_PATH);
            $filename = basename($urlPath);
            
            $debugEntry['filename'] = $filename;
            
            // Define paths
            $tempDir = __DIR__ . '/../../../attachments/photoChecklist/temp/';
            $permanentDir = __DIR__ . '/../../../attachments/photoChecklist/';

            // Ensure permanent directory exists
            if (!is_dir($permanentDir)) {
                @mkdir($permanentDir, 0755, true);
            }
            
            $tempFilePath = $tempDir . $filename;
            
            $debugEntry['temp_path'] = $tempFilePath;
            $debugEntry['temp_file_exists'] = file_exists($tempFilePath);
            
            // Remove 'temp_' prefix from filename for permanent storage
            $permanentFilename = preg_replace('/^temp_/', '', $filename);
            $permanentFilePath = $permanentDir . $permanentFilename;
            
            $debugEntry['permanent_path'] = $permanentFilePath;
            
            // Check if temp file exists
            if (file_exists($tempFilePath)) {
                
                // Move the file
                if (rename($tempFilePath, $permanentFilePath)) {
                    // Return the new permanent URL
                    $permanentUrl = str_replace('/temp/temp_', '/', $tempUrl);
                    $debugEntry['status'] = 'success';
                    $debugEntry['new_url'] = $permanentUrl;
                    $this->debugLog[] = $debugEntry;
                    return $permanentUrl;
                } else {
                    // Fallback: copy+unlink for cross-device or permission issues
                    if (@copy($tempFilePath, $permanentFilePath)) {
                        @unlink($tempFilePath);
                        $permanentUrl = str_replace('/temp/temp_', '/', $tempUrl);
                        $debugEntry['status'] = 'copied_then_deleted';
                        $debugEntry['new_url'] = $permanentUrl;
                        $this->debugLog[] = $debugEntry;
                        return $permanentUrl;
                    }

                    $debugEntry['status'] = 'failed_to_move';
                    $debugEntry['error'] = error_get_last()['message'] ?? 'Unknown error';
                    $this->debugLog[] = $debugEntry;
                    return $tempUrl; // Return original if move fails
                }
            } else {
                // File doesn't exist in temp - might already be permanent or doesn't exist
                
                // Check if file already exists in permanent location
                if (file_exists($permanentFilePath)) {
                    $permanentUrl = str_replace('/temp/temp_', '/', $tempUrl);
                    $debugEntry['status'] = 'already_permanent';
                    $debugEntry['new_url'] = $permanentUrl;
                    $this->debugLog[] = $debugEntry;
                    return $permanentUrl;
                }
                
                $debugEntry['status'] = 'temp_file_not_found';
                $this->debugLog[] = $debugEntry;
                return $tempUrl; // Return original URL
            }
        } catch (Exception $e) {
            $debugEntry['status'] = 'exception';
            $debugEntry['error'] = $e->getMessage();
            $this->debugLog[] = $debugEntry;
            return $tempUrl; // Return original URL on error
        }
    }

    // ==============================================
    // Version History & Change Tracking Methods
    // ==============================================

    /**
     * Get version history for a template group or specific template
     */
    public function getTemplateHistory($groupId = null, $templateId = null) {
        $tracker = new TemplateChangeTracker($this->conn);
        
        if ($groupId) {
            return $tracker->getChangeHistory($groupId);
        } elseif ($templateId) {
            return $tracker->getVersionChanges($templateId);
        }
        
        return ['error' => 'Either group_id or template_id is required'];
    }

    /**
     * Compare two templates and show differences
     */
    public function compareTemplates($sourceId, $targetId) {
        $tracker = new TemplateChangeTracker($this->conn);
        
        $sourceTemplate = $this->getTemplate($sourceId);
        $targetTemplate = $this->getTemplate($targetId);
        
        if (!$sourceTemplate || !$targetTemplate) {
            return ['error' => 'One or both templates not found'];
        }
        
        $changes = $tracker->detectChanges($sourceTemplate, $targetTemplate);
        $summary = $tracker->generateSummary($changes);
        
        return [
            'source' => [
                'id' => $sourceId,
                'name' => $sourceTemplate['name'],
                'version' => $sourceTemplate['version']
            ],
            'target' => [
                'id' => $targetId,
                'name' => $targetTemplate['name'],
                'version' => $targetTemplate['version']
            ],
            'changes' => $changes,
            'summary' => $summary
        ];
    }

    /**
     * We need to set the sample media 
     * Save sample media for an item to the new table
     * Merges sample_images and sample_videos arrays from frontend
     * 
     * @param int $itemId The database ID of the checklist item
     * @param array $item The item data from frontend containing sample_images and sample_videos
     */
    private function saveSampleMediaForItem($itemId, $item, $processedSampleImages = null, $processedSampleVideos = null) {
        // Combine sample_images and sample_videos into single array for the service
        $allMedia = [];

        // Add images
        $imagesToSave = $processedSampleImages;
        if ($imagesToSave === null) {
            $imagesToSave = (!empty($item['sample_images']) && is_array($item['sample_images'])) ? $item['sample_images'] : [];
        }

        if (!empty($imagesToSave)) {
            foreach ($imagesToSave as $img) {
                $allMedia[] = array_merge($img, ['media_type' => 'image']);
            }
        }

        // Add videos
        $videosToSave = $processedSampleVideos;
        if ($videosToSave === null) {
            $videosToSave = (!empty($item['sample_videos']) && is_array($item['sample_videos'])) ? $item['sample_videos'] : [];
        }

        if (!empty($videosToSave)) {
            foreach ($videosToSave as $vid) {
                $allMedia[] = array_merge($vid, ['media_type' => 'video']);
            }
        }

        // Save to database using the service
        if (!empty($allMedia)) {
            $this->mediaService->saveMediaForItem($itemId, $allMedia);
            error_log("      💾 Saved " . count($allMedia) . " media items to new table for item $itemId");
        }
    }

    /**
     * Generate and download a checklist instance as JSON for PDF generation on frontend
     * Returns all data needed to render a printable inspection report
     */
    public function downloadInstancePDF($instanceId) {
        header('Content-Type: application/json');

        // Fetch the instance with all required data
        $instance = $this->getInstance($instanceId);
        if (!$instance || isset($instance['error'])) {
            http_response_code(404);
            echo json_encode(['error' => 'Checklist instance not found']);
            return;
        }

        // Fetch the template
        $template = null;
        if (!empty($instance['template_id'])) {
            $template = $this->getTemplate($instance['template_id']);
        }

        // Prepare the PDF data package
        $pdfData = [
            'instance' => $instance,
            'template' => $template,
            'generated_at' => date('c'),
            'base_url' => $this->getBaseUrl()
        ];

        // Return JSON data for frontend PDF generation
        echo json_encode($pdfData);
    }

    /**
     * Helper to get base URL for image paths
     */
    private function getBaseUrl() {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return $protocol . $host;
    }
}

// Initialize and handle request
$api = new PhotoChecklistConfigAPI($db);
$api->handleRequest();
?>
