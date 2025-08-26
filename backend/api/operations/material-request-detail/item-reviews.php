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
    
    $item_id = $_GET['item_id'] ?? null;
    
    if (!$item_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Item ID is required']);
        exit;
    }
    
    // Get all reviews for a specific item
    $stmt = $pdo->prepare("
        SELECT r.*, 
               u1.firstName as reviewerFirstName, u1.lastName as reviewerLastName,
               u1.email as reviewerEmail, u1.department as reviewerDepartment,
               u2.firstName as sentByFirstName, u2.lastName as sentByLastName
        FROM mrf_det_reviews r
        LEFT JOIN users u1 ON r.reviewerId = u1.id
        LEFT JOIN users u2 ON r.sentForReviewBy = u2.id
        WHERE r.mrf_det_id = ? AND r.active = 1
        ORDER BY r.reviewPriority DESC, r.sentForReviewAt ASC
    ");
    
    $stmt->execute([$item_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($results);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
