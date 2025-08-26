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
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            handleGet($pdo);
            break;
        case 'POST':
            handlePost($pdo);
            break;
        case 'PUT':
            handlePut($pdo);
            break;
        case 'DELETE':
            handleDelete($pdo);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGet($pdo) {
    $id = $_GET['id'] ?? null;
    $mrf_det_id = $_GET['mrf_det_id'] ?? null;
    $reviewer_id = $_GET['reviewer_id'] ?? null;
    $department = $_GET['department'] ?? null;
    $review_status = $_GET['review_status'] ?? null;
    $priority = $_GET['priority'] ?? null;
    
    if ($id) {
        // Get specific review by ID
        $stmt = $pdo->prepare("
            SELECT r.*, 
                   md.partNumber, md.description, md.qty, md.reasonCode,
                   mr.id as mrf_id, mr.requestNumber,
                   u1.firstName as reviewerFirstName, u1.lastName as reviewerLastName, u1.email as reviewerEmail,
                   u2.firstName as sentByFirstName, u2.lastName as sentByLastName
            FROM mrf_det_reviews r
            INNER JOIN mrf_det md ON r.mrf_det_id = md.id
            INNER JOIN mrf mr ON md.mrf_id = mr.id
            LEFT JOIN users u1 ON r.reviewerId = u1.id
            LEFT JOIN users u2 ON r.sentForReviewBy = u2.id
            WHERE r.id = ? AND r.active = 1
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Review not found']);
        }
        
    } elseif ($mrf_det_id) {
        // Get all reviews for a specific item
        $stmt = $pdo->prepare("
            SELECT r.*, 
                   u1.firstName as reviewerFirstName, u1.lastName as reviewerLastName, u1.email as reviewerEmail,
                   u2.firstName as sentByFirstName, u2.lastName as sentByLastName
            FROM mrf_det_reviews r
            LEFT JOIN users u1 ON r.reviewerId = u1.id
            LEFT JOIN users u2 ON r.sentForReviewBy = u2.id
            WHERE r.mrf_det_id = ? AND r.active = 1
            ORDER BY r.reviewPriority DESC, r.sentForReviewAt DESC
        ");
        $stmt->execute([$mrf_det_id]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
        
    } elseif ($reviewer_id) {
        // Get reviews assigned to a specific reviewer
        $where_conditions = ["r.reviewerId = ?", "r.active = 1"];
        $params = [$reviewer_id];
        
        if ($department) {
            $where_conditions[] = "r.department = ?";
            $params[] = $department;
        }
        
        if ($review_status) {
            $where_conditions[] = "r.reviewStatus = ?";
            $params[] = $review_status;
        }
        
        if ($priority) {
            $where_conditions[] = "r.reviewPriority = ?";
            $params[] = $priority;
        }
        
        $stmt = $pdo->prepare("
            SELECT r.*, 
                   md.partNumber, md.description, md.qty, md.reasonCode, md.availableQty,
                   mr.id as mrf_id, mr.requestNumber, mr.requestedBy,
                   u1.firstName as requestedByFirstName, u1.lastName as requestedByLastName
            FROM mrf_det_reviews r
            INNER JOIN mrf_det md ON r.mrf_det_id = md.id
            INNER JOIN mrf mr ON md.mrf_id = mr.id
            LEFT JOIN users u1 ON mr.requestedBy = u1.id
            WHERE " . implode(' AND ', $where_conditions) . "
            ORDER BY 
                CASE r.reviewPriority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'normal' THEN 3
                    WHEN 'low' THEN 4
                END,
                r.sentForReviewAt ASC
        ");
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get summary statistics
        $stmt = $pdo->prepare("
            SELECT 
                COUNT(*) as total_assigned,
                COUNT(CASE WHEN r.reviewStatus = 'pending_review' THEN 1 END) as pending_count,
                COUNT(CASE WHEN r.reviewStatus = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN r.reviewStatus = 'rejected' THEN 1 END) as rejected_count,
                COUNT(CASE WHEN r.reviewStatus = 'needs_info' THEN 1 END) as needs_info_count,
                COUNT(CASE WHEN r.reviewPriority = 'urgent' AND r.reviewStatus = 'pending_review' THEN 1 END) as urgent_pending,
                COUNT(CASE WHEN r.reviewPriority = 'high' AND r.reviewStatus = 'pending_review' THEN 1 END) as high_pending
            FROM mrf_det_reviews r
            WHERE r.reviewerId = ? AND r.active = 1
        ");
        $stmt->execute([$reviewer_id]);
        $summary = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'items' => $results,
            'summary' => $summary
        ]);
        
    } else {
        // Get all reviews with pagination and filtering
        $page = $_GET['page'] ?? 1;
        $limit = $_GET['limit'] ?? 50;
        $offset = ($page - 1) * $limit;
        
        $where_conditions = ["r.active = 1"];
        $params = [];
        
        if ($department) {
            $where_conditions[] = "r.department = ?";
            $params[] = $department;
        }
        
        if ($review_status) {
            $where_conditions[] = "r.reviewStatus = ?";
            $params[] = $review_status;
        }
        
        if ($priority) {
            $where_conditions[] = "r.reviewPriority = ?";
            $params[] = $priority;
        }
        
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare("
            SELECT r.*, 
                   md.partNumber, md.description, md.qty,
                   mr.requestNumber,
                   u1.firstName as reviewerFirstName, u1.lastName as reviewerLastName,
                   u2.firstName as sentByFirstName, u2.lastName as sentByLastName
            FROM mrf_det_reviews r
            INNER JOIN mrf_det md ON r.mrf_det_id = md.id
            INNER JOIN mrf mr ON md.mrf_id = mr.id
            LEFT JOIN users u1 ON r.reviewerId = u1.id
            LEFT JOIN users u2 ON r.sentForReviewBy = u2.id
            WHERE " . implode(' AND ', $where_conditions) . "
            ORDER BY r.sentForReviewAt DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
    }
}

function handlePost($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        return;
    }
    
    // Validate required fields
    $required_fields = ['mrf_det_id', 'reviewerId', 'department', 'sentForReviewBy'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }
    
    try {
        $pdo->beginTransaction();
        
        // Check if item exists
        $stmt = $pdo->prepare("SELECT id FROM mrf_det WHERE id = ? AND active = 1");
        $stmt->execute([$input['mrf_det_id']]);
        if (!$stmt->fetch()) {
            throw new Exception('Material request detail item not found');
        }
        
        // Check for existing active review for same item/reviewer/department
        $stmt = $pdo->prepare("
            SELECT id FROM mrf_det_reviews 
            WHERE mrf_det_id = ? AND reviewerId = ? AND department = ? AND active = 1
        ");
        $stmt->execute([$input['mrf_det_id'], $input['reviewerId'], $input['department']]);
        if ($stmt->fetch()) {
            throw new Exception('Active review already exists for this item/reviewer/department combination');
        }
        
        // Create new review assignment
        $stmt = $pdo->prepare("
            INSERT INTO mrf_det_reviews (
                mrf_det_id, reviewerId, department, reviewStatus, reviewNote, 
                reviewPriority, sentForReviewAt, sentForReviewBy, createdDate
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
        ");
        
        $result = $stmt->execute([
            $input['mrf_det_id'],
            $input['reviewerId'],
            $input['department'],
            $input['reviewStatus'] ?? 'pending_review',
            $input['reviewNote'] ?? null,
            $input['reviewPriority'] ?? 'normal',
            $input['sentForReviewBy']
        ]);
        
        if ($result) {
            $review_id = $pdo->lastInsertId();
            $pdo->commit();
            echo json_encode([
                'id' => $review_id, 
                'message' => 'Review assignment created successfully'
            ]);
        } else {
            throw new Exception('Failed to create review assignment');
        }
        
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handlePut($pdo) {
    $id = $_GET['id'] ?? null;
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$id || !$input) {
        http_response_code(400);
        echo json_encode(['error' => 'ID and valid JSON input required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Check if review exists
        $stmt = $pdo->prepare("SELECT * FROM mrf_det_reviews WHERE id = ? AND active = 1");
        $stmt->execute([$id]);
        $review = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$review) {
            throw new Exception('Review not found');
        }
        
        // Build dynamic update query
        $fields = [];
        $values = [];
        
        $allowed_fields = [
            'reviewStatus', 'reviewNote', 'reviewPriority', 'reviewDecision', 
            'reviewComment', 'reviewedAt', 'department'
        ];
        
        foreach ($allowed_fields as $field) {
            if (array_key_exists($field, $input)) {
                $fields[] = "$field = ?";
                $values[] = $input[$field];
            }
        }
        
        // Auto-set reviewedAt if reviewDecision is provided
        if (isset($input['reviewDecision']) && !isset($input['reviewedAt'])) {
            $fields[] = "reviewedAt = NOW()";
        }
        
        // Auto-update reviewStatus based on reviewDecision
        if (isset($input['reviewDecision'])) {
            $fields[] = "reviewStatus = ?";
            $values[] = ($input['reviewDecision'] === 'needs_clarification') ? 'needs_info' : 'reviewed';
        }
        
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No valid fields to update']);
            return;
        }
        
        $fields[] = "modifiedDate = NOW()";
        $values[] = $id;
        
        $sql = "UPDATE mrf_det_reviews SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($values);
        
        if ($result) {
            $pdo->commit();
            echo json_encode(['message' => 'Review updated successfully']);
        } else {
            throw new Exception('Failed to update review');
        }
        
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function handleDelete($pdo) {
    $id = $_GET['id'] ?? null;
    $hard_delete = $_GET['hard_delete'] ?? false;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        if ($hard_delete === 'true') {
            // Hard delete - completely remove from database
            $stmt = $pdo->prepare("DELETE FROM mrf_det_reviews WHERE id = ?");
            $result = $stmt->execute([$id]);
            $message = 'Review permanently deleted';
        } else {
            // Soft delete - set active = 0
            $stmt = $pdo->prepare("
                UPDATE mrf_det_reviews 
                SET active = 0, modifiedDate = NOW() 
                WHERE id = ?
            ");
            $result = $stmt->execute([$id]);
            $message = 'Review deactivated successfully';
        }
        
        if ($result && $stmt->rowCount() > 0) {
            $pdo->commit();
            echo json_encode(['message' => $message]);
        } else {
            throw new Exception('Review not found or already deleted');
        }
        
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
