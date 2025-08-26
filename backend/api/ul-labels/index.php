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
require_once '../../config/database.php';

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
                $query = "SELECT * FROM " . $this->table . " WHERE id = ? ORDER BY created_at DESC";
                $stmt = $this->conn->prepare($query);
                $stmt->bind_param("i", $id);
            } else {
                $query = "SELECT * FROM " . $this->table . " ORDER BY created_at DESC";
                $stmt = $this->conn->prepare($query);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($id) {
                $label = $result->fetch_assoc();
                if ($label) {
                    return $this->response(true, $label, "UL Label retrieved successfully");
                } else {
                    return $this->response(false, null, "UL Label not found", "NOT_FOUND");
                }
            } else {
                $labels = [];
                while ($row = $result->fetch_assoc()) {
                    $labels[] = $row;
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
            $check_stmt->bind_param("s", $data['ul_number']);
            $check_stmt->execute();
            if ($check_stmt->get_result()->num_rows > 0) {
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
            
            $stmt->bind_param("ssssssssi", 
                $data['ul_number'], 
                $data['description'], 
                $data['category'],
                $manufacturer,
                $part_number,
                $certification_date,
                $expiry_date,
                $status,
                $created_by
            );
            
            if ($stmt->execute()) {
                $new_id = $this->conn->insert_id;
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
            $check_stmt->bind_param("i", $id);
            $check_stmt->execute();
            if ($check_stmt->get_result()->num_rows === 0) {
                return $this->response(false, null, "UL Label not found", "NOT_FOUND");
            }
            
            $query = "UPDATE " . $this->table . " SET 
                     ul_number = ?, description = ?, category = ?, manufacturer = ?, 
                     part_number = ?, certification_date = ?, expiry_date = ?, 
                     status = ?, updated_by = ? 
                     WHERE id = ?";
            
            $stmt = $this->conn->prepare($query);
            
            $updated_by = isset($data['updated_by']) ? $data['updated_by'] : 1; // Default user ID
            
            $stmt->bind_param("ssssssssii", 
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
            );
            
            if ($stmt->execute()) {
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
            $check_stmt->bind_param("i", $id);
            $check_stmt->execute();
            if ($check_stmt->get_result()->num_rows === 0) {
                return $this->response(false, null, "UL Label not found", "NOT_FOUND");
            }
            
            $query = "DELETE FROM " . $this->table . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $id);
            
            if ($stmt->execute()) {
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
    $database = new Database();
    $db = $database->getConnection();
    
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
