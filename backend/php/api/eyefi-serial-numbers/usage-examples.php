<?php
/**
 * EXAMPLES: Using EyeFiSerialHelper with Transactional Safety
 * 
 * These examples show how to properly handle EyeFi serial tracking
 * with full transactional support - if anything fails, everything rolls back.
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../eyefi-serial-numbers/EyeFiSerialHelper.php';

$eyefiHelper = new EyeFiSerialHelper($pdo);

// =====================================================
// Example 1: CREATE with Transactional Safety
// =====================================================

// Method A: Simple approach (no transaction wrapper)
function createAGSSimple($pdo, $eyefiHelper, $data) {
    // Save AGS record
    $stmt = $pdo->prepare("INSERT INTO ags_serial (serialNumber, ...) VALUES (?, ...)");
    $stmt->execute([$data['serialNumber'], ...]);
    $agsId = $pdo->lastInsertId();
    
    // Mark serial as used
    $result = $eyefiHelper->markUsed($data['serialNumber'], 'ags_serial', $agsId);
    
    if (!$result['success']) {
        // PROBLEM: AGS record already saved, but serial not marked!
        // Would need to manually delete the AGS record here
        error_log("Failed to mark serial, but AGS already saved!");
    }
    
    return $agsId;
}

// Method B: Transactional approach (RECOMMENDED)
function createAGSTransactional($pdo, $eyefiHelper, $data) {
    $agsId = null;
    
    $result = $eyefiHelper->transactionalSaveWithSerial(
        // Callback that does the actual save
        function($pdo) use ($data) {
            $stmt = $pdo->prepare("
                INSERT INTO ags_serial (serialNumber, model, location, status, created_at) 
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $data['serialNumber'],
                $data['model'],
                $data['location'],
                $data['status']
            ]);
            
            return [
                'success' => true,
                'id' => $pdo->lastInsertId()
            ];
        },
        $data['serialNumber'],  // Serial to mark
        'ags_serial',           // Table name
        $agsId                  // Will be populated with new ID
    );
    
    if ($result['success']) {
        return ['success' => true, 'id' => $result['id']];
    } else {
        // Everything rolled back automatically!
        return ['success' => false, 'message' => $result['message']];
    }
}

// =====================================================
// Example 2: UPDATE with Transactional Safety
// =====================================================

function updateAGSTransactional($pdo, $eyefiHelper, $agsId, $data) {
    // Get the old record first
    $stmt = $pdo->prepare("SELECT serialNumber FROM ags_serial WHERE id = ?");
    $stmt->execute([$agsId]);
    $oldRecord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $oldSerial = $oldRecord['serialNumber'];
    $newSerial = $data['serialNumber'];
    
    // If serial didn't change, just update normally
    if ($oldSerial === $newSerial) {
        $stmt = $pdo->prepare("UPDATE ags_serial SET model = ?, location = ? WHERE id = ?");
        $stmt->execute([$data['model'], $data['location'], $agsId]);
        return ['success' => true, 'id' => $agsId];
    }
    
    // If serial changed, use transaction
    $result = $eyefiHelper->transactionalSaveWithSerial(
        function($pdo) use ($agsId, $data) {
            $stmt = $pdo->prepare("
                UPDATE ags_serial 
                SET serialNumber = ?, model = ?, location = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $data['serialNumber'],
                $data['model'],
                $data['location'],
                $agsId
            ]);
            
            return ['success' => true, 'id' => $agsId];
        },
        $newSerial,    // New serial to mark
        'ags_serial',
        $agsId
    );
    
    // Also release old serial
    if ($result['success'] && !empty($oldSerial)) {
        $eyefiHelper->markAvailable($oldSerial, 'ags_serial', $agsId);
    }
    
    return $result;
}

// =====================================================
// Example 3: DELETE with Transactional Safety
// =====================================================

function deleteAGSTransactional($pdo, $eyefiHelper, $agsId) {
    // Get the record first
    $stmt = $pdo->prepare("SELECT serialNumber FROM ags_serial WHERE id = ?");
    $stmt->execute([$agsId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        return ['success' => false, 'message' => 'Record not found'];
    }
    
    // Delete with transaction
    $result = $eyefiHelper->transactionalDeleteWithSerial(
        function($pdo) use ($agsId) {
            $stmt = $pdo->prepare("DELETE FROM ags_serial WHERE id = ?");
            $success = $stmt->execute([$agsId]);
            
            return [
                'success' => $success,
                'message' => $success ? 'Deleted' : 'Failed to delete'
            ];
        },
        $record['serialNumber'],  // Serial to release
        'ags_serial',
        $agsId
    );
    
    return $result;
}

// =====================================================
// Example 4: UL Label Usage
// =====================================================

function createULUsageTransactional($pdo, $eyefiHelper, $data) {
    $usageId = null;
    
    $result = $eyefiHelper->transactionalSaveWithSerial(
        function($pdo) use ($data) {
            $stmt = $pdo->prepare("
                INSERT INTO ul_label_usages 
                (ul_number, eyefi_serial_number, work_order, quantity_used, date_used) 
                VALUES (?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $data['ul_number'],
                $data['eyefi_serial_number'],
                $data['work_order'],
                $data['quantity_used']
            ]);
            
            return ['success' => true, 'id' => $pdo->lastInsertId()];
        },
        $data['eyefi_serial_number'],
        'ul_label_usages',
        $usageId
    );
    
    return $result;
}

// =====================================================
// Example 5: REST API Endpoint Implementation
// =====================================================

// POST /api/operations/ags-serial (Create)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'create') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Validate EyeFi serial exists and is available
    if (!empty($data['serialNumber'])) {
        $stmt = $pdo->prepare("
            SELECT status FROM eyefi_serial_numbers 
            WHERE serial_number = ?
        ");
        $stmt->execute([$data['serialNumber']]);
        $serial = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$serial) {
            echo json_encode(['success' => false, 'message' => 'EyeFi serial not found']);
            exit;
        }
        
        if ($serial['status'] !== 'available') {
            echo json_encode(['success' => false, 'message' => 'EyeFi serial is not available']);
            exit;
        }
    }
    
    // Create with transactional safety
    $result = createAGSTransactional($pdo, $eyefiHelper, $data);
    
    echo json_encode($result);
    exit;
}

// PUT /api/operations/ags-serial?id=123 (Update)
if ($_SERVER['REQUEST_METHOD'] === 'PUT' && $action === 'update') {
    $agsId = $_GET['id'];
    $data = json_decode(file_get_contents('php://input'), true);
    
    $result = updateAGSTransactional($pdo, $eyefiHelper, $agsId, $data);
    
    echo json_encode($result);
    exit;
}

// DELETE /api/operations/ags-serial?id=123 (Delete)
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $action === 'delete') {
    $agsId = $_GET['id'];
    
    $result = deleteAGSTransactional($pdo, $eyefiHelper, $agsId);
    
    echo json_encode($result);
    exit;
}

// =====================================================
// Example 6: Error Handling
// =====================================================

function createAGSWithErrorHandling($pdo, $eyefiHelper, $data) {
    $agsId = null;
    
    $result = $eyefiHelper->transactionalSaveWithSerial(
        function($pdo) use ($data) {
            // This might throw an exception
            $stmt = $pdo->prepare("INSERT INTO ags_serial (...) VALUES (...)");
            $stmt->execute([...]);
            
            return ['success' => true, 'id' => $pdo->lastInsertId()];
        },
        $data['serialNumber'],
        'ags_serial',
        $agsId
    );
    
    // Check result
    if ($result['success']) {
        // Success! Both AGS record saved AND serial marked as used
        return [
            'success' => true,
            'id' => $result['id'],
            'message' => 'AGS record created successfully'
        ];
    } else {
        // Failure! Everything was rolled back automatically
        error_log("Failed to create AGS: {$result['message']}");
        
        return [
            'success' => false,
            'message' => $result['message']
        ];
    }
}

// =====================================================
// Example 7: Testing Transaction Rollback
// =====================================================

function testTransactionRollback($pdo, $eyefiHelper) {
    echo "Testing transaction rollback...\n\n";
    
    // Test with invalid serial
    $result = $eyefiHelper->transactionalSaveWithSerial(
        function($pdo) {
            echo "Inserting AGS record...\n";
            $stmt = $pdo->prepare("
                INSERT INTO ags_serial (serialNumber, model) 
                VALUES (?, ?)
            ");
            $stmt->execute(['eyefi-INVALID', 'Test Model']);
            echo "AGS record inserted with ID: " . $pdo->lastInsertId() . "\n";
            
            return ['success' => true, 'id' => $pdo->lastInsertId()];
        },
        'eyefi-INVALID',  // This serial doesn't exist
        'ags_serial',
        $agsId
    );
    
    if (!$result['success']) {
        echo "✅ Transaction rolled back correctly!\n";
        echo "Message: {$result['message']}\n\n";
        
        // Verify AGS record was NOT created
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM ags_serial WHERE serialNumber = 'eyefi-INVALID'");
        $stmt->execute();
        $count = $stmt->fetchColumn();
        
        if ($count == 0) {
            echo "✅ AGS record was properly rolled back (not in database)\n";
        } else {
            echo "❌ ERROR: AGS record still exists in database!\n";
        }
    } else {
        echo "❌ ERROR: Transaction should have failed!\n";
    }
}

// Run test
// testTransactionRollback($pdo, $eyefiHelper);
