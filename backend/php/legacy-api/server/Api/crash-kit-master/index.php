<?php
/**
 * Crash Kit Master API
 * 
 * Endpoints for managing crash kit master list
 */

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

use EyefiDb\Databases\DatabaseEyefi;

$database = new DatabaseEyefi();
$db = $database->getConnection();

// Get action from query params
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'getAll':
            handleGetAll($db);
            break;
            
        case 'getActive':
            handleGetActive($db);
            break;
            
        case 'getById':
            handleGetById($db);
            break;
            
        case 'create':
            handleCreate($db);
            break;
            
        case 'update':
            handleUpdate($db);
            break;
            
        case 'delete':
            handleDelete($db);
            break;
            
        case 'toggleActive':
            handleToggleActive($db);
            break;
            
        case 'createMRF':
            handleCreateMRF($db);
            break;
            
        case 'getMRFByUser':
            handleGetMRFByUser($db);
            break;
            
        case 'getMRFByWorkOrder':
            handleGetMRFByWorkOrder($db);
            break;
            
        default:
            throw new Exception('Invalid action', 400);
    }
} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Get all crash kit items
 */
function handleGetAll($db) {
    $stmt = $db->prepare("
        SELECT 
            id,
            pt_part,
            FULLDESC,
            active,
            created_date,
            updated_date
        FROM crash_kit_master
        ORDER BY pt_part ASC
    ");
    
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($items);
}

/**
 * Get only active crash kit items
 */
function handleGetActive($db) {
    $stmt = $db->prepare("
        SELECT 
            id,
            pt_part,
            FULLDESC,
            active,
            created_date,
            updated_date
        FROM crash_kit_master
        WHERE active = 1
        ORDER BY pt_part ASC
    ");
    
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($items);
}

/**
 * Get crash kit item by ID
 */
function handleGetById($db) {
    if (!isset($_GET['id'])) {
        throw new Exception('Missing required parameter: id', 400);
    }
    
    $id = (int)$_GET['id'];
    
    $stmt = $db->prepare("
        SELECT 
            id,
            pt_part,
            FULLDESC,
            active,
            created_date,
            updated_date
        FROM crash_kit_master
        WHERE id = ?
    ");
    
    $stmt->execute([$id]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$item) {
        throw new Exception('Item not found', 404);
    }
    
    echo json_encode($item);
}

/**
 * Create a new crash kit item
 */
function handleCreate($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($input['pt_part']) || empty($input['pt_part'])) {
        throw new Exception('Missing required field: pt_part', 400);
    }
    
    $stmt = $db->prepare("
        INSERT INTO crash_kit_master (pt_part, FULLDESC, active)
        VALUES (:pt_part, :fulldesc, :active)
    ");
    
    $active = isset($input['active']) ? (int)$input['active'] : 1;
    $fulldesc = $input['FULLDESC'] ?? '';
    
    $stmt->bindParam(':pt_part', $input['pt_part']);
    $stmt->bindParam(':fulldesc', $fulldesc);
    $stmt->bindParam(':active', $active, PDO::PARAM_INT);
    
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'id' => (int)$db->lastInsertId(),
        'message' => 'Crash kit item created successfully'
    ]);
}

/**
 * Update a crash kit item
 */
function handleUpdate($db) {
    if (!isset($_GET['id'])) {
        throw new Exception('Missing required parameter: id', 400);
    }
    
    $id = (int)$_GET['id'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare("
        UPDATE crash_kit_master
        SET 
            pt_part = :pt_part,
            FULLDESC = :fulldesc,
            active = :active
        WHERE id = :id
    ");
    
    $active = isset($input['active']) ? (int)$input['active'] : 1;
    $fulldesc = $input['FULLDESC'] ?? '';
    
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->bindParam(':pt_part', $input['pt_part']);
    $stmt->bindParam(':fulldesc', $fulldesc);
    $stmt->bindParam(':active', $active, PDO::PARAM_INT);
    
    $stmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Crash kit item updated successfully'
    ]);
}

/**
 * Delete a crash kit item
 */
function handleDelete($db) {
    if (!isset($_GET['id'])) {
        throw new Exception('Missing required parameter: id', 400);
    }
    
    $id = (int)$_GET['id'];
    
    $stmt = $db->prepare("DELETE FROM crash_kit_master WHERE id = ?");
    $stmt->execute([$id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Crash kit item deleted successfully'
    ]);
}

/**
 * Toggle active status
 */
function handleToggleActive($db) {
    if (!isset($_GET['id'])) {
        throw new Exception('Missing required parameter: id', 400);
    }
    
    $id = (int)$_GET['id'];
    
    $stmt = $db->prepare("
        UPDATE crash_kit_master
        SET active = NOT active
        WHERE id = ?
    ");
    
    $stmt->execute([$id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Crash kit item status updated successfully'
    ]);
}

/**
 * Create Material Request Form from crash kit items
 */
function handleCreateMRF($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['main']) || !isset($input['details'])) {
        throw new Exception('Missing required fields: main and details', 400);
    }
    
    $db->beginTransaction();
    
    try {
        // Insert into mrf table
        $stmt = $db->prepare("
            INSERT INTO mrf (
                active, assemblyNumber, createdBy, createdDate, deleteReason, 
                deleteReasonBy, deleteReasonDate, dueDate, info, isCableRequest, 
                lineNumber, pickList, pickedCompletedDate, priority, requestor, 
                specialInstructions, validated
            ) VALUES (
                :active, :assemblyNumber, :createdBy, :createdDate, :deleteReason,
                :deleteReasonBy, :deleteReasonDate, :dueDate, :info, :isCableRequest,
                :lineNumber, :pickList, :pickedCompletedDate, :priority, :requestor,
                :specialInstructions, :validated
            )
        ");
        
        $main = $input['main'];
        $stmt->execute([
            ':active' => $main['active'] ?? 1,
            ':assemblyNumber' => $main['assemblyNumber'] ?? '',
            ':createdBy' => $main['createdBy'] ?? null,
            ':createdDate' => $main['createdDate'] ?? date('Y-m-d H:i:s'),
            ':deleteReason' => $main['deleteReason'] ?? '',
            ':deleteReasonBy' => $main['deleteReasonBy'] ?? null,
            ':deleteReasonDate' => $main['deleteReasonDate'] ?? null,
            ':dueDate' => $main['dueDate'] ?? null,
            ':info' => $main['info'] ?? '',
            ':isCableRequest' => $main['isCableRequest'] ?? '',
            ':lineNumber' => $main['lineNumber'] ?? '',
            ':pickList' => $main['pickList'] ?? '',
            ':pickedCompletedDate' => $main['pickedCompletedDate'] ?? null,
            ':priority' => $main['priority'] ?? 'Low',
            ':requestor' => $main['requestor'] ?? '',
            ':specialInstructions' => $main['specialInstructions'] ?? '',
            ':validated' => $main['validated'] ?? null
        ]);
        
        $mrfId = $db->lastInsertId();
        
        // Insert details into mrf_det table
        $detailStmt = $db->prepare("
            INSERT INTO mrf_det (
                mrf_id, partNumber, qty, isDuplicate, reasonCode, message, 
                hasError, availableQty, description, createdBy, createdDate, 
                cost, ac_code, notes, trType, active
            ) VALUES (
                :mrf_id, :partNumber, :qty, :isDuplicate, :reasonCode, :message,
                :hasError, :availableQty, :description, :createdBy, :createdDate,
                :cost, :ac_code, :notes, :trType, 1
            )
        ");
        
        foreach ($input['details'] as $detail) {
            $detailStmt->execute([
                ':mrf_id' => $mrfId,
                ':partNumber' => $detail['partNumber'] ?? '',
                ':qty' => $detail['qty'] ?? 0,
                ':isDuplicate' => $detail['isDuplicate'] ?? 0,
                ':reasonCode' => $detail['reasonCode'] ?? '',
                ':message' => $detail['message'] ?? '',
                ':hasError' => $detail['hasError'] ?? 0,
                ':availableQty' => $detail['availableQty'] ?? 0,
                ':description' => $detail['description'] ?? '',
                ':createdBy' => $detail['createdBy'] ?? null,
                ':createdDate' => $detail['createdDate'] ?? date('Y-m-d H:i:s'),
                ':cost' => $detail['cost'] ?? 0,
                ':ac_code' => $detail['ac_code'] ?? null,
                ':notes' => $detail['notes'] ?? '',
                ':trType' => $detail['trType'] ?? null
            ]);
        }
        
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'insertId' => $mrfId,
            'message' => 'Material Request Form created successfully'
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * Get MRF requests by user ID
 */
function handleGetMRFByUser($db) {
    if (!isset($_GET['userId'])) {
        throw new Exception('Missing required parameter: userId', 400);
    }
    
    $userId = (int)$_GET['userId'];
    
    $stmt = $db->prepare("
        SELECT 
            m.id,
            m.requestor,
            m.priority,
            m.createdDate,
            m.dueDate,
            m.pickList,
            m.pickedCompletedDate,
            m.active,
            COALESCE(
                m.queue_status,
                CASE 
                    WHEN m.active = 0 THEN 'cancelled'
                    WHEN m.pickedCompletedDate IS NOT NULL THEN 'complete'
                    WHEN m.validated IS NOT NULL THEN 'picking'
                    ELSE 'new'
                END
            ) as status,
            (SELECT COUNT(*) FROM mrf_det WHERE mrf_id = m.id AND active = 1) as item_count
        FROM mrf m
        WHERE m.createdBy = ?
        ORDER BY m.createdDate DESC
    ");
    
    $stmt->execute([$userId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $results,
        'total' => count($results)
    ]);
}

/**
 * Get MRF requests by work order ID
 */
function handleGetMRFByWorkOrder($db) {
    if (!isset($_GET['workOrderId'])) {
        throw new Exception('Missing required parameter: workOrderId', 400);
    }
    
    $workOrderId = $_GET['workOrderId'];
    
    $stmt = $db->prepare("
        SELECT 
            m.id,
            m.requestor,
            m.priority,
            m.createdDate,
            m.dueDate,
            m.pickList,
            m.pickedCompletedDate,
            m.active,
            COALESCE(
                m.queue_status,
                CASE 
                    WHEN m.active = 0 THEN 'cancelled'
                    WHEN m.pickedCompletedDate IS NOT NULL THEN 'complete'
                    WHEN m.validated IS NOT NULL THEN 'picking'
                    ELSE 'new'
                END
            ) as status,
            (SELECT COUNT(*) FROM mrf_det WHERE mrf_id = m.id AND active = 1) as item_count
        FROM mrf m
        WHERE m.pickList = ?
        ORDER BY m.createdDate DESC
    ");
    
    $stmt->execute([$workOrderId]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $results,
        'total' => count($results)
    ]);
}
