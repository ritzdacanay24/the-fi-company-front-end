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
    
    $reviewer_id = $_GET['reviewer_id'] ?? null;
    
    if (!$reviewer_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Reviewer ID is required']);
        exit;
    }
    
    // Get items pending review for this reviewer
    $stmt = $pdo->prepare("
        SELECT 
            mrd.*,
            mr.requestNumber,
            mr.requestedBy,
            mr.department,
            mr.jobNumber,
            u.firstName as requestedByFirstName,
            u.lastName as requestedByLastName
        FROM material_request_details mrd
        INNER JOIN material_requests mr ON mrd.mrf_id = mr.id
        LEFT JOIN users u ON mr.requestedBy = u.id
        WHERE mrd.reviewerId = ? 
        AND mrd.reviewStatus = 'pending_review'
        ORDER BY 
            CASE mrd.reviewPriority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2  
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
            END,
            mrd.sentForReviewAt ASC
    ");
    
    $stmt->execute([$reviewer_id]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get summary statistics for this reviewer
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_assigned,
            SUM(CASE WHEN reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN reviewStatus = 'reviewed' THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN reviewPriority = 'urgent' AND reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as urgent_pending,
            SUM(CASE WHEN reviewPriority = 'high' AND reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as high_pending
        FROM material_request_details 
        WHERE reviewerId = ?
    ");
    
    $stmt->execute([$reviewer_id]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'items' => $items,
        'summary' => $summary
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
