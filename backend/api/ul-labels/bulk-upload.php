<?php
/**
 * UL Labels Bulk Upload API
 * Handles bulk creation of UL labels from range uploads
 * 
 * Endpoints:
 * POST /backend/api/ul-labels/bulk-upload.php - Bulk create UL labels
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../config/database.php';

class ULLabelsBulkUploadAPI {
    private $conn;
    private $table = 'ul_labels';
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    // Bulk create UL labels
    public function bulkCreate($labels_data) {
        try {
            // Begin transaction
            $this->conn->autocommit(false);
            
            $uploaded_count = 0;
            $errors = [];
            $total_labels = count($labels_data);
            
            // Prepare the insert statement
            $query = "INSERT INTO " . $this->table . " 
                     (ul_number, description, category, manufacturer, part_number, 
                      certification_date, expiry_date, status, created_by, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->conn->prepare($query);
            
            if (!$stmt) {
                throw new Exception("Failed to prepare statement: " . $this->conn->error);
            }
            
            foreach ($labels_data as $index => $label) {
                try {
                    // Validate required fields
                    if (empty($label['ul_number']) || empty($label['description']) || empty($label['category'])) {
                        $errors[] = [
                            'index' => $index,
                            'ul_number' => $label['ul_number'] ?? '',
                            'error' => 'Missing required fields (ul_number, description, category)'
                        ];
                        continue;
                    }
                    
                    // Check if UL number already exists
                    $check_query = "SELECT id FROM " . $this->table . " WHERE ul_number = ?";
                    $check_stmt = $this->conn->prepare($check_query);
                    $check_stmt->bind_param("s", $label['ul_number']);
                    $check_stmt->execute();
                    
                    if ($check_stmt->get_result()->num_rows > 0) {
                        $errors[] = [
                            'index' => $index,
                            'ul_number' => $label['ul_number'],
                            'error' => 'UL Number already exists'
                        ];
                        continue;
                    }
                    
                    // Set default values
                    $ul_number = trim($label['ul_number']);
                    $description = trim($label['description']);
                    $category = trim($label['category']);
                    $manufacturer = !empty($label['manufacturer']) ? trim($label['manufacturer']) : null;
                    $part_number = !empty($label['part_number']) ? trim($label['part_number']) : null;
                    $certification_date = !empty($label['certification_date']) ? $label['certification_date'] : null;
                    $expiry_date = !empty($label['expiry_date']) ? $label['expiry_date'] : null;
                    $status = !empty($label['status']) ? $label['status'] : 'active';
                    $created_by = 1; // Default user ID - should be from session/auth
                    
                    // Bind parameters and execute
                    $stmt->bind_param("ssssssssi", 
                        $ul_number, 
                        $description, 
                        $category, 
                        $manufacturer, 
                        $part_number, 
                        $certification_date, 
                        $expiry_date, 
                        $status, 
                        $created_by
                    );
                    
                    if ($stmt->execute()) {
                        $uploaded_count++;
                    } else {
                        $errors[] = [
                            'index' => $index,
                            'ul_number' => $ul_number,
                            'error' => 'Database insert failed: ' . $stmt->error
                        ];
                    }
                    
                } catch (Exception $e) {
                    $errors[] = [
                        'index' => $index,
                        'ul_number' => $label['ul_number'] ?? '',
                        'error' => 'Processing error: ' . $e->getMessage()
                    ];
                }
            }
            
            // Commit transaction if we have successful uploads
            if ($uploaded_count > 0) {
                $this->conn->commit();
            } else {
                $this->conn->rollback();
            }
            
            $this->conn->autocommit(true);
            
            $response_data = [
                'uploaded_count' => $uploaded_count,
                'total_count' => $total_labels,
                'error_count' => count($errors),
                'errors' => $errors
            ];
            
            if ($uploaded_count > 0) {
                return $this->response(true, $response_data, 
                    "Successfully uploaded {$uploaded_count} out of {$total_labels} UL labels");
            } else {
                return $this->response(false, $response_data, 
                    "No UL labels were uploaded. Please check the errors.", "UPLOAD_FAILED");
            }
            
        } catch (Exception $e) {
            $this->conn->rollback();
            $this->conn->autocommit(true);
            return $this->response(false, null, 
                "Bulk upload failed: " . $e->getMessage(), "DATABASE_ERROR");
        }
    }
    
    // Generate UL labels from range data
    public function createFromRange($range_data) {
        try {
            // Validate range data
            $required_fields = ['start_number', 'end_number', 'description', 'category'];
            foreach ($required_fields as $field) {
                if (!isset($range_data[$field]) || empty(trim($range_data[$field]))) {
                    return $this->response(false, null, 
                        "Missing required field: $field", "VALIDATION_ERROR");
                }
            }
            
            $start_num = intval($range_data['start_number']);
            $end_num = intval($range_data['end_number']);
            
            // Validate range
            if ($start_num <= 0 || $end_num <= 0) {
                return $this->response(false, null, 
                    "Start and end numbers must be positive integers", "VALIDATION_ERROR");
            }
            
            if ($start_num >= $end_num) {
                return $this->response(false, null, 
                    "End number must be greater than start number", "VALIDATION_ERROR");
            }
            
            $total_numbers = $end_num - $start_num + 1;
            if ($total_numbers > 1000) {
                return $this->response(false, null, 
                    "Range too large. Maximum 1000 UL numbers per upload.", "VALIDATION_ERROR");
            }
            
            // Generate labels array
            $labels = [];
            $prefix = isset($range_data['prefix']) ? trim($range_data['prefix']) : '';
            $suffix = isset($range_data['suffix']) ? trim($range_data['suffix']) : '';
            
            for ($i = $start_num; $i <= $end_num; $i++) {
                $ul_number = $prefix . $i . $suffix;
                
                $labels[] = [
                    'ul_number' => $ul_number,
                    'description' => trim($range_data['description']),
                    'category' => trim($range_data['category']),
                    'manufacturer' => isset($range_data['manufacturer']) ? trim($range_data['manufacturer']) : null,
                    'part_number' => isset($range_data['part_number']) ? trim($range_data['part_number']) : null,
                    'certification_date' => isset($range_data['certification_date']) ? $range_data['certification_date'] : null,
                    'expiry_date' => isset($range_data['expiry_date']) ? $range_data['expiry_date'] : null,
                    'status' => isset($range_data['status']) ? $range_data['status'] : 'active'
                ];
            }
            
            // Use bulk create to insert the generated labels
            return $this->bulkCreate($labels);
            
        } catch (Exception $e) {
            return $this->response(false, null, 
                "Range processing failed: " . $e->getMessage(), "PROCESSING_ERROR");
        }
    }
    
    // Standard response format
    private function response($success, $data = null, $message = "", $error_code = null) {
        $response = [
            'success' => $success,
            'data' => $data,
            'message' => $message
        ];
        
        if ($error_code) {
            $response['error_code'] = $error_code;
        }
        
        return $response;
    }
}

// Main execution
try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    $api = new ULLabelsBulkUploadAPI($db);
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception("Invalid JSON data");
        }
        
        // Check if this is a range upload or direct bulk upload
        if (isset($input['start_number']) && isset($input['end_number'])) {
            // Range upload
            $result = $api->createFromRange($input);
        } elseif (isset($input['labels']) && is_array($input['labels'])) {
            // Direct bulk upload
            $result = $api->bulkCreate($input['labels']);
        } else {
            throw new Exception("Invalid upload format. Expected 'labels' array or range parameters.");
        }
        
        echo json_encode($result);
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed',
            'error_code' => 'METHOD_NOT_ALLOWED'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage(),
        'error_code' => 'SERVER_ERROR'
    ]);
}
?>
