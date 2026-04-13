<?php
/**
 * Create Verification Session
 * Creates a new session for tablet companion verification
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
    
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);
    
    // Debug logging
    error_log("=== CREATE SESSION DEBUG ===");
    error_log("Raw Input: " . $rawInput);
    error_log("Decoded Data: " . print_r($data, true));
    error_log("JSON Error: " . json_last_error_msg());
    
    // Validate required fields
    // For batch verification: expected_serials (array) OR expected_serial (single - for backward compatibility)
    $expectedSerials = [];
    
    if (!empty($data['expected_serials']) && is_array($data['expected_serials'])) {
        // Batch mode: array of serials
        $expectedSerials = $data['expected_serials'];
    } elseif (!empty($data['expected_serial'])) {
        // Single mode: backward compatibility
        $expectedSerials = [$data['expected_serial']];
    } else {
        throw new Exception('Missing required field: expected_serials (array) or expected_serial (string)');
    }
    
    if (empty($expectedSerials)) {
        throw new Exception('At least one serial number must be provided');
    }
    
    $serialsExpected = count($expectedSerials);
    $expectedSerialsJson = json_encode($expectedSerials);
    $expectedUl = $data['expected_ul'] ?? null;
    $createdBy = $data['created_by'] ?? 'system';
    $workflowSessionId = $data['workflow_session_id'] ?? null; // Get workflow session ID
    
    // assignment_id is optional - may be 0 or null for workflow verification (before DB save)
    // Convert 0 to NULL to avoid foreign key constraint issues
    $assignmentId = isset($data['assignment_id']) ? (int)$data['assignment_id'] : null;
    if ($assignmentId === 0) {
        $assignmentId = null;
    }
    
    // If assignment_id provided and > 0, verify it exists
    if ($assignmentId && $assignmentId > 0) {
        $checkStmt = $db->prepare("SELECT id, eyefi_serial_number FROM serial_assignments WHERE id = ?");
        $checkStmt->execute([$assignmentId]);
        $assignment = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$assignment) {
            throw new Exception('Assignment not found');
        }
    }
    
    // Generate unique session ID (UUID v4)
    $sessionId = sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    
    // Session expires in 5 minutes
    $expiresAt = date('Y-m-d H:i:s', strtotime('+5 minutes'));
    
    $db->beginTransaction();
    
    // Create verification session (assignment_id can be NULL for workflow verification)
    $insertStmt = $db->prepare("
        INSERT INTO verification_sessions 
        (id, assignment_id, expected_serials, expected_ul, workflow_session_id, session_status, expires_at, created_at, serials_expected)
        VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), ?)
    ");
    $insertStmt->execute([$sessionId, $assignmentId, $expectedSerialsJson, $expectedUl, $workflowSessionId, $expiresAt, $serialsExpected]);
    
    // Only update assignment if it exists (not NULL/0)
    if ($assignmentId && $assignmentId > 0) {
        $updateStmt = $db->prepare("
            UPDATE serial_assignments 
            SET verification_session_id = ?, 
                verification_status = 'pending',
                requires_verification = 1
            WHERE id = ?
        ");
        $updateStmt->execute([$sessionId, $assignmentId]);
    }
    
    // Log audit trail
    $auditStmt = $db->prepare("
        INSERT INTO verification_audit_log 
        (session_id, assignment_id, action, details, performed_by)
        VALUES (?, ?, 'session_created', ?, ?)
    ");
    $auditDetails = json_encode([
        'expected_serials' => $expectedSerials,
        'serials_count' => $serialsExpected,
        'expected_ul' => $expectedUl,
        'expires_at' => $expiresAt,
        'workflow_mode' => ($assignmentId === null || $assignmentId === 0)
    ]);
    $auditStmt->execute([$sessionId, $assignmentId, $auditDetails, $createdBy]);
    
    $db->commit();
    
    // Return session info with QR code data
    echo json_encode([
        'success' => true,
        'session' => [
            'session_id' => $sessionId,
            'assignment_id' => $assignmentId,
            'expected_serials' => $expectedSerials,
            'serials_expected' => $serialsExpected,
            'serials_found' => 0,
            'expected_ul' => $expectedUl,
            'expires_at' => $expiresAt,
            'status' => 'pending',
            'matched' => false,
            'qr_data' => json_encode([
                'session_id' => $sessionId,
                'expected_serials' => $expectedSerials,
                'serials_count' => $serialsExpected,
                'api_url' => 'http://' . $_SERVER['HTTP_HOST'] . '/backend/api/verification-session/submit-photo.php'
            ])
        ]
    ]);
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    
    error_log("ERROR in create-session: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
