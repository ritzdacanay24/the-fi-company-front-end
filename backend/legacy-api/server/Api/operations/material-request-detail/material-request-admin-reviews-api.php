<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
try {
$pdo = $db;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (strpos($path, '/admin-dashboard') !== false) {
                handleAdminDashboard($db);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint not found']);
            }
            break;
            
        case 'POST':
            if (strpos($path, '/review-actions') !== false) {
                handleReviewActions($db);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint not found']);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method Not Allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}

function handleAdminDashboard($db) {
    try {
        // Get all reviews with comprehensive data for admin dashboard
        $reviewsQuery = "
            SELECT 
                r.id,
                r.mrf_det_id as itemId,
                r.reviewerId as reviewerId,
                r.reviewStatus as reviewStatus,
                r.reviewDecision as reviewDecision,
                r.reviewPriority as reviewPriority,
                r.reviewNote as reviewNote,
                r.reviewComment as reviewComment,
                r.sentForReviewAt as assignedDate,
                r.reviewedAt as reviewedDate,
                DATEDIFF(NOW(), r.sentForReviewAt) as daysOverdue,
                
                -- Material Request Info
                md.mrf_id as requestId,
                CONCAT('MR-', LPAD(m.id, 6, '0')) as requestNumber,
                md.part_number as partNumber,
                md.description,
                md.qty,
                md.validation_status as validationStatus,
                m.requested_by as requestedBy,
                m.department,
                
                -- Reviewer Info
                u.name as reviewerName,
                u.department as reviewerDepartment
                
            FROM mrf_det_reviews r
            INNER JOIN mrf_det md ON r.mrf_det_id = md.id
            INNER JOIN mrf m ON md.mrf_id = m.id
            LEFT JOIN users u ON r.reviewerId = u.id
            WHERE r.active = 1
            ORDER BY 
                CASE r.reviewPriority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'normal' THEN 3
                    WHEN 'low' THEN 4
                    ELSE 5
                END,
                r.sentForReviewAt DESC
        ";
        
        $reviewsStmt = $db->prepare($reviewsQuery);
        $reviewsStmt->execute();
        $reviews = $reviewsStmt->fetchAll();
        
        // Calculate summary statistics
        $summaryQuery = "
            SELECT 
                COUNT(*) as total_reviews,
                SUM(CASE WHEN reviewStatus = 'pending_review' THEN 1 ELSE 0 END) as pending_reviews,
                SUM(CASE WHEN reviewStatus = 'reviewed' AND reviewDecision = 'approved' THEN 1 ELSE 0 END) as approved_reviews,
                SUM(CASE WHEN reviewStatus = 'reviewed' AND reviewDecision = 'rejected' THEN 1 ELSE 0 END) as rejected_reviews,
                SUM(CASE WHEN reviewStatus = 'reviewed' AND reviewDecision = 'needs_clarification' THEN 1 ELSE 0 END) as needs_clarification,
                SUM(CASE WHEN reviewStatus = 'pending_review' AND reviewPriority = 'urgent' THEN 1 ELSE 0 END) as urgent_pending,
                SUM(CASE WHEN reviewStatus = 'pending_review' AND reviewPriority = 'high' THEN 1 ELSE 0 END) as high_pending,
                SUM(CASE WHEN reviewStatus = 'pending_review' AND DATEDIFF(NOW(), sentForReviewAt) > 2 THEN 1 ELSE 0 END) as overdue_reviews,
                ROUND(AVG(CASE WHEN reviewedAt IS NOT NULL THEN TIMESTAMPDIFF(HOUR, sentForReviewAt, reviewedAt) ELSE NULL END), 1) as avg_review_time_hours
            FROM mrf_det_reviews 
            WHERE active = 1
        ";
        
        $summaryStmt = $db->prepare($summaryQuery);
        $summaryStmt->execute();
        $summary = $summaryStmt->fetch();
        
        // Get unique departments for filtering
        $deptQuery = "
            SELECT DISTINCT u.department 
            FROM mrf_det_reviews r 
            INNER JOIN users u ON r.reviewerId = u.id 
            WHERE r.active = 1 AND u.department IS NOT NULL 
            ORDER BY u.department
        ";
        $deptStmt = $db->prepare($deptQuery);
        $deptStmt->execute();
        $departments = array_column($deptStmt->fetchAll(), 'department');
        
        // Get available reviewers for reassignment
        $reviewersQuery = "
            SELECT id, name, department 
            FROM users 
            WHERE active = 1 AND (role IN ('supervisor', 'manager') OR permissions LIKE '%material_request_review%')
            ORDER BY department, name
        ";
        $reviewersStmt = $db->prepare($reviewersQuery);
        $reviewersStmt->execute();
        $availableReviewers = $reviewersStmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'reviews' => $reviews,
            'summary' => $summary,
            'departments' => $departments,
            'availableReviewers' => $availableReviewers
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to load admin dashboard: ' . $e->getMessage()]);
    }
}

function handleReviewActions($db) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'reassign_review':
                handleReassignReview($db, $input);
                break;
                
            case 'send_reminder':
                handleSendReminder($db, $input);
                break;
                
            case 'escalate_review':
                handleEscalateReview($db, $input);
                break;
                
            case 'cancel_review':
                handleCancelReview($db, $input);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Unknown action: ' . $action]);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to process review action: ' . $e->getMessage()]);
    }
}

function handleReassignReview($db, $input) {
    $reviewId = $input['reviewId'] ?? null;
    $newReviewerId = $input['newReviewerId'] ?? null;
    $reason = $input['reassignReason'] ?? '';
    $reassignedBy = $input['reassignedBy'] ?? null;
    
    if (!$reviewId || !$newReviewerId) {
        http_response_code(400);
        echo json_encode(['error' => 'Review ID and new reviewer ID are required']);
        return;
    }
    
    $db->beginTransaction();
    
    try {
        // Update the review assignment
        $updateQuery = "
            UPDATE mrf_det_reviews 
            SET reviewerId = ?, 
                sentForReviewAt = NOW(),
                reviewNote = CONCAT(COALESCE(reviewNote, ''), '\n[REASSIGNED] ', ?)
            WHERE id = ?
        ";
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->execute([$newReviewerId, $reason, $reviewId]);
        
        // Log the reassignment
        $logQuery = "
            INSERT INTO mrf_review_audit_log (review_id, action, performed_by, details, created_at)
            VALUES (?, 'reassigned', ?, ?, NOW())
        ";
        $logStmt = $db->prepare($logQuery);
        $logStmt->execute([$reviewId, $reassignedBy, json_encode([
            'new_reviewer_id' => $newReviewerId,
            'reason' => $reason
        ])]);
        
        $db->commit();
        
        echo json_encode(['success' => true, 'message' => 'Review reassigned successfully']);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleSendReminder($db, $input) {
    $reviewId = $input['reviewId'] ?? null;
    $sentBy = $input['sentBy'] ?? null;
    
    if (!$reviewId) {
        http_response_code(400);
        echo json_encode(['error' => 'Review ID is required']);
        return;
    }
    
    try {
        // Get review and reviewer details
        $reviewQuery = "
            SELECT r.*, u.name as reviewer_name, u.email as reviewer_email,
                   md.part_number, md.description
            FROM mrf_det_reviews r
            INNER JOIN users u ON r.reviewerId = u.id
            INNER JOIN mrf_det md ON r.mrf_det_id = md.id
            WHERE r.id = ?
        ";
        $reviewStmt = $db->prepare($reviewQuery);
        $reviewStmt->execute([$reviewId]);
        $review = $reviewStmt->fetch();
        
        if (!$review) {
            http_response_code(404);
            echo json_encode(['error' => 'Review not found']);
            return;
        }
        
        // In a real implementation, you would send an actual email here
        // For now, we'll just log the reminder
        $logQuery = "
            INSERT INTO mrf_review_audit_log (review_id, action, performed_by, details, created_at)
            VALUES (?, 'reminder_sent', ?, ?, NOW())
        ";
        $logStmt = $db->prepare($logQuery);
        $logStmt->execute([$reviewId, $sentBy, json_encode([
            'reviewer_email' => $review['reviewer_email'],
            'part_number' => $review['part_number']
        ])]);
        
        echo json_encode(['success' => true, 'message' => 'Reminder sent successfully']);
        
    } catch (Exception $e) {
        throw $e;
    }
}

function handleEscalateReview($db, $input) {
    $reviewId = $input['reviewId'] ?? null;
    $escalatedBy = $input['escalatedBy'] ?? null;
    
    if (!$reviewId) {
        http_response_code(400);
        echo json_encode(['error' => 'Review ID is required']);
        return;
    }
    
    $db->beginTransaction();
    
    try {
        // Get the current review to find department manager
        $reviewQuery = "
            SELECT r.*, u.department
            FROM mrf_det_reviews r
            INNER JOIN users u ON r.reviewerId = u.id
            WHERE r.id = ?
        ";
        $reviewStmt = $db->prepare($reviewQuery);
        $reviewStmt->execute([$reviewId]);
        $review = $reviewStmt->fetch();
        
        if (!$review) {
            http_response_code(404);
            echo json_encode(['error' => 'Review not found']);
            return;
        }
        
        // Find department manager or supervisor
        $managerQuery = "
            SELECT id FROM users 
            WHERE department = ? AND role IN ('manager', 'supervisor') AND id != ? 
            ORDER BY FIELD(role, 'manager', 'supervisor') 
            LIMIT 1
        ";
        $managerStmt = $db->prepare($managerQuery);
        $managerStmt->execute([$review['department'], $review['reviewerId']]);
        $manager = $managerStmt->fetch();
        
        if ($manager) {
            // Reassign to manager
            $updateQuery = "
                UPDATE mrf_det_reviews 
                SET reviewerId = ?, 
                    reviewPriority = 'high',
                    sentForReviewAt = NOW(),
                    reviewNote = CONCAT(COALESCE(reviewNote, ''), '\n[ESCALATED] Overdue review escalated to department manager')
                WHERE id = ?
            ";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->execute([$manager['id'], $reviewId]);
        }
        
        // Log the escalation
        $logQuery = "
            INSERT INTO mrf_review_audit_log (review_id, action, performed_by, details, created_at)
            VALUES (?, 'escalated', ?, ?, NOW())
        ";
        $logStmt = $db->prepare($logQuery);
        $logStmt->execute([$reviewId, $escalatedBy, json_encode([
            'escalated_to' => $manager['id'] ?? 'no_manager_found',
            'reason' => 'Overdue review'
        ])]);
        
        $db->commit();
        
        echo json_encode(['success' => true, 'message' => 'Review escalated successfully']);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

function handleCancelReview($db, $input) {
    $reviewId = $input['reviewId'] ?? null;
    $cancelledBy = $input['cancelledBy'] ?? null;
    
    if (!$reviewId) {
        http_response_code(400);
        echo json_encode(['error' => 'Review ID is required']);
        return;
    }
    
    $db->beginTransaction();
    
    try {
        // Mark review as cancelled
        $updateQuery = "
            UPDATE mrf_det_reviews 
            SET active = 0,
                reviewStatus = 'cancel_review',
                reviewedAt = NOW()
            WHERE id = ?
        ";
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->execute([$reviewId]);
        
        // Log the cancellation
        // $logQuery = "
        //     INSERT INTO mrf_review_audit_log (review_id, action, performed_by, details, created_at)
        //     VALUES (?, 'cancelled', ?, ?, NOW())
        // ";
        // $logStmt = $db->prepare($logQuery);
        // $logStmt->execute([$reviewId, $cancelledBy, json_encode([
        //     'reason' => 'Admin cancellation'
        // ])]);
        
        $db->commit();
        
        echo json_encode(['success' => true, 'message' => 'Review cancelled successfully']);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}
?>
