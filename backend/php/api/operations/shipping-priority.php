<?php
require_once '../../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['updateShippingPriority']) && $input['updateShippingPriority']) {
        updateShippingPriority($input);
    } elseif (isset($input['getShippingPriorities']) && $input['getShippingPriorities']) {
        getShippingPriorities();
    } elseif (isset($input['removeShippingPriority']) && $input['removeShippingPriority']) {
        removeShippingPriority($input);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function updateShippingPriority($input) {
    global $pdo;
    
    $orderId = $input['orderId'] ?? null;
    $salesOrderNumber = $input['salesOrderNumber'] ?? null;
    $salesOrderLine = $input['salesOrderLine'] ?? null;
    $priority = intval($input['priority'] ?? 0);
    $notes = $input['notes'] ?? null;
    $userId = $_SESSION['user_id'] ?? 'system';
    
    if (!$orderId || !$salesOrderNumber) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID and Sales Order Number are required']);
        return;
    }
    
    try {
        $pdo->beginTransaction();
        
        if ($priority > 0) {
            // Check for duplicate priority levels
            $checkPrioritySql = "SELECT sales_order_number, sales_order_line 
                               FROM shipping_priorities 
                               WHERE priority_level = :priority AND order_id != :orderId AND is_active = TRUE";
            $checkStmt = $pdo->prepare($checkPrioritySql);
            $checkStmt->execute([
                ':priority' => $priority,
                ':orderId' => $orderId
            ]);
            
            $existingOrder = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($existingOrder) {
                $pdo->rollBack();
                $conflictOrder = $existingOrder['sales_order_number'];
                if ($existingOrder['sales_order_line']) {
                    $conflictOrder .= '-' . $existingOrder['sales_order_line'];
                }
                http_response_code(409);
                echo json_encode([
                    'error' => "Priority {$priority} is already assigned to order {$conflictOrder}"
                ]);
                return;
            }
            
            // Check if order already has a priority - update existing or create new
            $existingSql = "SELECT id FROM shipping_priorities 
                          WHERE order_id = :orderId AND is_active = TRUE";
            $existingStmt = $pdo->prepare($existingSql);
            $existingStmt->execute([':orderId' => $orderId]);
            $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                // Update existing priority
                $updateSql = "UPDATE shipping_priorities 
                            SET priority_level = :priority,
                                notes = :notes,
                                updated_at = NOW(),
                                updated_by = :userId
                            WHERE id = :id";
                
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    ':priority' => $priority,
                    ':notes' => $notes,
                    ':userId' => $userId,
                    ':id' => $existing['id']
                ]);
            } else {
                // Create new priority record
                $insertSql = "INSERT INTO shipping_priorities 
                            (order_id, sales_order_number, sales_order_line, priority_level, notes, created_by, updated_by) 
                            VALUES (:orderId, :salesOrderNumber, :salesOrderLine, :priority, :notes, :userId, :userId)";
                
                $insertStmt = $pdo->prepare($insertSql);
                $insertStmt->execute([
                    ':orderId' => $orderId,
                    ':salesOrderNumber' => $salesOrderNumber,
                    ':salesOrderLine' => $salesOrderLine,
                    ':priority' => $priority,
                    ':notes' => $notes,
                    ':userId' => $userId
                ]);
            }
        } else {
            // Priority 0 means remove priority - deactivate the record
            $deactivateSql = "UPDATE shipping_priorities 
                            SET is_active = FALSE,
                                updated_at = NOW(),
                                updated_by = :userId
                            WHERE order_id = :orderId AND is_active = TRUE";
            
            $deactivateStmt = $pdo->prepare($deactivateSql);
            $deactivateStmt->execute([
                ':userId' => $userId,
                ':orderId' => $orderId
            ]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Priority updated successfully',
            'orderId' => $orderId,
            'priority' => $priority
        ]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function getShippingPriorities() {
    global $pdo;
    
    try {
        $sql = "SELECT * FROM active_shipping_priorities ORDER BY priority_level ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        
        $priorities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $priorities
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}

function removeShippingPriority($input) {
    global $pdo;
    
    $orderId = $input['orderId'] ?? null;
    $userId = $_SESSION['user_id'] ?? 'system';
    
    if (!$orderId) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID is required']);
        return;
    }
    
    try {
        $sql = "UPDATE shipping_priorities 
                SET is_active = FALSE,
                    updated_at = NOW(),
                    updated_by = :userId
                WHERE order_id = :orderId AND is_active = TRUE";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':userId' => $userId,
            ':orderId' => $orderId
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Priority removed successfully',
            'orderId' => $orderId
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}
?>
