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
    $mrf_id = $_GET['mrf_id'] ?? null;
    $reviewer_id = $_GET['reviewer_id'] ?? null;
    
    if ($id) {
        // Get single item with review details
        $stmt = $pdo->prepare("
            SELECT md.*, 
                   u1.firstName as validatedByFirstName, u1.lastName as validatedByLastName,
                   -- Review summary from separate review table
                   (SELECT COUNT(*) FROM mrf_det_reviews r WHERE r.mrf_det_id = md.id AND r.active = 1) as total_reviews,
                   (SELECT COUNT(*) FROM mrf_det_reviews r WHERE r.mrf_det_id = md.id AND r.reviewStatus = 'pending_review' AND r.active = 1) as pending_reviews,
                   (SELECT GROUP_CONCAT(DISTINCT department) FROM mrf_det_reviews r WHERE r.mrf_det_id = md.id AND r.active = 1) as reviewing_departments
            FROM mrf_det md
            LEFT JOIN users u1 ON md.validatedBy = u1.id
            WHERE md.id = ?
        ");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            // Get detailed review information
            $stmt = $pdo->prepare("
                SELECT r.*, u.firstName, u.lastName, u.email 
                FROM mrf_det_reviews r
                LEFT JOIN users u ON r.reviewerId = u.id
                WHERE r.mrf_det_id = ? AND r.active = 1
                ORDER BY r.createdDate
            ");
            $stmt->execute([$id]);
            $result['reviews'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($result);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Item not found']);
        }
    } elseif ($mrf_id) {
        // Get all items for a material request using the view
        $stmt = $pdo->prepare("
            SELECT * FROM vw_mrf_det_with_reviews 
            WHERE mrf_id = ? AND active = 1
            ORDER BY createdDate
        ");
        $stmt->execute([$mrf_id]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($results);
    } elseif ($reviewer_id) {
        // Get items pending review for specific reviewer
        $stmt = $pdo->prepare("
            SELECT md.*, mr.*, r.reviewNote, r.reviewPriority, r.department, r.sentForReviewAt
            FROM mrf_det_reviews r
            INNER JOIN mrf_det md ON r.mrf_det_id = md.id
            INNER JOIN mrf mr ON md.mrf_id = mr.id
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
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['items' => $results]);
    } else {
        // Get all items with pagination
        $page = $_GET['page'] ?? 1;
        $limit = $_GET['limit'] ?? 50;
        $offset = ($page - 1) * $limit;
        
        $stmt = $pdo->prepare("
            SELECT * FROM vw_mrf_det_with_reviews 
            WHERE active = 1
            ORDER BY createdDate DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
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
    
    // Create new mrf_det record
    $stmt = $pdo->prepare("
        INSERT INTO mrf_det (
            mrf_id, partNumber, qty, reasonCode, trType, ac_code, notes, 
            availableQty, description, validationStatus, validationComment, 
            validatedBy, validatedAt, createdDate, createdBy
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?
        )
    ");
    
    $result = $stmt->execute([
        $input['mrf_id'] ?? null,
        $input['partNumber'] ?? null,
        $input['qty'] ?? null,
        $input['reasonCode'] ?? null,
        $input['trType'] ?? null,
        $input['ac_code'] ?? null,
        $input['notes'] ?? null,
        $input['availableQty'] ?? null,
        $input['description'] ?? null,
        $input['validationStatus'] ?? 'pending',
        $input['validationComment'] ?? null,
        $input['validatedBy'] ?? null,
        $input['validatedAt'] ?? null,
        $input['createdBy'] ?? null
    ]);
    
    if ($result) {
        $id = $pdo->lastInsertId();
        echo json_encode(['id' => $id, 'message' => 'Item created successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create item']);
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
        
        // Update mrf_det table for validation fields
        $validation_fields = [];
        $validation_values = [];
        
        $allowed_validation_fields = [
            'partNumber', 'qty', 'reasonCode', 'trType', 'ac_code', 
            'notes', 'availableQty', 'description', 'validationStatus', 
            'validationComment', 'validatedBy', 'validatedAt'
        ];
        
        foreach ($allowed_validation_fields as $field) {
            if (array_key_exists($field, $input)) {
                $validation_fields[] = "$field = ?";
                $validation_values[] = $input[$field];
            }
        }
        
        if (!empty($validation_fields)) {
            $validation_fields[] = "modifiedDate = NOW()";
            $validation_values[] = $id;
            
            $sql = "UPDATE mrf_det SET " . implode(', ', $validation_fields) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($validation_values);
        }
        
        // Handle review assignment if review fields are provided
        if (isset($input['reviewerId']) && isset($input['department'])) {
            $stmt = $pdo->prepare("
                INSERT INTO mrf_det_reviews (
                    mrf_det_id, reviewerId, department, reviewStatus, reviewNote, 
                    reviewPriority, sentForReviewAt, sentForReviewBy
                ) VALUES (?, ?, ?, 'pending_review', ?, ?, NOW(), ?)
            ");
            
            $stmt->execute([
                $id,
                $input['reviewerId'],
                $input['department'],
                $input['reviewNote'] ?? null,
                $input['reviewPriority'] ?? 'normal',
                $input['sentForReviewBy'] ?? null
            ]);
        }
        
        // Handle review completion
        if (isset($input['reviewDecision']) && isset($input['reviewId'])) {
            $stmt = $pdo->prepare("
                UPDATE mrf_det_reviews 
                SET reviewStatus = 'reviewed', 
                    reviewDecision = ?, 
                    reviewComment = ?, 
                    reviewedAt = NOW()
                WHERE id = ? AND mrf_det_id = ?
            ");
            
            $stmt->execute([
                $input['reviewDecision'],
                $input['reviewComment'] ?? null,
                $input['reviewId'],
                $id
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['message' => 'Item updated successfully']);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update item: ' . $e->getMessage()]);
    }
}

function handleDelete($pdo) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Soft delete by setting active = 0
        $stmt = $pdo->prepare("UPDATE mrf_det SET active = 0, modifiedDate = NOW() WHERE id = ?");
        $result1 = $stmt->execute([$id]);
        
        // Also deactivate any related reviews
        $stmt = $pdo->prepare("UPDATE mrf_det_reviews SET active = 0 WHERE mrf_det_id = ?");
        $result2 = $stmt->execute([$id]);
        
        $pdo->commit();
        
        if ($result1) {
            echo json_encode(['message' => 'Item deleted successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete item']);
        }
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete item: ' . $e->getMessage()]);
    }
}
?>
