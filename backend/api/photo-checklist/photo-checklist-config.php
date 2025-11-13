<?php

require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
require __DIR__ . '/TemplateChangeTracker.php';

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
        $sql = "SELECT ct.id, ct.name, ct.description, ct.part_number, ct.customer_part_number, 
                       ct.revision, ct.original_filename, ct.review_date, ct.revision_number, 
                       ct.revision_details, ct.revised_by, ct.product_type, 
                       ct.category, ct.version, ct.parent_template_id, ct.template_group_id, 
                       ct.is_active, ct.created_by, ct.created_at, ct.updated_at,
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
                WHERE ct.is_active = 1
                GROUP BY ct.id, ct.name, ct.description, ct.part_number, ct.customer_part_number, 
                         ct.revision, ct.original_filename, ct.review_date, ct.revision_number,
                         ct.revision_details, ct.revised_by, ct.product_type, 
                         ct.category, ct.version, ct.parent_template_id, ct.template_group_id,
                         ct.is_active, ct.created_by, ct.created_at, ct.updated_at,
                         qd.id, qd.document_number, qd.title, qr.id, qr.revision_number
                ORDER BY ct.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
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
            
            // Remove the joined fields from root level
            unset($template['qd_id'], $template['document_number'], $template['qd_title'], 
                  $template['qr_id'], $template['revision_number']);
        }
        
        return $results;
    }

    public function getTemplate($id) {
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
                WHERE ct.id = ? AND ct.is_active = 1";
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
        
        // Then get items separately with proper ordering
        $sql = "SELECT id, template_id, order_index, parent_id, level, title, description,
                       photo_requirements, sample_images, sample_image_url, is_required
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
        
        // Parse JSON fields for each item
        if (is_array($items)) {
            foreach ($items as &$item) {
                // Parse photo_requirements
                if (isset($item['photo_requirements']) && is_string($item['photo_requirements'])) {
                    $item['photo_requirements'] = json_decode($item['photo_requirements'], true) ?: [];
                } else if (!isset($item['photo_requirements'])) {
                    $item['photo_requirements'] = [];
                }
                
                // Parse sample_images
                if (isset($item['sample_images']) && is_string($item['sample_images'])) {
                    $item['sample_images'] = json_decode($item['sample_images'], true) ?: [];
                } else {
                    $item['sample_images'] = [];
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
        }
        
        // Nest child items under their parents
        $result['items'] = $this->nestItems($items);
        return $result;
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

    public function createTemplate() {
        $data = json_decode(file_get_contents('php://input'), true);
        
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
                    $parentTemplateId = $sourceTemplateId;
                    $templateGroupId = $sourceTemplate['template_group_id'];
                    
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
            
            // For new templates (not versions), we need to insert without template_group_id first,
            // then update it to its own ID. Use a temporary value of 0 or omit if nullable.
            if ($templateGroupId === null) {
                // Insert template without template_group_id (omit from INSERT for new templates)
                $sql = "INSERT INTO checklist_templates (name, description, part_number, customer_part_number, revision, original_filename, review_date, revision_number, revision_details, revised_by, product_type, category, version, parent_template_id, created_by, is_active) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
                $stmt = $this->conn->prepare($sql);
                $success = $stmt->execute([
                    $data['name'],
                    $data['description'] ?? '',
                    $data['part_number'] ?? '',
                    $data['customer_part_number'] ?? null,
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
                    $data['created_by'] ?? null
                ]);
            } else {
                // Insert template with versioning fields and metadata (for versions)
                $sql = "INSERT INTO checklist_templates (name, description, part_number, customer_part_number, revision, original_filename, review_date, revision_number, revision_details, revised_by, product_type, category, version, parent_template_id, template_group_id, created_by, is_active) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";
                $stmt = $this->conn->prepare($sql);
                $success = $stmt->execute([
                    $data['name'],
                    $data['description'] ?? '',
                    $data['part_number'] ?? '',
                    $data['customer_part_number'] ?? null,
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
                    $data['created_by'] ?? null
                ]);
            }

            if (!$success) {
                throw new Exception("Failed to insert template: " . implode(", ", $stmt->errorInfo()));
            }
            
            $templateId = $this->conn->lastInsertId();
            error_log("Template inserted with ID: " . $templateId);
            
            if (!$templateId) {
                throw new Exception("Failed to get template ID after insert");
            }
            
            // If this is a brand new template (not a version), set template_group_id to its own ID
            if ($templateGroupId === null) {
                $sql = "UPDATE checklist_templates SET template_group_id = ? WHERE id = ?";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$templateId, $templateId]);
                error_log("Set template_group_id = $templateId for new template");
            }
            
            // Insert items
            if (!empty($data['items'])) {
                error_log("🔍 BACKEND RECEIVED " . count($data['items']) . " items to insert");
                $subItemCount = 0;
                foreach ($data['items'] as $testItem) {
                    if (isset($testItem['level']) && $testItem['level'] == 1) {
                        $subItemCount++;
                    }
                }
                error_log("🔍 Sub-items (level=1) in received data: $subItemCount");
                
                foreach ($data['items'] as $index => $item) {
                    error_log("Inserting item $index for template ID $templateId: " . json_encode($item));
                    
                    // Get sample image URL from frontend (single string format)
                    $sampleImageUrl = $item['sample_image_url'] ?? '';
                    error_log("Item $index received sample_image_url: " . $sampleImageUrl);
                    
                    // Check if sample_images column exists for backward compatibility
                    $checkColumnSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_images'";
                    $checkStmt = $this->conn->prepare($checkColumnSql);
                    $checkStmt->execute();
                    $hasSampleImagesColumn = $checkStmt->rowCount() > 0;
                    
                    if ($hasSampleImagesColumn) {
                        // Prepare sample images array
                        $sampleImagesArray = [];
                        
                        // If sample_images is provided in the item data, use it
                        if (isset($item['sample_images']) && is_array($item['sample_images'])) {
                            $sampleImagesArray = $item['sample_images'];
                        } 
                        // Otherwise, create from sample_image_url for backward compatibility
                        elseif (!empty($sampleImageUrl)) {
                            $sampleImagesArray = [[
                                'url' => $sampleImageUrl,
                                'label' => 'Primary Sample Image',
                                'description' => '',
                                'type' => 'photo',
                                'image_type' => 'sample',
                                'is_primary' => true,
                                'order_index' => 0
                            ]];
                        }
                        
                        // Validate sample images
                        list($isValid, $errorMessage) = $this->validateSampleImages($sampleImagesArray);
                        if (!$isValid) {
                            throw new Exception("Item '$index': $errorMessage");
                        }
                        
                        // Normalize sample images
                        $sampleImagesArray = $this->normalizeSampleImages($sampleImagesArray);
                        
                        // DEBUG: Log the exact values being inserted
                        $parentIdValue = $item['parent_id'] ?? null;
                        $levelValue = $item['level'] ?? 0;
                        error_log("🔍 INSERTING item $index: parent_id=$parentIdValue, level=$levelValue, title={$item['title']}");
                        
                        $sql = "INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, sample_image_url, sample_images, is_required) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        $stmt = $this->conn->prepare($sql);
                        $success = $stmt->execute([
                            $templateId,
                            $item['order_index'] ?? ($index + 1),
                            $parentIdValue,
                            $levelValue,
                            $item['title'],
                            $item['description'] ?? '',
                            json_encode($item['photo_requirements'] ?? []),
                            $sampleImageUrl,
                            json_encode($sampleImagesArray),
                            $item['is_required'] ?? true
                        ]);
                        
                        if (!$success) {
                            error_log("❌ FAILED to insert item $index: " . json_encode($stmt->errorInfo()));
                        } else {
                            error_log("✅ SUCCESS: Item $index inserted with parent_id=$parentIdValue, level=$levelValue");
                        }
                        
                        error_log("Item $index saved with validated sample_images: " . json_encode($sampleImagesArray));
                    } else {
                        // Only sample_image_url column exists
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
                        
                        error_log("Item $index saved with sample_image_url only");
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
            // Update template (removed is_active = 1 check to allow updating inactive templates)
            $sql = "UPDATE checklist_templates 
                    SET name = ?, description = ?, part_number = ?, customer_part_number = ?, revision = ?, original_filename = ?, review_date = ?, revision_number = ?, revision_details = ?, revised_by = ?, product_type = ?, category = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $data['name'],
                $data['description'] ?? '',
                $data['part_number'] ?? '',
                $data['customer_part_number'] ?? null,
                $data['revision'] ?? null,
                $data['original_filename'] ?? null,
                $data['review_date'] ?? null,
                $data['revision_number'] ?? null,
                $data['revision_details'] ?? null,
                $data['revised_by'] ?? null,
                $data['product_type'] ?? '',
                $data['category'] ?? 'quality_control',
                $data['is_active'] ?? true,
                $id
            ]);
            
            // Delete existing items
            $sql = "DELETE FROM checklist_items WHERE template_id = ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$id]);
            
            // Insert updated items
            if (!empty($data['items'])) {
                foreach ($data['items'] as $index => $item) {
                    // Get sample image URL from frontend (single string format)
                    $sampleImageUrl = $item['sample_image_url'] ?? '';
                    
                    // Debug: Log what we received
                    error_log("Item $index received sample_image_url: " . $sampleImageUrl);
                    
                    // Check if sample_images column exists for backward compatibility
                    $checkColumnSql = "SHOW COLUMNS FROM checklist_items LIKE 'sample_images'";
                    $checkStmt = $this->conn->prepare($checkColumnSql);
                    $checkStmt->execute();
                    $hasSampleImagesColumn = $checkStmt->rowCount() > 0;
                    
                    // Build the SQL based on available columns
                    if ($hasSampleImagesColumn) {
                        // Store in both columns for compatibility
                        $sampleImagesArray = [];
                        if (!empty($sampleImageUrl)) {
                            $sampleImagesArray = [[
                                'url' => $sampleImageUrl,
                                'label' => 'Sample Image',
                                'description' => '',
                                'type' => 'photo',
                                'is_primary' => true,
                                'order_index' => 0
                            ]];
                        }
                        
                        $sql = "INSERT INTO checklist_items (template_id, order_index, parent_id, level, title, description, photo_requirements, sample_image_url, sample_images, is_required) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
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
                            json_encode($sampleImagesArray),
                            $item['is_required'] ?? true
                        ]);
                        
                        error_log("Item $index saved with both sample_image_url and sample_images");
                    } else {
                        // Only sample_image_url column exists
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
                        
                        error_log("Item $index saved with sample_image_url only");
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
        $fileName = 'submission_' . $instanceId . '_' . $itemId . '_' . time() . '.' . $extension;
        $uploadPath = '../../../attachments/photo-submissions/' . $fileName;
        
        // Create directory if it doesn't exist
        if (!file_exists('../../../attachments/photo-submissions/')) {
            mkdir('../../../attachments/photo-submissions/', 0755, true);
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
}

// Initialize and handle request
$api = new PhotoChecklistConfigAPI($db);
$api->handleRequest();
?>
