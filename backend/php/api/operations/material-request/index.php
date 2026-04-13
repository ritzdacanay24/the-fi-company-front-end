<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_SERVER['REQUEST_URI'];
    
    // Parse the path to extract the endpoint
    $pathParts = explode('/', trim($path, '/'));
    
    switch ($method) {
        case 'GET':
            if (strpos($path, '/getAllWithStatus') !== false) {
                handleGetAllWithStatus($pdo);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint not found']);
            }
            break;
            
        case 'PUT':
            if (preg_match('/\/updateStatus\/(\d+)/', $path, $matches)) {
                $id = $matches[1];
                handleUpdateStatus($pdo, $id);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Endpoint not found']);
            }
            break;
            
        case 'POST':
            // Handle other POST endpoints as needed
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
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

function handleGetAllWithStatus($pdo) {
    try {
        $sql = "
            SELECT 
                m.id,
                m.requestor,
                m.lineNumber,
                m.dueDate,
                m.priority,
                m.createdDate,
                m.createdBy,
                m.validated,
                m.pickedCompletedDate,
                m.active,
                m.specialInstructions,
                m.assemblyNumber,
                m.isCableRequest,
                
                -- Status determination (if queue_status field exists, use it; otherwise calculate)
                COALESCE(
                    m.queue_status,
                    CASE 
                        WHEN m.active = 0 THEN 'cancelled'
                        WHEN m.pickedCompletedDate IS NOT NULL THEN 'complete'
                        WHEN m.validated IS NOT NULL THEN 'picking'
                        WHEN EXISTS(
                            SELECT 1 FROM material_request_reviews mr 
                            WHERE mr.mrf_id = m.id 
                            AND mr.review_status IN ('pending_review', 'assigned')
                        ) THEN 'pending_review'
                        WHEN m.validated IS NULL THEN 'under_validation'
                        ELSE 'new'
                    END
                ) as status,
                
                -- Calculate request age in days
                DATEDIFF(NOW(), m.createdDate) as age_days,
                
                -- Get requester information
                u.firstName as requester_first_name,
                u.lastName as requester_last_name,
                CONCAT(u.firstName, ' ', u.lastName) as requester_name,
                u.department as requester_department,
                
                -- Get item counts
                (SELECT COUNT(*) FROM mrf_det WHERE mrf_id = m.id AND active = 1) as item_count,
                (SELECT COUNT(*) FROM mrf_det WHERE mrf_id = m.id AND active = 1 AND validationStatus = 'approved') as validated_items,
                (SELECT COUNT(*) FROM mrf_det WHERE mrf_id = m.id AND active = 1 AND validationStatus = 'rejected') as rejected_items,
                
                -- Get review counts
                (SELECT COUNT(*) FROM material_request_reviews WHERE mrf_id = m.id AND review_status = 'pending_review') as pending_reviews,
                (SELECT COUNT(*) FROM material_request_reviews WHERE mrf_id = m.id AND review_status = 'reviewed') as completed_reviews
                
            FROM mrf m
            LEFT JOIN users u ON m.createdBy = u.id
            WHERE m.active = 1
            ORDER BY m.createdDate DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($results);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch data: ' . $e->getMessage()]);
    }
}

function handleUpdateStatus($pdo, $id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['status'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Status is required']);
            return;
        }
        
        $status = $input['status'];
        $updatedBy = $input['updatedBy'] ?? null;
        
        // Validate status values based on the enum in the database
        $validStatuses = ['new', 'under_validation', 'pending_review', 'approved', 'picking', 'complete', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status value']);
            return;
        }
        
        $pdo->beginTransaction();
        
        // Update the queue_status field in the main mrf table
        $sql = "UPDATE mrf SET queue_status = ?, modifiedDate = NOW()";
        $params = [$status];
        
        if ($updatedBy) {
            $sql .= ", modifiedBy = ?";
            $params[] = $updatedBy;
        }
        
        $sql .= " WHERE id = ?";
        $params[] = $id;
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute($params);
        
        if (!$result) {
            throw new Exception('Failed to update status');
        }
        
        // Log the status change in audit log if table exists
        try {
            $auditSql = "INSERT INTO mrf_status_audit_log (mrf_id, old_status, new_status, changed_by, changed_date) 
                        SELECT ?, 
                               COALESCE((SELECT queue_status FROM mrf WHERE id = ? LIMIT 1), 'new') as old_status,
                               ?, 
                               ?, 
                               NOW()";
            
            $auditStmt = $pdo->prepare($auditSql);
            $auditStmt->execute([$id, $id, $status, $updatedBy]);
        } catch (Exception $e) {
            // Continue if audit table doesn't exist
        }
        
        $pdo->commit();
        
        // Return the updated record
        $stmt = $pdo->prepare("SELECT * FROM mrf WHERE id = ?");
        $stmt->execute([$id]);
        $updatedRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Status updated successfully',
            'data' => $updatedRecord
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update status: ' . $e->getMessage()]);
    }
}
?>
