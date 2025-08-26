<?php
/**
 * UL Numbers List API
 * Returns a simple list of all UL numbers for autocomplete functionality
 * 
 * Endpoint: GET /backend/api/ul-labels/ul-numbers.php
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
        $query = "SELECT ul_number, description, status FROM ul_labels WHERE status = 'active' ORDER BY ul_number ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $ul_numbers = [];
        while ($row = $result->fetch_assoc()) {
            $ul_numbers[] = [
                'ul_number' => $row['ul_number'],
                'description' => $row['description'],
                'status' => $row['status']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $ul_numbers,
            'message' => 'UL Numbers retrieved successfully'
        ]);
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
