<?php
/**
 * UL Label Usage API
 * CRUD operations for UL label usage tracking with work order support
 * 
 * Endpoints:
 * GET    /backend/api/ul-labels/usage.php - Get all usage records
 * GET    /backend/api/ul-labels/usage.php?id={id} - Get specific usage record
 * POST   /backend/api/ul-labels/usage.php - Create new usage record
 * PUT    /backend/api/ul-labels/usage.php?id={id} - Update usage record
 * DELETE /backend/api/ul-labels/usage.php?id={id} - Delete usage record
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

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
use EyefiDb\Databases\DatabaseEyefi;

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
                $stmt->execute([$id]);
            } else {
                $query = "SELECT ulu.*, ul.description as ul_description, ul.category, ul.manufacturer 
                         FROM " . $this->table . " ulu 
                         INNER JOIN ul_labels ul ON ulu.ul_label_id = ul.id 
                         ORDER BY ulu.created_at DESC";
                $stmt = $this->conn->prepare($query);
                $stmt->execute();
            }
            
            if ($id) {
                $usage = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($usage) {
                    return $this->response(true, $usage, "Usage record retrieved successfully");
                } else {
                    return $this->response(false, null, "Usage record not found", "NOT_FOUND");
                }
            } else {
                $usages = $stmt->fetchAll(PDO::FETCH_ASSOC);
                return $this->response(true, $usages, "Usage records retrieved successfully");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error retrieving usage records: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Create new usage record with work order support
    public function create($data) {
        try {
            // Validate required fields (customer_name is now optional)
            $required_fields = ['ul_label_id', 'ul_number', 'eyefi_serial_number', 'date_used', 'user_signature', 'user_name'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty(trim($data[$field]))) {
                    return $this->response(false, null, "Missing required field: $field", "VALIDATION_ERROR");
                }
            }
            
            // Verify UL label exists and is active
            $check_query = "SELECT id, status FROM ul_labels WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->execute([$data['ul_label_id']]);
            $label = $check_stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$label) {
                return $this->response(false, null, "UL Label not found", "NOT_FOUND");
            }
            
            if ($label['status'] !== 'active') {
                return $this->response(false, null, "UL Label is not active", "VALIDATION_ERROR");
            }
            
            $query = "INSERT INTO " . $this->table . " 
                     (ul_label_id, ul_number, eyefi_serial_number, quantity_used, date_used, 
                      user_signature, user_name, customer_name, notes, 
                      wo_nbr, wo_due_date, wo_part, wo_qty_ord, wo_routing, wo_line, wo_description,
                      created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->conn->prepare($query);
            
            // Standard fields
            $quantity_used = isset($data['quantity_used']) ? intval($data['quantity_used']) : 1;
            $customer_name = isset($data['customer_name']) ? trim($data['customer_name']) : '';
            $notes = isset($data['notes']) ? $data['notes'] : null;
            $created_by = isset($data['created_by']) ? $data['created_by'] : 1; // Default user ID
            
            // Work order fields
            $wo_nbr = isset($data['wo_nbr']) ? intval($data['wo_nbr']) : null;
            $wo_due_date = isset($data['wo_due_date']) ? $data['wo_due_date'] : null;
            $wo_part = isset($data['wo_part']) ? trim($data['wo_part']) : null;
            $wo_qty_ord = isset($data['wo_qty_ord']) ? intval($data['wo_qty_ord']) : null;
            $wo_routing = isset($data['wo_routing']) ? trim($data['wo_routing']) : null;
            $wo_line = isset($data['wo_line']) ? trim($data['wo_line']) : null;
            $wo_description = isset($data['wo_description']) ? $data['wo_description'] : null;
            
            if ($stmt->execute([
                $data['ul_label_id'], 
                $data['ul_number'], 
                $data['eyefi_serial_number'],
                $quantity_used,
                $data['date_used'],
                $data['user_signature'],
                $data['user_name'],
                $customer_name,
                $notes,
                $wo_nbr,
                $wo_due_date,
                $wo_part,
                $wo_qty_ord,
                $wo_routing,
                $wo_line,
                $wo_description,
                $created_by
            ])) {
                $new_id = $this->conn->lastInsertId();
                return $this->response(true, ['id' => $new_id], "Usage record created successfully");
            } else {
                return $this->response(false, null, "Error creating usage record", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error creating usage record: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Update usage record with work order support
    public function update($id, $data) {
        try {
            // Check if usage record exists
            $check_query = "SELECT id FROM " . $this->table . " WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->execute([$id]);
            if (!$check_stmt->fetch()) {
                return $this->response(false, null, "Usage record not found", "NOT_FOUND");
            }
            
            $query = "UPDATE " . $this->table . " SET 
                     ul_label_id = ?, ul_number = ?, eyefi_serial_number = ?, quantity_used = ?, 
                     date_used = ?, user_signature = ?, user_name = ?, customer_name = ?, 
                     notes = ?, wo_nbr = ?, wo_due_date = ?, wo_part = ?, wo_qty_ord = ?, 
                     wo_routing = ?, wo_line = ?, wo_description = ?, updated_by = ? 
                     WHERE id = ?";
            
            $stmt = $this->conn->prepare($query);
            
            // Standard fields
            $updated_by = isset($data['updated_by']) ? $data['updated_by'] : 1;
            $customer_name = isset($data['customer_name']) ? trim($data['customer_name']) : '';
            
            // Work order fields
            $wo_nbr = isset($data['wo_nbr']) ? intval($data['wo_nbr']) : null;
            $wo_due_date = isset($data['wo_due_date']) ? $data['wo_due_date'] : null;
            $wo_part = isset($data['wo_part']) ? trim($data['wo_part']) : null;
            $wo_qty_ord = isset($data['wo_qty_ord']) ? intval($data['wo_qty_ord']) : null;
            $wo_routing = isset($data['wo_routing']) ? trim($data['wo_routing']) : null;
            $wo_line = isset($data['wo_line']) ? trim($data['wo_line']) : null;
            $wo_description = isset($data['wo_description']) ? $data['wo_description'] : null;
            
            if ($stmt->execute([
                $data['ul_label_id'], 
                $data['ul_number'], 
                $data['eyefi_serial_number'],
                $data['quantity_used'],
                $data['date_used'],
                $data['user_signature'],
                $data['user_name'],
                $customer_name,
                $data['notes'],
                $wo_nbr,
                $wo_due_date,
                $wo_part,
                $wo_qty_ord,
                $wo_routing,
                $wo_line,
                $wo_description,
                $updated_by,
                $id
            ])) {
                return $this->response(true, ['id' => $id], "Usage record updated successfully");
            } else {
                return $this->response(false, null, "Error updating usage record", "DATABASE_ERROR");
            }
        } catch (Exception $e) {
            return $this->response(false, null, "Error updating usage record: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Void usage record - frees the UL label and EyeFi serial
    public function void($id, $void_reason = null) {
        try {
            $this->conn->beginTransaction();
            
            // Get usage record details
            $check_query = "SELECT ul_label_id, ul_number, eyefi_serial_number FROM " . $this->table . " WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->execute([$id]);
            $usage = $check_stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$usage) {
                $this->conn->rollBack();
                return $this->response(false, null, "Usage record not found", "NOT_FOUND");
            }
            
            // Mark usage as voided
            $void_query = "UPDATE " . $this->table . " 
                          SET is_voided = 1, void_reason = ?, void_date = NOW() 
                          WHERE id = ?";
            $void_stmt = $this->conn->prepare($void_query);
            $void_stmt->execute([$void_reason, $id]);
            
            // Free the UL label (make it available again)
            $free_ul_query = "UPDATE ul_labels 
                             SET status = 'available', is_consumed = 0 
                             WHERE ul_number = ?";
            $free_ul_stmt = $this->conn->prepare($free_ul_query);
            $free_ul_stmt->execute([$usage['ul_number']]);
            
            // Free the EyeFi serial number (make it available again)
            $free_eyefi_query = "UPDATE eyefi_serial_numbers 
                                SET status = 'available', 
                                    assigned_to_table = NULL,
                                    assigned_to_id = NULL,
                                    assigned_by = NULL,
                                    assigned_at = NULL
                                WHERE serial_number = ?";
            $free_eyefi_stmt = $this->conn->prepare($free_eyefi_query);
            $free_eyefi_stmt->execute([$usage['eyefi_serial_number']]);
            
            $this->conn->commit();
            
            return $this->response(true, [
                'id' => $id,
                'freed_ul_label' => $usage['ul_number'],
                'freed_eyefi_serial' => $usage['eyefi_serial_number']
            ], "Usage record voided and resources freed successfully");
            
        } catch (Exception $e) {
            $this->conn->rollBack();
            return $this->response(false, null, "Error voiding usage record: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Delete usage record
    public function delete($id) {
        try {
            // Check if usage record exists
            $check_query = "SELECT id FROM " . $this->table . " WHERE id = ?";
            $check_stmt = $this->conn->prepare($check_query);
            $check_stmt->execute([$id]);
            if (!$check_stmt->fetch()) {
                return $this->response(false, null, "Usage record not found", "NOT_FOUND");
            }
            
            $query = "DELETE FROM " . $this->table . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            
            if ($stmt->execute([$id])) {
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
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    $api = new ULUsageAPI($db);
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    $action = isset($_GET['action']) ? $_GET['action'] : null;
    
    switch ($method) {
        case 'GET':
            $result = $api->read($id);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                $result = ['success' => false, 'error' => 'INVALID_REQUEST', 'message' => 'Invalid JSON input'];
            } else {
                // Check if this is a void action
                if ($action === 'void' && $id) {
                    $void_reason = isset($input['void_reason']) ? $input['void_reason'] : null;
                    $result = $api->void($id, $void_reason);
                } else {
                    $result = $api->create($input);
                }
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
?>