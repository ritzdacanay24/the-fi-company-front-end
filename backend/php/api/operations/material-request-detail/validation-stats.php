<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    $mrf_id = $_GET['mrf_id'] ?? null;
    
    if (!$mrf_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Material request ID is required']);
        exit;
    }
    
    // Get validation statistics from mrf_det table
    $stmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_items,
            SUM(CASE WHEN validationStatus = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN validationStatus = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
            SUM(CASE WHEN validationStatus = 'pending' OR validationStatus IS NULL THEN 1 ELSE 0 END) as pending_count,
            ROUND(
                (SUM(CASE WHEN validationStatus = 'approved' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
                2
            ) as approval_percentage,
            ROUND(
                (SUM(CASE WHEN validationStatus IN ('approved', 'rejected') THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
                2
            ) as completion_percentage
        FROM mrf_det 
        WHERE mrf_id = ? AND active = 1
    ");
    
    $stmt->execute([$mrf_id]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // Get review statistics from mrf_det_reviews table
    $review_stmt = $pdo->prepare("
        SELECT 
            COUNT(DISTINCT r.mrf_det_id) as items_with_reviews,
            COUNT(*) as total_reviews_assigned,
            SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as pending_review_count,
            SUM(CASE WHEN r.reviewDecision = 'approved' THEN 1 ELSE 0 END) as review_approved_count,
            SUM(CASE WHEN r.reviewDecision = 'rejected' THEN 1 ELSE 0 END) as review_rejected_count,
            SUM(CASE WHEN r.reviewDecision = 'needs_clarification' THEN 1 ELSE 0 END) as needs_clarification_count
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        WHERE md.mrf_id = ? AND r.active = 1
    ");
    
    $review_stmt->execute([$mrf_id]);
    $review_stats = $review_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Merge review stats into main stats
    $stats = array_merge($stats, $review_stats);
    
    // Get review workload by reviewer (from mrf_det_reviews table)
    $reviewer_stmt = $pdo->prepare("
        SELECT 
            r.reviewerId,
            u.firstName, 
            u.lastName,
            r.department,
            COUNT(*) as items_assigned,
            SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as pending_items,
            SUM(CASE WHEN r.reviewDecision IS NOT NULL THEN 1 ELSE 0 END) as completed_items,
            MAX(r.reviewPriority) as highest_priority
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        LEFT JOIN users u ON r.reviewerId = u.id
        WHERE md.mrf_id = ? AND r.active = 1
        GROUP BY r.reviewerId, r.department, u.firstName, u.lastName
        ORDER BY pending_items DESC, highest_priority DESC
    ");
    
    $reviewer_stmt->execute([$mrf_id]);
    $reviewers = $reviewer_stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get priority breakdown (from mrf_det_reviews table)
    $priority_stmt = $pdo->prepare("
        SELECT 
            r.reviewPriority,
            COUNT(*) as count
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        WHERE md.mrf_id = ? AND r.reviewStatus = 'pending_review' AND r.active = 1
        GROUP BY r.reviewPriority
        ORDER BY 
            CASE r.reviewPriority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
            END
    ");
    
    $priority_stmt->execute([$mrf_id]);
    $priorities = $priority_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get department breakdown
    $dept_stmt = $pdo->prepare("
        SELECT 
            r.department,
            COUNT(*) as total_assigned,
            SUM(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN r.reviewDecision = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN r.reviewDecision = 'rejected' THEN 1 ELSE 0 END) as rejected_count
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        WHERE md.mrf_id = ? AND r.active = 1
        GROUP BY r.department
        ORDER BY pending_count DESC
    ");
    
    $dept_stmt->execute([$mrf_id]);
    $departments = $dept_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'statistics' => $stats,
        'reviewers' => $reviewers,
        'priorities' => $priorities,
        'departments' => $departments,
        'summary' => [
            'total_items' => $stats['total_items'],
            'validation_complete' => $stats['approved_count'] + $stats['rejected_count'],
            'validation_pending' => $stats['pending_count'],
            'reviews_assigned' => $stats['total_reviews_assigned'] ?? 0,
            'reviews_pending' => $stats['pending_review_count'] ?? 0,
            'items_with_reviews' => $stats['items_with_reviews'] ?? 0
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
