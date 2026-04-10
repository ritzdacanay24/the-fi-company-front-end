<?php
// PHP query for getAllWithStatus method
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

/**
 * Get all material requests with their current status for Kanban board
 * This includes review counts and summary information
 */
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


if (ISSET($_GET['id'])) {
    handleUpdateStatus($db, $_GET['id']);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}
?>
