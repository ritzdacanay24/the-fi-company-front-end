<?php
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

/**
 * Photo Checklist Configuration API
 * Manages templates, instances, and configuration settings
 */
class PhotoChecklistConfigAPI {
    private $conn;
    private $database;

    public function __construct() {
	$db_connect = new DatabaseEyefi();
	$this->conn = $db_connect->getConnection();
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
                        echo json_encode($this->getTemplates());
                    } elseif ($method === 'POST') {
                        echo json_encode($this->createTemplate());
                    }
                    break;

                case 'template':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'GET' && $id) {
                        echo json_encode($this->getTemplate($id));
                    } elseif ($method === 'PUT' && $id) {
                        echo json_encode($this->updateTemplate($id));
                    } elseif ($method === 'DELETE' && $id) {
                        echo json_encode($this->deleteTemplate($id));
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

                case 'instance':
                    $id = $_GET['id'] ?? null;
                    if ($method === 'GET' && $id) {
                        echo json_encode($this->getInstance($id));
                    } elseif ($method === 'PUT' && $id) {
                        echo json_encode($this->updateInstance($id));
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

    public function getTemplates() {
        $sql = "SELECT ct.*, 
                       COUNT(ci.id) as active_instances,
                       COUNT(cit.id) as item_count,
                       (SELECT COUNT(*) FROM checklist_templates ct2 
                        WHERE ct2.template_group_id = ct.template_group_id 
                        AND ct2.is_active = 1) as version_count
                FROM checklist_templates ct
                LEFT JOIN checklist_instances ci ON ct.id = ci.template_id AND ci.status != 'completed'
                LEFT JOIN checklist_items cit ON ct.id = cit.template_id
                WHERE ct.is_active = 1
                GROUP BY ct.id
                ORDER BY ct.template_group_id, ct.version DESC, ct.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTemplate($id) {
        // Get template basic info
        $sql = "SELECT * FROM checklist_templates WHERE id = ? AND is_active = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$template) {
            return null;
        }
        
        // Get items separately - order by level first (parents before children), then order_index
        // This ensures parent items appear before their sub-items
        $sql = "SELECT id, template_id, order_index, parent_id, level, title, description, 
                       photo_requirements, sample_image_url, is_required, created_at, updated_at
                FROM checklist_items 
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
        
        // Parse photo_requirements JSON for each item
        foreach ($items as &$item) {
            if ($item['photo_requirements']) {
                $item['photo_requirements'] = json_decode($item['photo_requirements'], true);
            } else {
                $item['photo_requirements'] = [];
            }
            
            // Convert is_required to boolean
            $item['is_required'] = (bool)$item['is_required'];
            
            // Convert numeric fields
            $item['order_index'] = (float)$item['order_index'];
            $item['level'] = (int)$item['level'];
            $item['parent_id'] = $item['parent_id'] ? (int)$item['parent_id'] : null;
        }
        
        $template['items'] = $items;
        
        error_log("getTemplate($id) returning " . count($items) . " items");
        
        return $template;
    }

    public function createTemplate() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Debug logging
        error_log("createTemplate called with data: " . json_encode($data));
        error_log("Items count: " . (isset($data['items']) ? count($data['items']) : 0));
        error_log("source_template_id: " . (isset($data['source_template_id']) ? $data['source_template_id'] : 'NOT SET'));
        
        // Check if items exist and are not empty
        if (!isset($data['items']) || !is_array($data['items']) || empty($data['items'])) {
            error_log("WARNING: No items received or items array is empty!");
            error_log("Data received: " . print_r($data, true));
        }
        
        $this->conn->beginTransaction();
        
        try {
            // Determine template_group_id and parent_template_id
            // If source_template_id is provided, copy its template_group_id and set parent_template_id (creating a new version)
            // Otherwise, use a temporary value (0) and update it to the new template's ID after insertion
            $templateGroupId = 0; // Temporary placeholder for new templates
            $parentTemplateId = null;
            $isNewTemplateFamily = true;
            
            if (isset($data['source_template_id']) && $data['source_template_id']) {
                // Get the parent template's group ID
                $sql = "SELECT template_group_id FROM checklist_templates WHERE id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$data['source_template_id']]);
                $parentTemplate = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($parentTemplate) {
                    $templateGroupId = $parentTemplate['template_group_id'];
                    $parentTemplateId = $data['source_template_id']; // Track the direct parent
                    $isNewTemplateFamily = false;
                    error_log("Creating new version - parent_template_id: " . $parentTemplateId . ", template_group_id: " . $templateGroupId);
                }
            }
            
            // Insert template (including version, template_group_id, and parent_template_id)
            $sql = "INSERT INTO checklist_templates (name, description, part_number, product_type, category, version, template_group_id, parent_template_id, is_active, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $data['name'],
                $data['description'] ?? '',
                $data['part_number'] ?? '',
                $data['product_type'] ?? '',
                $data['category'] ?? 'quality_control',
                $data['version'] ?? '1.0',
                $templateGroupId, // Will be 0 for new templates, updated below
                $parentTemplateId, // Will be NULL for first version, set to parent ID for new versions
                isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : 1,
                $data['created_by'] ?? null
            ]);
            
            $templateId = $this->conn->lastInsertId();
            error_log("Template created with ID: " . $templateId . " with version: " . ($data['version'] ?? '1.0'));
            error_log("Inserted with: template_group_id=" . $templateGroupId . ", parent_template_id=" . ($parentTemplateId ?? 'NULL'));
            
            // If this is a new template (not a version), set template_group_id to its own ID
            if ($isNewTemplateFamily) {
                $sql = "UPDATE checklist_templates SET template_group_id = ? WHERE id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$templateId, $templateId]);
                error_log("New template family - set template_group_id to self: " . $templateId . ", parent_template_id: NULL (first version)");
            } else {
                error_log("New version of existing template - template_group_id: " . $templateGroupId . ", parent_template_id: " . $parentTemplateId);
            }
            
            // Verify what was actually saved
            $verifyTemplateStmt = $this->conn->prepare("SELECT template_group_id, parent_template_id FROM checklist_templates WHERE id = ?");
            $verifyTemplateStmt->execute([$templateId]);
            $savedTemplate = $verifyTemplateStmt->fetch(PDO::FETCH_ASSOC);
            error_log("Verified saved values: template_group_id=" . $savedTemplate['template_group_id'] . ", parent_template_id=" . ($savedTemplate['parent_template_id'] ?? 'NULL'));
            
            // Insert items
            if (!empty($data['items'])) {
                error_log("Inserting " . count($data['items']) . " items");
                foreach ($data['items'] as $index => $item) {
                    error_log("Processing item $index: " . json_encode($item));
                    $sql = "INSERT INTO checklist_items (template_id, order_index, title, description, photo_requirements, sample_image_url, is_required, level, parent_id) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        $templateId,
                        $item['order_index'] ?? ($index + 1),
                        $item['title'] ?? '',
                        $item['description'] ?? '',
                        json_encode($item['photo_requirements'] ?? []),
                        $item['sample_image_url'] ?? null,
                        isset($item['is_required']) ? ($item['is_required'] ? 1 : 0) : 1,
                        $item['level'] ?? 0,
                        $item['parent_id'] ?? null
                    ]);
                    error_log("Item $index inserted successfully");
                }
            } else {
                error_log("WARNING: No items to insert!");
            }
            
            $this->conn->commit();
            error_log("Transaction committed successfully");
            
            // Verify items were actually inserted
            $verifyStmt = $this->conn->prepare("SELECT COUNT(*) as count FROM checklist_items WHERE template_id = ?");
            $verifyStmt->execute([$templateId]);
            $itemCount = $verifyStmt->fetch(PDO::FETCH_ASSOC)['count'];
            error_log("Items in database after commit: " . $itemCount);
            
            // Return success with debug info
            return [
                'success' => true, 
                'template_id' => $templateId,
                'debug' => [
                    'items_received' => isset($data['items']) ? count($data['items']) : 0,
                    'items_in_database' => (int)$itemCount,
                    'items_array_exists' => isset($data['items']),
                    'items_is_array' => isset($data['items']) && is_array($data['items']),
                    'items_empty' => isset($data['items']) && empty($data['items'])
                ]
            ];
            
        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("ERROR in createTemplate: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            throw $e;
        }
    }

    public function updateTemplate($id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $this->conn->beginTransaction();
        
        try {
            // Update template (preserving template_group_id - it should not change on updates)
            $sql = "UPDATE checklist_templates 
                    SET name = ?, description = ?, part_number = ?, product_type = ?, category = ?, version = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND is_active = 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $data['name'],
                $data['description'] ?? '',
                $data['part_number'] ?? '',
                $data['product_type'] ?? '',
                $data['category'] ?? 'quality_control',
                $data['version'] ?? '1.0',
                $id
            ]);
            
            error_log("Template $id updated - template_group_id preserved");
            
            // Delete existing items
            $sql = "DELETE FROM checklist_items WHERE template_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$id]);
            
            // Insert updated items
            if (!empty($data['items'])) {
                foreach ($data['items'] as $index => $item) {
                    $sql = "INSERT INTO checklist_items (template_id, order_index, title, description, photo_requirements, sample_image_url, is_required, level, parent_id) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([
                        $id,
                        $item['order_index'] ?? ($index + 1),
                        $item['title'] ?? '',
                        $item['description'] ?? '',
                        json_encode($item['photo_requirements'] ?? []),
                        $item['sample_image_url'] ?? null,
                        isset($item['is_required']) ? ($item['is_required'] ? 1 : 0) : 1,
                        $item['level'] ?? 0,
                        $item['parent_id'] ?? null
                    ]);
                }
            }
            
            $this->conn->commit();
            return ['success' => true, 'template_id' => $id];
            
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function deleteTemplate($id) {
        // Check if template has active instances
        $sql = "SELECT COUNT(*) as active_count FROM checklist_instances 
                WHERE template_id = ? AND status NOT IN ('completed', 'submitted')";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['active_count'] > 0) {
            return [
                'success' => false, 
                'error' => 'Cannot delete template with active instances. Complete or archive instances first.',
                'active_instances' => $result['active_count']
            ];
        }
        
        $this->conn->beginTransaction();
        
        try {
            // Soft delete - mark as inactive instead of hard delete to preserve audit trail
            $sql = "UPDATE checklist_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
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

    // ==============================================
    // Instance Management Methods
    // ==============================================

    public function getInstances() {
        $status = $_GET['status'] ?? '';
        $workOrder = $_GET['work_order'] ?? '';
        
        $sql = "SELECT ci.*, ct.name as template_name, ct.category,
                       COUNT(ps.id) as photo_count,
                       COUNT(CASE WHEN citm.is_required = 1 THEN citm.id END) as required_items,
                       COUNT(CASE WHEN ps.id IS NOT NULL AND citm.is_required = 1 THEN ps.id END) as completed_required
                FROM checklist_instances ci
                INNER JOIN checklist_templates ct ON ci.template_id = ct.id
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
        
        $sql .= " GROUP BY ci.id ORDER BY ci.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getInstance($id) {
        // Get instance details
        $sql = "SELECT ci.*, ct.name as template_name, ct.description as template_description
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
                
                $items[$itemId] = [
                    'id' => (int)$row['id'],
                    'template_id' => (int)$row['template_id'],
                    'order_index' => (int)$row['order_index'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'photo_requirements' => $photoRequirements,
                    'sample_image_url' => $row['sample_image_url'],
                    'is_required' => (bool)$row['is_required'],
                    'level' => isset($row['level']) ? (int)$row['level'] : 0,
                    'parent_id' => isset($row['parent_id']) ? (int)$row['parent_id'] : null,
                    'photos' => []
                ];
            }
            
            // Add photo if exists
            if ($row['photo_id']) {
                $items[$itemId]['photos'][] = [
                    'id' => $row['photo_id'],
                    'file_name' => $row['file_name'],
                    'file_url' => $row['file_url'],
                    'file_type' => $row['file_type'],
                    'created_at' => $row['photo_created_at'],
                    'is_approved' => $row['is_approved'],
                    'review_notes' => $row['review_notes']
                ];
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
        $allowedFields = ['status', 'operator_id', 'operator_name', 'part_number', 'serial_number'];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $updateFields[] = "$field = ?";
                $params[] = $data[$field];
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
            
            // Update progress if status changed
            if (isset($data['status'])) {
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

    // ==============================================
    // Photo Management Methods
    // ==============================================

    public function uploadPhoto() {
        $instanceId = $_POST['instance_id'] ?? null;
        $itemId = $_POST['item_id'] ?? null;
        $uploadedFile = $_FILES['photo'] ?? null;
        
        if (!$instanceId || !$itemId || !$uploadedFile) {
            throw new Exception('Missing required parameters');
        }
        
        // Validate file
        $config = $this->getConfigValues();
        $maxSize = ($config['max_photo_size_mb'] ?? 10) * 1024 * 1024;
        
        if ($uploadedFile['size'] > $maxSize) {
            throw new Exception('File size exceeds maximum allowed size');
        }
        
        $allowedTypes = json_decode($config['allowed_photo_types'] ?? '["image/jpeg", "image/png"]', true);
        if (!in_array($uploadedFile['type'], $allowedTypes)) {
            throw new Exception('File type not allowed');
        }
        
        // Generate unique filename
        $extension = pathinfo($uploadedFile['name'], PATHINFO_EXTENSION);
        $fileName = 'submission_' . $instanceId . '_' . $itemId . '_' . time() . '.' . $extension;
        $uploadPath = '../attachments/photo-submissions/' . $fileName;
        
        // Create directory if it doesn't exist
        if (!file_exists('../attachments/photo-submissions/')) {
            mkdir('../attachments/photo-submissions/', 0755, true);
        }
        
        if (move_uploaded_file($uploadedFile['tmp_name'], $uploadPath)) {
            // Save to database
            $sql = "INSERT INTO photo_submissions (instance_id, item_id, file_name, file_path, file_url, file_type, file_size, mime_type) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    file_name = VALUES(file_name), 
                    file_path = VALUES(file_path),
                    file_url = VALUES(file_url),
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
                $uploadedFile['type']
            ]);
            
            // Update instance progress
            $this->updateInstanceProgress($instanceId);
            
            // Log action
            $this->logAction($instanceId, 'photo_added', null, ['item_id' => $itemId, 'file_name' => $fileName]);
            
            return ['success' => true, 'file_url' => '/attachments/photo-submissions/' . $fileName];
        } else {
            throw new Exception('Failed to upload file');
        }
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

    private function updateInstanceProgress($instanceId) {
        $sql = "UPDATE checklist_instances ci
                SET progress_percentage = (
                    SELECT ROUND(
                        (COUNT(CASE WHEN ps.id IS NOT NULL THEN 1 END) * 100.0) / COUNT(citm.id), 2
                    )
                    FROM checklist_items citm
                    LEFT JOIN photo_submissions ps ON citm.id = ps.item_id AND ps.instance_id = ci.id
                    WHERE citm.template_id = ci.template_id
                )
                WHERE ci.id = ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$instanceId]);
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
                    $instanceData = [
                        'template_id' => $template['id'],
                        'work_order_number' => $woNumber,
                        'part_number' => $partNumber,
                        'serial_number' => $serialNumber
                    ];
                    
                    $result = $this->createInstance();
                    return $this->getInstance($result['instance_id']);
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
}

// Initialize and handle request
$api = new PhotoChecklistConfigAPI();
$api->handleRequest();
?>
