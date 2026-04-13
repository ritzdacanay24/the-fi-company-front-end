<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
$pdo = $db;
try {
    
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
               u1.first as reviewerFirstName, u1.last as reviewerLastName,
               u1.email as reviewerEmail, u1.department as reviewerDepartment,
               u2.first as sentByFirstName, u2.last as sentByLastName
        FROM mrf_det_reviews r
        LEFT JOIN db.users u1 ON r.reviewerId = u1.id
        LEFT JOIN db.users u2 ON r.sentForReviewBy = u2.id
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
