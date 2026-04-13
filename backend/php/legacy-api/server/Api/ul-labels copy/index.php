<?php
/**
 * UL Labels Management API
 * Main CRUD operations for UL labels
 * 
 * Endpoints:
 * GET    /backend/api/ul-labels/index.php - Get all UL labels
 * GET    /backend/api/ul-labels/index.php?id={id} - Get specific UL label
 * POST   /backend/api/ul-labels/index.php - Create new UL label
 * PUT    /backend/api/ul-labels/index.php?id={id} - Update UL label
 * DELETE /backend/api/ul-labels/index.php?id={id} - Delete UL label
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration

class ULLabelsAPI {
    private $conn;
    private $table = 'ul_labels';
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    // Get all UL labels or specific label by ID
    public function read($id = null) {
        try {
            if ($id) {
                $query = "
                    SELECT 
                        ul.*,
                        -- Check if UL label has been used
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 FROM ul_label_usages ulu 
                                WHERE ulu.ul_label_id = ul.id 
                                OR ulu.ul_number = ul.ul_number
                            ) 
                            THEN 1 
                            ELSE 0 
                        END as is_used,
                        -- Get usage count
                        (
                            SELECT COUNT(*) 
                            FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ul.id 
                            OR ulu.ul_number = ul.ul_number
                        ) as usage_count,
                        -- Get last used date
                        (
                            SELECT MAX(ulu.date_used) 
                            FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ul.id 
                            OR ulu.ul_number = ul.ul_number
                        ) as last_used_date,
                        -- Get total quantity used
                        (
                            SELECT COALESCE(SUM(ulu.quantity_used), 0)
                            FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ul.id 
                            OR ulu.ul_number = ul.ul_number
                        ) as total_quantity_used
                    FROM " . $this->table . " ul 
                    WHERE ul.id = ? 
                    ORDER BY ul.created_at DESC";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$id]);
            } else {
                $query = "
                    SELECT 
                        ul.*,
                        -- Check if UL label has been used
                        CASE 
                            WHEN EXISTS (
                                SELECT 1 FROM ul_label_usages ulu 
                                WHERE ulu.ul_label_id = ul.id 
                                OR ulu.ul_number = ul.ul_number
                            ) 
                            THEN 1 
                            ELSE 0 
                        END as is_used,
                        -- Get usage count
                        (
                            SELECT COUNT(*) 
                            FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ul.id 
                            OR ulu.ul_number = ul.ul_number
                        ) as usage_count,
                        -- Get last used date
                        (
                            SELECT MAX(ulu.date_used) 
                            FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ul.id 
                            OR ulu.ul_number = ul.ul_number
                        ) as last_used_date,
                        -- Get total quantity used
                        (
                            SELECT COALESCE(SUM(ulu.quantity_used), 0)
                            FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ul.id 
                            OR ulu.ul_number = ul.ul_number
                        ) as total_quantity_used
                    FROM " . $this->table . " ul 
                    ORDER BY ul.created_at DESC";
                $stmt = $this->conn->prepare($query);
                $stmt->execute();
            }
            
            if ($id) {
                $label = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($label) {
                    // Convert is_used to boolean and format usage data
                    $label['is_used'] = (bool) $label['is_used'];
                    $label['usage_count'] = (int) $label['usage_count'];
                    $label['total_quantity_used'] = (int) $label['total_quantity_used'];
                    return $this->response(true, $label, "UL Label retrieved successfully");
                } else {
                    return $this->response(false, null, "UL Label not found", "NOT_FOUND");
                }
            } else {
                $labels = $stmt->fetchAll(PDO::FETCH_ASSOC);
                // Convert is_used to boolean and format usage data for all labels
                foreach ($labels as &$label) {
                    $label['is_used'] = (bool) $label['is_used'];
                    $label['usage_count'] = (int) $label['usage_count'];
                    $label['total_quantity_used'] = (int) $label['total_quantity_used'];
                }
                return $this->response(true, $labels, "UL Labels retrieved successfully");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error retrieving UL labels: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Create new UL label
    public function create($data) {
        try {
            // Validate required fields
            $required_fields = ['ul_number', 'description', 'category'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty(trim($data[$field]))) {
                    return $this->response(false, null, "Missing required field: $field", "VALIDATION_ERROR");
                }
            }
            
            // Check if UL number already exists
            $check_query = "SELECT id FROM " . $this->table . " WHERE ul_number = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->execute([$data['ul_number']]);
            if ($check_stmt->fetch()) {
                return $this->response(false, null, "UL Number already exists", "DUPLICATE_ENTRY");
            }
            
            $query = "INSERT INTO " . $this->table . " 
                     (ul_number, description, category, manufacturer, part_number, 
                      certification_date, expiry_date, status, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->conn->prepare($query);
            
            // Set default values
            $status = isset($data['status']) ? $data['status'] : 'active';
            $manufacturer = isset($data['manufacturer']) ? $data['manufacturer'] : null;
            $part_number = isset($data['part_number']) ? $data['part_number'] : null;
            $certification_date = isset($data['certification_date']) ? $data['certification_date'] : null;
            $expiry_date = isset($data['expiry_date']) ? $data['expiry_date'] : null;
            $created_by = isset($data['created_by']) ? $data['created_by'] : 1; // Default user ID
            
            if ($stmt->execute([
                $data['ul_number'], 
                $data['description'], 
                $data['category'],
                $manufacturer,
                $part_number,
                $certification_date,
                $expiry_date,
                $status,
                $created_by
            ])) {
                $new_id = $this->conn->lastInsertId();
                return $this->response(true, ['id' => $new_id], "UL Label created successfully");
            } else {
                return $this->response(false, null, "Error creating UL label", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error creating UL label: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Update UL label
    public function update($id, $data) {
        try {
            // Check if label exists
            $check_query = "SELECT id FROM " . $this->table . " WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->execute([$id]);
            if (!$check_stmt->fetch()) {
                return $this->response(false, null, "UL Label not found", "NOT_FOUND");
            }
            
            // Check if the UL label has been used
            $usage_check_query = "
                SELECT 
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ? 
                            OR ulu.ul_number = (SELECT ul_number FROM " . $this->table . " WHERE id = ?)
                        ) 
                        THEN 1 
                        ELSE 0 
                    END as is_used
            ";
            
            $usage_check_stmt = $this->conn->prepare($usage_check_query);
            $usage_check_stmt->execute([$id, $id]);
            $usage_result = $usage_check_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($usage_result && $usage_result['is_used']) {
                return $this->response(false, null, "Cannot update UL label that has been used", "LABEL_IN_USE");
            }
            
            $query = "UPDATE " . $this->table . " SET 
                     ul_number = ?, description = ?, category = ?, manufacturer = ?, 
                     part_number = ?, certification_date = ?, expiry_date = ?, 
                     status = ?, updated_by = ? 
                     WHERE id = ?";
            
            $stmt = $this->conn->prepare($query);
            
            $updated_by = isset($data['updated_by']) ? $data['updated_by'] : 1; // Default user ID
            
            if ($stmt->execute([
                $data['ul_number'], 
                $data['description'], 
                $data['category'],
                $data['manufacturer'],
                $data['part_number'],
                $data['certification_date'],
                $data['expiry_date'],
                $data['status'],
                $updated_by,
                $id
            ])) {
                return $this->response(true, ['id' => $id], "UL Label updated successfully");
            } else {
                return $this->response(false, null, "Error updating UL label", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error updating UL label: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Delete UL label
    public function delete($id) {
        try {
            // Check if label exists
            $check_query = "SELECT id FROM " . $this->table . " WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->execute([$id]);
            if (!$check_stmt->fetch()) {
                return $this->response(false, null, "UL Label not found", "NOT_FOUND");
            }
            
            // Check if the UL label has been used
            $usage_check_query = "
                SELECT 
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM ul_label_usages ulu 
                            WHERE ulu.ul_label_id = ? 
                            OR ulu.ul_number = (SELECT ul_number FROM " . $this->table . " WHERE id = ?)
                        ) 
                        THEN 1 
                        ELSE 0 
                    END as is_used
            ";
            
            $usage_check_stmt = $this->conn->prepare($usage_check_query);
            $usage_check_stmt->execute([$id, $id]);
            $usage_result = $usage_check_stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($usage_result && $usage_result['is_used']) {
                return $this->response(false, null, "Cannot delete UL label that has been used", "LABEL_IN_USE");
            }
            
            $query = "DELETE FROM " . $this->table . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            
            if ($stmt->execute([$id])) {
                return $this->response(true, null, "UL Label deleted successfully");
            } else {
                return $this->response(false, null, "Error deleting UL label", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error deleting UL label: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Helper method to format API responses
    private function response($success, $data = null, $message = "", $error_code = null) {
        $response = [
            'success' => $success,
            'message' => $message
        ];
        
        if ($success) {
            $response['data'] = $data;
        } else {
            $response['error'] = $error_code ?: 'UNKNOWN_ERROR';
        }
        
        return $response;
    }
}

// Main API handler
try {
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    $api = new ULLabelsAPI($db);
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    switch ($method) {
        case 'GET':
            $result = $api->read($id);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                $result = ['success' => false, 'error' => 'INVALID_REQUEST', 'message' => 'Invalid JSON input'];
            } else {
                $result = $api->create($input);
            }
            break;
            
        case 'PUT':
            if (!$id) {
                $result = ['success' => false, 'error' => 'INVALID_REQUEST', 'message' => 'ID required for update'];
            } else {
                $input = json_decode(file_get_contents('php://input'), true);
                if (!$input) {
                    $result = ['success' => false, 'error' => 'INVALID_REQUEST', 'message' => 'Invalid JSON input'];
                } else {
                    $result = $api->update($id, $input);
                }
            }
            break;
            
        case 'DELETE':
            if (!$id) {
                $result = ['success' => false, 'error' => 'INVALID_REQUEST', 'message' => 'ID required for delete'];
            } else {
                $result = $api->delete($id);
            }
            break;
            
        default:
            $result = ['success' => false, 'error' => 'INVALID_REQUEST', 'message' => 'Method not allowed'];
            http_response_code(405);
            break;
    }
    
    // Set appropriate HTTP status code
    if (!$result['success']) {
        switch ($result['error']) {
            case 'NOT_FOUND':
                http_response_code(404);
                break;
            case 'VALIDATION_ERROR':
            case 'INVALID_REQUEST':
                http_response_code(400);
                break;
            case 'DUPLICATE_ENTRY':
                http_response_code(409);
                break;
            case 'LABEL_IN_USE':
                http_response_code(422); // Unprocessable Entity
                break;
            default:
                http_response_code(500);
                break;
        }
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SERVER_ERROR',
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
