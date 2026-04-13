<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Only POST method allowed']);
        exit;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }
    
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'bulk_assign':
            handleBulkAssign($pdo, $input);
            break;
        case 'bulk_review':
            handleBulkReview($pdo, $input);
            break;
        case 'department_summary':
            handleDepartmentSummary($pdo, $input);
            break;
        case 'escalate_review':
            handleEscalateReview($pdo, $input);
            break;
        case 'request_clarification':
            handleRequestClarification($pdo, $input);
            break;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action specified']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleBulkAssign($pdo, $input) {
    // Assign multiple items to multiple departments/reviewers
    $items = $input['items'] ?? [];
    $assignments = $input['assignments'] ?? [];
    $sent_by = $input['sentForReviewBy'] ?? null;
    
    if (empty($items) || empty($assignments) || !$sent_by) {
        http_response_code(400);
        echo json_encode(['error' => 'Items, assignments, and sentForReviewBy are required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        $created_reviews = [];
        
        foreach ($items as $item_id) {
            foreach ($assignments as $assignment) {
                // Check if review already exists
                $stmt = $pdo->prepare("
                    SELECT id FROM mrf_det_reviews 
                    WHERE mrf_det_id = ? AND reviewerId = ? AND department = ? AND active = 1
                ");
                $stmt->execute([$item_id, $assignment['reviewerId'], $assignment['department']]);
                
                if (!$stmt->fetch()) {
                    // Create new review assignment
                    $stmt = $pdo->prepare("
                        INSERT INTO mrf_det_reviews (
                            mrf_det_id, reviewerId, department, reviewNote, 
                            reviewPriority, sentForReviewAt, sentForReviewBy
                        ) VALUES (?, ?, ?, ?, ?, NOW(), ?)
                    ");
                    
                    $stmt->execute([
                        $item_id,
                        $assignment['reviewerId'],
                        $assignment['department'],
                        $assignment['reviewNote'] ?? null,
                        $assignment['reviewPriority'] ?? 'normal',
                        $sent_by
                    ]);
                    
                    $created_reviews[] = [
                        'review_id' => $pdo->lastInsertId(),
                        'item_id' => $item_id,
                        'reviewer_id' => $assignment['reviewerId'],
                        'department' => $assignment['department']
                    ];
                }
            }
        }
        
        $pdo->commit();
        echo json_encode([
            'message' => 'Bulk assignment completed',
            'created_reviews' => $created_reviews,
            'total_created' => count($created_reviews)
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleBulkReview($pdo, $input) {
    // Reviewer approves/rejects multiple items at once
    $review_ids = $input['reviewIds'] ?? [];
    $decision = $input['decision'] ?? '';
    $comment = $input['comment'] ?? '';
    $reviewer_id = $input['reviewerId'] ?? null;
    
    if (empty($review_ids) || !in_array($decision, ['approved', 'rejected']) || !$reviewer_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Review IDs, valid decision, and reviewer ID are required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        $updated_reviews = [];
        
        foreach ($review_ids as $review_id) {
            // Verify reviewer owns this review
            $stmt = $pdo->prepare("
                SELECT id FROM mrf_det_reviews 
                WHERE id = ? AND reviewerId = ? AND reviewStatus = 'pending_review' AND active = 1
            ");
            $stmt->execute([$review_id, $reviewer_id]);
            
            if ($stmt->fetch()) {
                // Update review
                $stmt = $pdo->prepare("
                    UPDATE mrf_det_reviews 
                    SET reviewStatus = 'reviewed', 
                        reviewDecision = ?, 
                        reviewComment = ?, 
                        reviewedAt = NOW(),
                        modifiedDate = NOW()
                    WHERE id = ?
                ");
                
                $stmt->execute([$decision, $comment, $review_id]);
                $updated_reviews[] = $review_id;
            }
        }
        
        $pdo->commit();
        echo json_encode([
            'message' => 'Bulk review completed',
            'updated_reviews' => $updated_reviews,
            'total_updated' => count($updated_reviews),
            'decision' => $decision
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleDepartmentSummary($pdo, $input) {
    // Get review summary by department for a material request
    $mrf_id = $input['mrfId'] ?? null;
    
    if (!$mrf_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Material request ID is required']);
        return;
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            r.department,
            COUNT(*) as total_assigned,
            COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) as pending_count,
            COUNT(CASE WHEN r.reviewStatus = 'approved' THEN 1 END) as approved_count,
            COUNT(CASE WHEN r.reviewStatus = 'rejected' THEN 1 END) as rejected_count,
            COUNT(CASE WHEN r.reviewStatus = 'needs_info' THEN 1 END) as needs_info_count,
            GROUP_CONCAT(DISTINCT CONCAT(u.firstName, ' ', u.lastName)) as reviewers,
            AVG(CASE r.reviewPriority 
                WHEN 'urgent' THEN 4
                WHEN 'high' THEN 3
                WHEN 'normal' THEN 2
                WHEN 'low' THEN 1
            END) as avg_priority
        FROM mrf_det_reviews r
        INNER JOIN mrf_det md ON r.mrf_det_id = md.id
        LEFT JOIN users u ON r.reviewerId = u.id
        WHERE md.mrf_id = ? AND r.active = 1
        GROUP BY r.department
        ORDER BY r.department
    ");
    
    $stmt->execute([$mrf_id]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'departments' => $results,
        'total_departments' => count($results)
    ]);
}

function handleEscalateReview($pdo, $input) {
    // Escalate a review to a senior reviewer
    $review_id = $input['reviewId'] ?? null;
    $new_reviewer_id = $input['newReviewerId'] ?? null;
    $escalation_reason = $input['escalationReason'] ?? '';
    $escalated_by = $input['escalatedBy'] ?? null;
    
    if (!$review_id || !$new_reviewer_id || !$escalated_by) {
        http_response_code(400);
        echo json_encode(['error' => 'Review ID, new reviewer ID, and escalated by are required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Get original review details
        $stmt = $pdo->prepare("
            SELECT * FROM mrf_det_reviews 
            WHERE id = ? AND active = 1
        ");
        $stmt->execute([$review_id]);
        $original_review = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$original_review) {
            throw new Exception('Original review not found');
        }
        
        // Deactivate original review
        $stmt = $pdo->prepare("
            UPDATE mrf_det_reviews 
            SET active = 0, modifiedDate = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$review_id]);
        
        // Create new escalated review
        $stmt = $pdo->prepare("
            INSERT INTO mrf_det_reviews (
                mrf_det_id, reviewerId, department, reviewNote, reviewPriority,
                sentForReviewAt, sentForReviewBy, reviewComment
            ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
        ");
        
        $escalated_note = $original_review['reviewNote'] . "\n\nESCALATED: " . $escalation_reason;
        
        $stmt->execute([
            $original_review['mrf_det_id'],
            $new_reviewer_id,
            $original_review['department'],
            $escalated_note,
            'high', // Escalated reviews are high priority
            $escalated_by,
            "Escalated from previous reviewer. Reason: " . $escalation_reason
        ]);
        
        $new_review_id = $pdo->lastInsertId();
        
        $pdo->commit();
        echo json_encode([
            'message' => 'Review escalated successfully',
            'original_review_id' => $review_id,
            'new_review_id' => $new_review_id
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleRequestClarification($pdo, $input) {
    // Reviewer requests clarification from original requestor
    $review_id = $input['reviewId'] ?? null;
    $clarification_request = $input['clarificationRequest'] ?? '';
    
    if (!$review_id || !$clarification_request) {
        http_response_code(400);
        echo json_encode(['error' => 'Review ID and clarification request are required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Update review status to needs_info
        $stmt = $pdo->prepare("
            UPDATE mrf_det_reviews 
            SET reviewStatus = 'needs_info',
                reviewDecision = 'needs_clarification',
                reviewComment = ?,
                reviewedAt = NOW(),
                modifiedDate = NOW()
            WHERE id = ? AND active = 1
        ");
        
        $stmt->execute([$clarification_request, $review_id]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Review not found or already processed');
        }
        
        $pdo->commit();
        echo json_encode([
            'message' => 'Clarification request submitted successfully',
            'review_id' => $review_id
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}
?>
