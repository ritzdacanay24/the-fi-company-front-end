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
    
    // Check approval status for a specific item
    $stmt = $pdo->prepare("
        SELECT 
            r.department,
            r.reviewDecision,
            r.reviewStatus,
            u.firstName as reviewerFirstName,
            u.lastName as reviewerLastName
        FROM mrf_det_reviews r
        LEFT JOIN users u ON r.reviewerId = u.id
        WHERE r.mrf_det_id = ? AND r.active = 1
    ");
    
    $stmt->execute([$item_id]);
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $pending_departments = [];
    $rejected_by_departments = [];
    $needs_info_departments = [];
    $approved_departments = [];
    
    foreach ($reviews as $review) {
        $dept_info = $review['department'];
        if ($review['reviewerFirstName']) {
            $dept_info .= " (" . $review['reviewerFirstName'] . " " . $review['reviewerLastName'] . ")";
        }
        
        if ($review['reviewStatus'] === 'pending_review') {
            $pending_departments[] = $dept_info;
        } elseif ($review['reviewDecision'] === 'rejected') {
            $rejected_by_departments[] = $dept_info;
        } elseif ($review['reviewDecision'] === 'needs_clarification') {
            $needs_info_departments[] = $dept_info;
        } elseif ($review['reviewDecision'] === 'approved') {
            $approved_departments[] = $dept_info;
        }
    }
    
    $all_approved = count($reviews) > 0 && 
                   count($pending_departments) === 0 && 
                   count($rejected_by_departments) === 0 && 
                   count($needs_info_departments) === 0;
    
    echo json_encode([
        'allApproved' => $all_approved,
        'pendingDepartments' => $pending_departments,
        'rejectedByDepartments' => $rejected_by_departments,
        'needsInfoDepartments' => $needs_info_departments,
        'approvedDepartments' => $approved_departments,
        'totalDepartments' => count($reviews),
        'hasReviews' => count($reviews) > 0
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
