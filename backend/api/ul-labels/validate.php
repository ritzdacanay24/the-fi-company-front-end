<?php
/**
 * UL Number Validation API
 * Validates if a UL number exists and returns its details
 * 
 * Endpoint: GET /backend/api/ul-labels/validate.php?ul_number={ul_number}
 */

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
require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $ul_number = isset($_GET['ul_number']) ? trim($_GET['ul_number']) : '';
        
        if (empty($ul_number)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'INVALID_REQUEST',
                'message' => 'UL number parameter is required'
            ]);
            exit();
        }
        
        $query = "SELECT id, ul_number, description, category, manufacturer, part_number, 
                         certification_date, expiry_date, status,
                         CASE 
                             WHEN expiry_date IS NOT NULL AND expiry_date < CURDATE() THEN 'expired'
                             WHEN expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'expiring_soon'
                             ELSE status
                         END as computed_status
                  FROM ul_labels 
                  WHERE ul_number = ?";
        
        $stmt = $db->prepare($query);
        $stmt->bind_param("s", $ul_number);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $label = $result->fetch_assoc();
            
            // Get usage count for this UL number
            $usage_query = "SELECT COUNT(*) as usage_count, 
                                  COALESCE(SUM(quantity_used), 0) as total_quantity_used,
                                  MAX(date_used) as last_used_date
                           FROM ul_label_usages 
                           WHERE ul_label_id = ?";
            $usage_stmt = $db->prepare($usage_query);
            $usage_stmt->bind_param("i", $label['id']);
            $usage_stmt->execute();
            $usage_stats = $usage_stmt->get_result()->fetch_assoc();
            
            // Combine label info with usage stats
            $label['usage_count'] = $usage_stats['usage_count'];
            $label['total_quantity_used'] = $usage_stats['total_quantity_used'];
            $label['last_used_date'] = $usage_stats['last_used_date'];
            
            echo json_encode([
                'success' => true,
                'data' => $label,
                'message' => 'UL Number is valid and found'
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'NOT_FOUND',
                'message' => 'UL Number not found'
            ]);
        }
        
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'INVALID_REQUEST',
            'message' => 'Method not allowed'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SERVER_ERROR',
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
