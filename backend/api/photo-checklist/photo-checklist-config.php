<?php

require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

// Get the underlying PDO connection from Medoo
$db = $database->pdo;
/**
 * Photo Checklist Configuration API
 * Manages templates, instances, and configuration settings
 */
class PhotoChecklistConfigAPI {
    private $conn;
    private $database;

    public function __construct($db) {
        $this->conn = $db;
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
        $sql = "SELECT ct.id, ct.name, ct.description, ct.part_number, ct.product_type, 
                       ct.category, ct.version, ct.is_active, ct.created_by, ct.created_at, ct.updated_at,
                       COUNT(DISTINCT ci.id) as active_instances,
                       COUNT(DISTINCT cit.id) as item_count
                FROM checklist_templates ct
                LEFT JOIN checklist_instances ci ON ct.id = ci.template_id AND ci.status != 'completed'
                LEFT JOIN checklist_items cit ON ct.id = cit.template_id
                WHERE ct.is_active = 1
                GROUP BY ct.id, ct.name, ct.description, ct.part_number, ct.product_type, 
                         ct.category, ct.version, ct.is_active, ct.created_by, ct.created_at, ct.updated_at
                ORDER BY ct.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTemplate($id) {
        $sql = "SELECT ct.*, 
                       GROUP_CONCAT(
                           JSON_OBJECT(
                               'id', ci.id,
                               'order_index', ci.order_index,
                               'title', ci.title,
                               'description', ci.description,
                               'photo_requirements', ci.photo_requirements,
                               'sample_images', ci.sample_images,
                               'is_required', ci.is_required,
                               'min_photos', COALESCE(JSON_EXTRACT(ci.photo_requirements, '$.min_photos'), 0),
                               'max_photos', COALESCE(JSON_EXTRACT(ci.photo_requirements, '$.max_photos'), 10),
                               'parent_id', ci.parent_id,
                               'level', ci.level
                           ) ORDER BY ci.order_index
                       ) as items
                FROM checklist_templates ct
                LEFT JOIN checklist_items ci ON ct.id = ci.template_id
                WHERE ct.id = ? AND ct.is_active = 1
                GROUP BY ct.id";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result && $result['items']) {
            $result['items'] = json_decode('[' . $result['items'] . ']', true);
            
            // Parse sample_images JSON for each item
            if (is_array($result['items'])) {
                foreach ($result['items'] as &$item) {
                    if (isset($item['sample_images']) && is_string($item['sample_images'])) {
                        $item['sample_images'] = json_decode($item['sample_images'], true) ?: [];
                    } else {
                        $item['sample_images'] = [];
                    }
                }
                unset($item); // Break reference
            }
        } else {
            $result['items'] = [];
        }
        
        return $result;
    }

    public function createTemplate() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Debug: Log the received data
        error_log("createTemplate received data: " . json_encode($data, JSON_PRETTY_PRINT));
        
        $this->conn->beginTransaction();
        
        try {
            // Insert template
            $sql = "INSERT INTO checklist_templates (name, description, part_number, product_type, category, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            $success = $stmt->execute([
                $data['name'],
                $data['description'] ?? '',
                $data['part_number'] ?? '',
                $data['product_type'] ?? '',
                $data['category'] ?? 'quality_control',
                $data['created_by'] ?? null
            ]);
            
            if (!$success) {
                throw new Exception("Failed to insert template: " . implode(", ", $stmt->errorInfo()));
            }
            
            $templateId = $this->conn->lastInsertId();
            error_log("Template inserted with ID: " . $templateId);
            
            if (!$templateId) {
                throw new Exception("Failed to get template ID after insert");
            }
            
            // Insert items
            if (!empty($data['items'])) {
                foreach ($data['items'] as $index => $item) {
                    error_log("Inserting item $index for template ID $templateId: " . json_encode($item));
                    
                    // Debug: Log sample_images data specifically
                    $sampleImages = $item['sample_images'] ?? [];
                    error_log("Item $index sample_images data: " . json_encode($sampleImages, JSON_PRETTY_PRINT));
                    error_log("Item $index sample_images type: " . gettype($sampleImages));
                    error_log("Item $index sample_images count: " . (is_array($sampleImages) ? count($sampleImages) : 'not array'));
                    
                    // Check if sample_images column exists, if not use sample_image_url
                    $checkColumnSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_images'";
                    $checkStmt = $this->conn->prepare($checkColumnSql);
                    $checkStmt->execute();
                    $hasSampleImagesColumn = $checkStmt->rowCount() > 0;
                    
                    if ($hasSampleImagesColumn) {
                        error_log("Using sample_images column for item $index");
                        $sampleImagesJson = json_encode($sampleImages);
                        error_log("Item $index sample_images JSON to insert: " . $sampleImagesJson);
                        
                        $sql = "INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, sample_images, is_required) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        $stmt = $this->conn->prepare($sql);
                        $success = $stmt->execute([
                            $templateId,
                            $item['order_index'] ?? ($index + 1),
                            $item['parent_id'] ?? null,
                            $item['level'] ?? 0,
                            $item['title'],
                            $item['description'] ?? '',
                            json_encode($item['photo_requirements'] ?? []),
                            $sampleImagesJson,
                            $item['is_required'] ?? true
                        ]);
                    } else {
                        error_log("Using sample_image_url column for item $index (fallback)");
                        // Fallback to old sample_image_url column - use first image URL if available
                        $sampleImageUrl = '';
                        if (!empty($sampleImages) && is_array($sampleImages)) {
                            $sampleImageUrl = $sampleImages[0]['url'] ?? '';
                        }
                        error_log("Item $index sample_image_url to insert: " . $sampleImageUrl);
                        
                        $sql = "INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, sample_image_url, is_required) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        $stmt = $this->conn->prepare($sql);
                        $success = $stmt->execute([
                            $templateId,
                            $item['order_index'] ?? ($index + 1),
                            $item['parent_id'] ?? null,
                            $item['level'] ?? 0,
                            $item['title'],
                            $item['description'] ?? '',
                            json_encode($item['photo_requirements'] ?? []),
                            $sampleImageUrl,
                            $item['is_required'] ?? true
                        ]);
                        
                        error_log("Item $index using fallback sample_image_url: " . $sampleImageUrl);
                    }
                    
                    if (!$success) {
                        error_log("Failed to insert item $index. SQL Error: " . implode(", ", $stmt->errorInfo()));
                        error_log("Failed SQL was for template_id: $templateId, item data: " . json_encode($item));
                        throw new Exception("Failed to insert item $index: " . implode(", ", $stmt->errorInfo()));
                    } else {
                        error_log("Successfully inserted item $index for template $templateId");
                    }
                }
            }
            
            $this->conn->commit();
            return ['success' => true, 'template_id' => $templateId];
            
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function updateTemplate($id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Debug: Log the received data
        error_log("updateTemplate received data: " . json_encode($data, JSON_PRETTY_PRINT));
        
        $this->conn->beginTransaction();
        
        try {
            // Update template
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
            
            // Delete existing items
            $sql = "DELETE FROM checklist_items WHERE template_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$id]);
            
            // Insert updated items
            if (!empty($data['items'])) {
                foreach ($data['items'] as $index => $item) {
                    // Debug: Log each item's sample_images
                    $sampleImages = $item['sample_images'] ?? [];
                    error_log("Item $index sample_images: " . json_encode($sampleImages, JSON_PRETTY_PRINT));
                    
                    // Check if sample_images column exists, if not use sample_image_url
                    $checkColumnSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_images'";
                    $checkStmt = $this->conn->prepare($checkColumnSql);
                    $checkStmt->execute();
                    $hasSampleImagesColumn = $checkStmt->rowCount() > 0;
                    
                    if ($hasSampleImagesColumn) {
                        $sql = "INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, sample_images, is_required) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        $stmt = $this->conn->prepare($sql);
                        $sampleImagesJson = json_encode($sampleImages);
                        
                        // Debug: Log the JSON that will be saved
                        error_log("Item $index sample_images JSON to save: " . $sampleImagesJson);
                        
                        $stmt->execute([
                            $id,
                            $item['order_index'] ?? ($index + 1),
                            $item['parent_id'] ?? null,
                            $item['level'] ?? 0,
                            $item['title'],
                            $item['description'] ?? '',
                            json_encode($item['photo_requirements'] ?? []),
                            $sampleImagesJson,
                            $item['is_required'] ?? true
                        ]);
                    } else {
                        // Fallback to old sample_image_url column - use first image URL if available
                        $sampleImageUrl = '';
                        if (!empty($sampleImages) && is_array($sampleImages)) {
                            $sampleImageUrl = $sampleImages[0]['url'] ?? '';
                        }
                        
                        $sql = "INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, sample_image_url, is_required) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        $stmt = $this->conn->prepare($sql);
                        
                        $stmt->execute([
                            $id,
                            $item['order_index'] ?? ($index + 1),
                            $item['parent_id'] ?? null,
                            $item['level'] ?? 0,
                            $item['title'],
                            $item['description'] ?? '',
                            json_encode($item['photo_requirements'] ?? []),
                            $sampleImageUrl,
                            $item['is_required'] ?? true
                        ]);
                        
                        error_log("Item $index using fallback sample_image_url: " . $sampleImageUrl);
                    }
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
        
        $sql = "SELECT ci.id, ci.template_id, ci.work_order_number, ci.part_number, ci.serial_number, 
                       ci.operator_id, ci.operator_name, ci.status, ci.progress_percentage,
                       ci.created_at, ci.updated_at, ci.started_at, ci.completed_at, ci.submitted_at,
                       ct.name as template_name, ct.category, ct.version as template_version,
                       COUNT(DISTINCT ps.id) as photo_count,
                       COUNT(DISTINCT CASE WHEN citm.is_required = 1 THEN citm.id END) as required_items,
                       COUNT(DISTINCT CASE WHEN ps.id IS NOT NULL AND citm.is_required = 1 THEN ps.id END) as completed_required
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
        
        $sql .= " GROUP BY ci.id, ci.template_id, ci.work_order_number, ci.part_number, ci.serial_number, 
                           ci.operator_id, ci.operator_name, ci.status, ci.progress_percentage,
                           ci.created_at, ci.updated_at, ci.started_at, ci.completed_at, ci.submitted_at,
                           ct.name, ct.category, ct.version
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
        
        // Get checklist items with photos
        $sql = "SELECT citm.*, 
                       ps.id as photo_id, ps.file_name, ps.file_url, ps.file_type, ps.created_at as photo_created_at,
                       ps.is_approved, ps.review_notes
                FROM checklist_items citm
                LEFT JOIN photo_submissions ps ON citm.id = ps.item_id AND ps.instance_id = ?
                WHERE citm.template_id = ?
                ORDER BY citm.order_index, ps.created_at";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id, $instance['template_id']]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group photos by item
        $items = [];
        foreach ($results as $row) {
            $itemId = $row['id'];
            
            if (!isset($items[$itemId])) {
                $items[$itemId] = [
                    'id' => $row['id'],
                    'template_id' => $row['template_id'],
                    'order_index' => $row['order_index'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'photo_requirements' => $row['photo_requirements'],
                    'sample_image_url' => $row['sample_image_url'],
                    'is_required' => $row['is_required'],
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
        
        // Validate that item belongs to this instance's template
        if (!$this->validateItemBelongsToInstance($itemId, $instanceId)) {
            throw new Exception('Invalid item ID or item does not belong to this instance template');
        }
        
        // Validate file
        $config = $this->getConfigValues();
        $maxSize = ($config['max_photo_size_mb'] ?? 10) * 1024 * 1024;
        
        if ($uploadedFile['size'] > $maxSize) {
            throw new Exception('File size exceeds maximum allowed size');
        }
        
        // Get allowed types - they're already decoded as array by getConfigValues()
        $allowedTypes = $config['allowed_photo_types'] ?? ['image/jpeg', 'image/png'];
        if (!in_array($uploadedFile['type'], $allowedTypes)) {
            throw new Exception('File type not allowed');
        }
        
        // Generate unique filename
        $extension = pathinfo($uploadedFile['name'], PATHINFO_EXTENSION);
        $fileName = 'photo_' . $instanceId . '_' . $itemId . '_' . time() . '.' . $extension;
        $uploadPath = '../uploads/photos/' . $fileName;
        
        // Create directory if it doesn't exist
        if (!file_exists('../uploads/photos/')) {
            mkdir('../uploads/photos/', 0755, true);
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
                '/uploads/photos/' . $fileName,
                strpos($uploadedFile['type'], 'video') !== false ? 'video' : 'image',
                $uploadedFile['size'],
                $uploadedFile['type']
            ]);
            
            // Update instance progress
            $this->updateInstanceProgress($instanceId);
            
            // Log action
            $this->logAction($instanceId, 'photo_added', null, ['item_id' => $itemId, 'file_name' => $fileName]);
            
            return ['success' => true, 'file_url' => '/uploads/photos/' . $fileName];
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
}

// Initialize and handle request
$api = new PhotoChecklistConfigAPI($db);
$api->handleRequest();
?>
