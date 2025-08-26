<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Only GET method allowed']);
        exit;
    }
    
    $item_ids = $_GET['item_ids'] ?? null;
    
    if (!$item_ids) {
        http_response_code(400);
        echo json_encode(['error' => 'Item IDs are required']);
        exit;
    }
    
    // Parse comma-separated item IDs
    $item_ids_array = explode(',', $item_ids);
    $item_ids_array = array_map('trim', $item_ids_array);
    $item_ids_array = array_filter($item_ids_array, 'is_numeric');
    
    if (empty($item_ids_array)) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid item IDs are required']);
        exit;
    }
    
    // Create placeholders for prepared statement
    $placeholders = str_repeat('?,', count($item_ids_array) - 1) . '?';
    
    // Get all reviews for multiple items
    $stmt = $pdo->prepare("
        SELECT r.*, 
               u1.firstName as reviewerFirstName, u1.lastName as reviewerLastName,
               u1.email as reviewerEmail, u1.department as reviewerDepartment,
               u2.firstName as sentByFirstName, u2.lastName as sentByLastName
        FROM mrf_det_reviews r
        LEFT JOIN users u1 ON r.reviewerId = u1.id
        LEFT JOIN users u2 ON r.sentForReviewBy = u2.id
        WHERE r.mrf_det_id IN ($placeholders) AND r.active = 1
        ORDER BY r.mrf_det_id, r.reviewPriority DESC, r.sentForReviewAt ASC
    ");
    
    $stmt->execute($item_ids_array);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group results by item ID for easier frontend processing
    $grouped_results = [];
    foreach ($results as $review) {
        $item_id = $review['mrf_det_id'];
        if (!isset($grouped_results[$item_id])) {
            $grouped_results[$item_id] = [];
        }
        $grouped_results[$item_id][] = $review;
    }
    
    echo json_encode($grouped_results);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
