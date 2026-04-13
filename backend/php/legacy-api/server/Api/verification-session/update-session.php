<?php
/**
 * Update Verification Session
 * Updates session with verification results
 */

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $sessionId = $data['session_id'] ?? null;
    $capturedSerial = $data['captured_serial'] ?? null;
    $matchResult = $data['match_result'] ?? null;
    $photoPath = $data['photo_path'] ?? null;
    $errorMessage = $data['error_message'] ?? null;
    $performedBy = $data['performed_by'] ?? 'system';
    
    if (empty($sessionId)) {
        throw new Exception('Missing required parameter: session_id');
    }
    
    // Get session
    $stmt = $db->prepare("SELECT * FROM verification_sessions WHERE id = ?");
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        throw new Exception('Session not found');
    }
    
    if ($session['session_status'] !== 'active') {
        throw new Exception('Session is not active');
    }
    
    $db->beginTransaction();
    
    // Update session
    $updateFields = [];
    $updateParams = [];
    
    if ($capturedSerial !== null) {
        $updateFields[] = "captured_serial = ?";
        $updateParams[] = $capturedSerial;
    }
    
    if ($matchResult !== null) {
        $updateFields[] = "match_result = ?";
        $updateParams[] = $matchResult;
    }
    
    if ($photoPath !== null) {
        $updateFields[] = "photo_path = ?";
        $updateParams[] = $photoPath;
    }
    
    if ($errorMessage !== null) {
        $updateFields[] = "error_message = ?";
        $updateParams[] = $errorMessage;
    }
    
    // If verification is complete, update status
    if ($matchResult === 'match' || $matchResult === 'mismatch') {
        $updateFields[] = "session_status = 'completed'";
        $updateFields[] = "verified_at = NOW()";
        
        // Update assignment
        $verificationStatus = ($matchResult === 'match') ? 'verified' : 'failed';
        $assignmentUpdate = $db->prepare("
            UPDATE serial_assignments 
            SET verification_status = ?,
                verification_photo = ?,
                verified_at = NOW(),
                verified_by = ?
            WHERE id = ?
        ");
        $assignmentUpdate->execute([
            $verificationStatus, 
            $photoPath, 
            $performedBy,
            $session['assignment_id']
        ]);
    }
    
    if (!empty($updateFields)) {
        $updateParams[] = $sessionId;
        $updateStmt = $db->prepare("
            UPDATE verification_sessions 
            SET " . implode(', ', $updateFields) . "
            WHERE id = ?
        ");
        $updateStmt->execute($updateParams);
    }
    
    // Log audit trail
    $auditStmt = $db->prepare("
        INSERT INTO verification_audit_log 
        (session_id, assignment_id, action, details, performed_by)
        VALUES (?, ?, 'verification_updated', ?, ?)
    ");
    $auditDetails = json_encode([
        'captured_serial' => $capturedSerial,
        'match_result' => $matchResult,
        'photo_path' => $photoPath,
        'error_message' => $errorMessage
    ]);
    $auditStmt->execute([
        $sessionId, 
        $session['assignment_id'], 
        $auditDetails, 
        $performedBy
    ]);
    
    $db->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Session updated successfully',
        'session_id' => $sessionId
    ]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log("ERROR in update-session: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
