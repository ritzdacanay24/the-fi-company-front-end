<?php
require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

/**
 * SIMPLE Checklist API - Clean Implementation
 * No complexity, just works
 */
class SimpleChecklistAPI {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest() {
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';

        try {
            switch ($action) {
                case 'list':
                    echo json_encode($this->getTemplates());
                    break;
                case 'get':
                    $id = $_GET['id'] ?? null;
                    echo json_encode($this->getTemplate($id));
                    break;
                case 'save':
                    echo json_encode($this->saveTemplate());
                    break;
                case 'delete':
                    $id = $_GET['id'] ?? null;
                    echo json_encode($this->deleteTemplate($id));
                    break;
                case 'upload-reference':
                    echo json_encode($this->uploadReference());
                    break;
                case 'delete-reference':
                    $id = $_GET['id'] ?? null;
                    echo json_encode($this->deleteReference($id));
                    break;
                case 'reorder-references':
                    echo json_encode($this->reorderReferences());
                    break;
                default:
                    http_response_code(404);
                    echo json_encode(['error' => 'Invalid action']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Get all templates
     */
    public function getTemplates() {
        $sql = "SELECT id, name, description, part_number, product_type, 
                       is_draft, created_at, updated_at,
                       (SELECT COUNT(*) FROM checklist_items WHERE template_id = ct.id) as item_count
                FROM checklist_templates ct
                WHERE is_active = 1
                ORDER BY is_draft DESC, updated_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get single template with items (flat list)
     */
    public function getTemplate($id) {
        if (!$id) return null;

        // Get template
        $sql = "SELECT * FROM checklist_templates WHERE id = ? AND is_active = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$template) return null;

        // Get items (flat list, ordered)
        $sql = "SELECT id, title, description, level, parent_id, order_index,
                       is_required, submission_type, photo_requirements
                FROM checklist_items 
                WHERE template_id = ?
                ORDER BY order_index";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get reference images for all items
        $itemIds = array_column($items, 'id');
        $references = [];
        if (!empty($itemIds)) {
            $placeholders = str_repeat('?,', count($itemIds) - 1) . '?';
            $sql = "SELECT * FROM checklist_item_references 
                    WHERE item_id IN ($placeholders)
                    ORDER BY item_id, display_order";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($itemIds);
            $refResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Group by item_id
            foreach ($refResults as $ref) {
                $references[$ref['item_id']][] = $ref;
            }
        }

        // Parse JSON fields and attach references
        foreach ($items as &$item) {
            $item['photo_requirements'] = json_decode($item['photo_requirements'] ?? 'null', true);
            $item['references'] = $references[$item['id']] ?? [];
            $item['has_photo_requirements'] = !empty($item['photo_requirements']);
        }

        $template['items'] = $items;
        return $template;
    }

    /**
     * Save template (create or update)
     * SIMPLE: One pass, sequential parent linking
     */
    public function saveTemplate() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $this->conn->beginTransaction();
        
        try {
            $templateId = $data['id'] ?? null;
            $isDraft = $data['is_draft'] ?? 1;

            // Save template
            if ($templateId) {
                // Update existing
                $sql = "UPDATE checklist_templates 
                        SET name = ?, description = ?, part_number = ?, product_type = ?,
                            is_draft = ?, updated_at = NOW()
                        WHERE id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    $data['name'],
                    $data['description'] ?? '',
                    $data['part_number'] ?? '',
                    $data['product_type'] ?? '',
                    $isDraft,
                    $templateId
                ]);
            } else {
                // Create new
                $sql = "INSERT INTO checklist_templates 
                        (name, description, part_number, product_type, is_draft, is_active, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    $data['name'],
                    $data['description'] ?? '',
                    $data['part_number'] ?? '',
                    $data['product_type'] ?? '',
                    $isDraft
                ]);
                $templateId = $this->conn->lastInsertId();
            }

            // Delete old items
            $sql = "DELETE FROM checklist_items WHERE template_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$templateId]);

            // Insert items - SIMPLE ONE-PASS APPROACH
            $items = $data['items'] ?? [];
            $lastItemAtLevel = []; // Track last inserted ID at each level

            error_log("=== Starting item save for template $templateId ===");
            
            foreach ($items as $index => $item) {
                $level = $item['level'] ?? 0;
                $parentId = null;

                // If child item, find parent from last item at parent level
                if ($level > 0 && isset($lastItemAtLevel[$level - 1])) {
                    $parentId = $lastItemAtLevel[$level - 1];
                }

                error_log("Item #$index: '{$item['title']}' - Level: $level, Parent ID: " . ($parentId ?? 'NULL') . ", Order: {$item['order_index']}");

                // Insert item
                $sql = "INSERT INTO checklist_items 
                        (template_id, title, description, level, parent_id, order_index,
                         is_required, submission_type, photo_requirements)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
                $photoReqs = $item['photo_requirements'] ?? null;
                if (!empty($photoReqs) && is_array($photoReqs)) {
                    $photoReqs = json_encode($photoReqs);
                } else {
                    $photoReqs = null;
                }
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    $templateId,
                    $item['title'],
                    $item['description'] ?? '',
                    $level,
                    $parentId,
                    $item['order_index'],
                    $item['is_required'] ?? 1,
                    $item['submission_type'] ?? 'photo',
                    $photoReqs
                ]);

                // Track this item's ID for its level
                $insertedId = $this->conn->lastInsertId();
                $lastItemAtLevel[$level] = $insertedId;
                
                error_log("  -> Inserted with DB ID: $insertedId, stored at level[$level]");
            }

            error_log("=== Completed item save ===");

            $this->conn->commit();

            return [
                'success' => true,
                'template_id' => $templateId,
                'is_draft' => $isDraft
            ];

        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    /**
     * Delete template
     */
    public function deleteTemplate($id) {
        if (!$id) return ['success' => false];

        $sql = "UPDATE checklist_templates SET is_active = 0 WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);

        return ['success' => true];
    }

    /**
     * Upload reference image
     */
    public function uploadReference() {
        $itemId = $_POST['item_id'] ?? null;
        $type = $_POST['type'] ?? 'good_sample';
        $caption = $_POST['caption'] ?? '';
        
        if (!$itemId || !isset($_FILES['image'])) {
            return ['success' => false, 'error' => 'Missing item_id or image'];
        }

        // Upload directory
        $uploadDir = '/var/www/html/uploads/checklist-references/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $file = $_FILES['image'];
        $fileName = time() . '_' . basename($file['name']);
        $filePath = $uploadDir . $fileName;
        $fileUrl = '/uploads/checklist-references/' . $fileName;

        if (move_uploaded_file($file['tmp_name'], $filePath)) {
            // Get max display_order for this item
            $sql = "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order 
                    FROM checklist_item_references WHERE item_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$itemId]);
            $displayOrder = $stmt->fetchColumn();

            // Insert reference
            $sql = "INSERT INTO checklist_item_references 
                    (item_id, type, image_url, caption, display_order, uploaded_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $itemId,
                $type,
                $fileUrl,
                $caption,
                $displayOrder,
                $_SESSION['user_id'] ?? null
            ]);

            return [
                'success' => true,
                'reference' => [
                    'id' => $this->conn->lastInsertId(),
                    'item_id' => $itemId,
                    'type' => $type,
                    'image_url' => $fileUrl,
                    'caption' => $caption,
                    'display_order' => $displayOrder
                ]
            ];
        }

        return ['success' => false, 'error' => 'Upload failed'];
    }

    /**
     * Delete reference image
     */
    public function deleteReference($id) {
        if (!$id) return ['success' => false];

        // Get file path to delete
        $sql = "SELECT image_url FROM checklist_item_references WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);
        $imageUrl = $stmt->fetchColumn();

        // Delete from database
        $sql = "DELETE FROM checklist_item_references WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$id]);

        // Delete file
        if ($imageUrl) {
            $filePath = '/var/www/html' . $imageUrl;
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        return ['success' => true];
    }

    /**
     * Reorder references
     */
    public function reorderReferences() {
        $data = json_decode(file_get_contents('php://input'), true);
        $references = $data['references'] ?? [];

        foreach ($references as $ref) {
            $sql = "UPDATE checklist_item_references 
                    SET display_order = ? WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$ref['display_order'], $ref['id']]);
        }

        return ['success' => true];
    }
}

// Initialize and handle request
$api = new SimpleChecklistAPI($database->pdo);
$api->handleRequest();
