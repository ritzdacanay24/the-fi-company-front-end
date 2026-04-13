<?php
/**
 * Simple Users API for getting active users list
 * Used for owner assignment dropdowns
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        $activeOnly = isset($_GET['active']) && $_GET['active'] === 'true';
        
        $query = "SELECT 
                    id,
                    username,
                    CONCAT(TRIM(first), ' ', TRIM(last)) as full_name,
                    email,
                    department,
                    active
                FROM db.users";
        
        if ($activeOnly) {
            $query .= " WHERE active = 1";
        }
        
        $query .= " ORDER BY first, last, username LIMIT 500";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $users,
            'count' => count($users)
        ]);
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Method not allowed'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
