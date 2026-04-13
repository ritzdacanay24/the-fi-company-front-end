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
    
    $mrf_id = $_GET['mrf_id'] ?? null;
    
    if (!$mrf_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Material request ID is required']);
        exit;
    }
    
    // Get review summary by department for a specific material request
    $stmt = $pdo->prepare("
        SELECT 
            r.department,
            COUNT(*) as total_assigned,
            COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) as pending_count,
            COUNT(CASE WHEN r.reviewDecision = 'approved' THEN 1 END) as approved_count,
            COUNT(CASE WHEN r.reviewDecision = 'rejected' THEN 1 END) as rejected_count,
            COUNT(CASE WHEN r.reviewDecision = 'needs_clarification' THEN 1 END) as needs_info_count,
            GROUP_CONCAT(DISTINCT CONCAT(u.firstName, ' ', u.lastName) ORDER BY u.lastName) as reviewers
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        LEFT JOIN users u ON r.reviewerId = u.id
        WHERE md.mrf_id = ? AND r.active = 1
        GROUP BY r.department
        ORDER BY r.department
    ");
    
    $stmt->execute([$mrf_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($results);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
