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
    
    $reviewer_id = $_GET['reviewer_id'] ?? null;
    
    if (!$reviewer_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Reviewer ID is required']);
        exit;
    }
    
    // Get pending reviews
    $stmt = $pdo->prepare("
        SELECT r.*, 
               md.partNumber, md.description, md.qty, md.reasonCode,
               mr.id as requestNumber, mr.createdDate, mr.createdBy,
               mr.requestor, mr.lineNumber, mr.pickList, mr.dueDate,
               u_req.firstName as requestorFirstName, u_req.lastName as requestorLastName
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        INNER JOIN mrf mr ON md.mrf_id = mr.id
        LEFT JOIN users u_req ON mr.createdBy = u_req.id
        WHERE r.reviewerId = ? AND r.reviewStatus = 'pending_review' AND r.active = 1
        ORDER BY 
            CASE r.reviewPriority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
            END,
            r.sentForReviewAt ASC
    ");
    $stmt->execute([$reviewer_id]);
    $pending_reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get completed reviews (last 30 days)
    $stmt = $pdo->prepare("
        SELECT r.*, 
               md.partNumber, md.description, md.qty,
               mr.id as requestNumber, mr.requestor
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        INNER JOIN mrf mr ON md.mrf_id = mr.id
        WHERE r.reviewerId = ? 
        AND r.reviewDecision IS NOT NULL
        AND r.reviewedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND r.active = 1
        ORDER BY r.reviewedAt DESC
        LIMIT 20
    ");
    $stmt->execute([$reviewer_id]);
    $completed_reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get urgent items
    $urgent_items = array_filter($pending_reviews, function($review) {
        return $review['reviewPriority'] === 'urgent' || $review['reviewPriority'] === 'high';
    });
    
    // Get summary statistics
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_assigned,
            COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) as pending_count,
            COUNT(CASE WHEN DATE(r.reviewedAt) = CURDATE() THEN 1 END) as completed_today,
            COUNT(CASE WHEN r.reviewStatus = 'pending_review' AND r.reviewPriority = 'urgent' THEN 1 END) as urgent_pending,
            COUNT(CASE WHEN r.reviewStatus = 'pending_review' AND r.reviewPriority = 'high' THEN 1 END) as high_pending,
            COUNT(CASE WHEN r.reviewDecision IS NOT NULL THEN 1 END) as completed_count
        FROM mrf_det_reviews r
        WHERE r.reviewerId = ? AND r.active = 1
    ");
    $stmt->execute([$reviewer_id]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'pendingReviews' => $pending_reviews,
        'completedReviews' => $completed_reviews,
        'urgentItems' => array_values($urgent_items),
        'summary' => $summary
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
