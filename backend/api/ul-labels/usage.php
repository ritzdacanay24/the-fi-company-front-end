<?php
/**
 * UL Label Usage API
 * CRUD operations for UL label usage tracking
 * 
 * Endpoints:
 * GET    /backend/api/ul-labels/usage.php - Get all usage records
 * GET    /backend/api/ul-labels/usage.php?id={id} - Get specific usage record
 * POST   /backend/api/ul-labels/usage.php - Create new usage record
 * PUT    /backend/api/ul-labels/usage.php?id={id} - Update usage record
 * DELETE /backend/api/ul-labels/usage.php?id={id} - Delete usage record
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

class ULUsageAPI {
    private $conn;
    private $table = 'ul_label_usages';
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    // Get all usage records or specific record by ID
    public function read($id = null) {
        try {
            if ($id) {
                $query = "SELECT ulu.*, ul.description as ul_description, ul.category, ul.manufacturer 
                         FROM " . $this->table . " ulu 
                         INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id 
                         WHERE ulu.id = ? 
                         ORDER BY ulu.created_at DESC";
                $stmt = $this->conn->prepare($query);
                $stmt->bind_param("i", $id);
            } else {
                $query = "SELECT ulu.*, ul.description as ul_description, ul.category, ul.manufacturer 
                         FROM " . $this->table . " ulu 
                         INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id 
                         ORDER BY ulu.created_at DESC";
                $stmt = $this->conn->prepare($query);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($id) {
                $usage = $result->fetch_assoc();
                if ($usage) {
                    return $this->response(true, $usage, "Usage record retrieved successfully");
                } else {
                    return $this->response(false, null, "Usage record not found", "NOT_FOUND");
                }
            } else {
                $usages = [];
                while ($row = $result->fetch_assoc()) {
                    $usages[] = $row;
                }
                return $this->response(true, $usages, "Usage records retrieved successfully");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error retrieving usage records: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Create new usage record
    public function create($data) {
        try {
            // Validate required fields
            $required_fields = ['ul_label_id', 'ul_number', 'eyefi_serial_number', 'date_used', 'user_signature', 'user_name', 'customer_name'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty(trim($data[$field]))) {
                    return $this->response(false, null, "Missing required field: $field", "VALIDATION_ERROR");
                }
            }
            
            // Verify UL label exists and is active
            $check_query = "SELECT id, status FROM ul_labels WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bind_param("i", $data['ul_label_id']);
            $check_stmt->execute();
            $label_result = $check_stmt->get_result();
            
            if ($label_result->num_rows === 0) {
                return $this->response(false, null, "UL Label not found", "NOT_FOUND");
            }
            
            $label = $label_result->fetch_assoc();
            if ($label['status'] !== 'active') {
                return $this->response(false, null, "UL Label is not active", "VALIDATION_ERROR");
            }
            
            $query = "INSERT INTO " . $this->table . " 
                     (ul_label_id, ul_number, eyefi_serial_number, quantity_used, date_used, 
                      user_signature, user_name, customer_name, notes, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->conn->prepare($query);
            
            $quantity_used = isset($data['quantity_used']) ? intval($data['quantity_used']) : 1;
            $notes = isset($data['notes']) ? $data['notes'] : null;
            $created_by = isset($data['created_by']) ? $data['created_by'] : 1; // Default user ID
            
            $stmt->bind_param("ississsssi", 
                $data['ul_label_id'], 
                $data['ul_number'], 
                $data['eyefi_serial_number'],
                $quantity_used,
                $data['date_used'],
                $data['user_signature'],
                $data['user_name'],
                $data['customer_name'],
                $notes,
                $created_by
            );
            
            if ($stmt->execute()) {
                $new_id = $this->conn->insert_id;
                return $this->response(true, ['id' => $new_id], "Usage record created successfully");
            } else {
                return $this->response(false, null, "Error creating usage record", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error creating usage record: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Update usage record
    public function update($id, $data) {
        try {
            // Check if usage record exists
            $check_query = "SELECT id FROM " . $this->table . " WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bind_param("i", $id);
            $check_stmt->execute();
            if ($check_stmt->get_result()->num_rows === 0) {
                return $this->response(false, null, "Usage record not found", "NOT_FOUND");
            }
            
            $query = "UPDATE " . $this->table . " SET 
                     ul_label_id = ?, ul_number = ?, eyefi_serial_number = ?, quantity_used = ?, 
                     date_used = ?, user_signature = ?, user_name = ?, customer_name = ?, 
                     notes = ?, updated_by = ? 
                     WHERE id = ?";
            
            $stmt = $this->conn->prepare($query);
            
            $updated_by = isset($data['updated_by']) ? $data['updated_by'] : 1; // Default user ID
            
            $stmt->bind_param("ississsssii", 
                $data['ul_label_id'], 
                $data['ul_number'], 
                $data['eyefi_serial_number'],
                $data['quantity_used'],
                $data['date_used'],
                $data['user_signature'],
                $data['user_name'],
                $data['customer_name'],
                $data['notes'],
                $updated_by,
                $id
            );
            
            if ($stmt->execute()) {
                return $this->response(true, ['id' => $id], "Usage record updated successfully");
            } else {
                return $this->response(false, null, "Error updating usage record", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error updating usage record: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Delete usage record
    public function delete($id) {
        try {
            // Check if usage record exists
            $check_query = "SELECT id FROM " . $this->table . " WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->bind_param("i", $id);
            $check_stmt->execute();
            if ($check_stmt->get_result()->num_rows === 0) {
                return $this->response(false, null, "Usage record not found", "NOT_FOUND");
            }
            
            $query = "DELETE FROM " . $this->table . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param("i", $id);
            
            if ($stmt->execute()) {
                return $this->response(true, null, "Usage record deleted successfully");
            } else {
                return $this->response(false, null, "Error deleting usage record", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error deleting usage record: " . $e->getMessage(), "DATABASE_ERROR");
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
    
    $api = new ULUsageAPI($db);
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
