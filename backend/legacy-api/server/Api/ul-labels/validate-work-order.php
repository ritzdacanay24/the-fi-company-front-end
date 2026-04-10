<?php
/**
 * Work Order Validation API
 * Check if a work order number is already used in UL label usage records
 * 
 * Endpoints:
 * GET /backend/api/ul-labels/validate-work-order.php?wo_nbr={work_order_number}
 * 
 * Returns:
 * - success: boolean
 * - data: array of existing usage records with UL numbers
 * - message: descriptive message
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
use EyefiDb\Databases\DatabaseEyefi;

class WorkOrderValidationAPI {
    private $conn;
    private $table = 'ul_label_usages';
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    // Check if work order number exists in usage records
    public function validateWorkOrder($wo_nbr) {
        try {
            if (!$wo_nbr || !is_numeric($wo_nbr)) {
                return [
                    'success' => false,
                    'message' => 'Invalid work order number provided',
                    'data' => []
                ];
            }

            $query = "SELECT ulu.id, ulu.ul_number, ulu.eyefi_serial_number, ulu.quantity_used, 
                            ulu.date_used, ulu.user_name, ulu.customer_name, ulu.wo_nbr,
                            ulu.wo_part, ulu.wo_description,
                            ul.description as ul_description, ul.category
                     FROM " . $this->table . " ulu 
                     LEFT JOIN ul_labels ul ON ulu.ul_label_id = ul.id 
                     WHERE ulu.wo_nbr = ? 
                     ORDER BY ulu.date_used DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$wo_nbr]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($results) > 0) {
                return [
                    'success' => true,
                    'message' => 'Work order found in existing usage records',
                    'data' => $results,
                    'count' => count($results),
                    'wo_nbr' => intval($wo_nbr)
                ];
            } else {
                return [
                    'success' => true,
                    'message' => 'Work order not found in existing usage records',
                    'data' => [],
                    'count' => 0,
                    'wo_nbr' => intval($wo_nbr)
                ];
            }
            
        } catch (PDOException $e) {
            error_log("Database error in validateWorkOrder: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Database error occurred',
                'data' => [],
                'error' => $e->getMessage()
            ];
        } catch (Exception $e) {
            error_log("General error in validateWorkOrder: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'An error occurred while validating work order',
                'data' => [],
                'error' => $e->getMessage()
            ];
        }
    }
}

// Main execution
try {
    $database = new DatabaseEyefi();
    $db = $database->getConnection();
    $api = new WorkOrderValidationAPI($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            $wo_nbr = $_GET['wo_nbr'] ?? null;
            
            if (!$wo_nbr) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Work order number (wo_nbr) parameter is required',
                    'data' => []
                ]);
                exit();
            }
            
            $result = $api->validateWorkOrder($wo_nbr);
            
            if ($result['success']) {
                http_response_code(200);
            } else {
                http_response_code(500);
            }
            
            echo json_encode($result);
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed. Use GET to validate work order.',
                'data' => []
            ]);
            break;
    }
    
} catch (Exception $e) {
    error_log("Fatal error in work order validation API: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'data' => [],
        'error' => $e->getMessage()
    ]);
}
?>