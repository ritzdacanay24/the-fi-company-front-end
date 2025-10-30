<?php
/**
 * Get Verification Session
 * Retrieves session data for tablet or desktop
 * Public endpoint - no authentication required for tablet access
 */

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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
    
    $sessionId = $_GET['session_id'] ?? null;
    
    if (empty($sessionId)) {
        throw new Exception('Missing required parameter: session_id');
    }
    
    // Get session data (LEFT JOIN for workflow verification where assignment_id is NULL)
    $stmt = $db->prepare("
        SELECT 
            vs.id,
            vs.assignment_id,
            vs.expected_serials,
            vs.expected_ul,
            vs.session_status,
            vs.created_at,
            vs.expires_at,
            vs.verified_at,
            vs.captured_serials,
            vs.photos,
            vs.serials_found,
            vs.serials_expected,
            vs.match_result,
            vs.error_message,
            sa.eyefi_serial_number,
            sa.wo_number,
            sa.verification_status
        FROM verification_sessions vs
        LEFT JOIN serial_assignments sa ON vs.assignment_id = sa.id
        WHERE vs.id = ?
    ");
    $stmt->execute([$sessionId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        throw new Exception('Session not found');
    }
    
    // Parse JSON fields
    $session['expected_serials'] = json_decode($session['expected_serials'], true);
    $session['captured_serials'] = !empty($session['captured_serials']) ? json_decode($session['captured_serials'], true) : [];
    $session['photos'] = !empty($session['photos']) ? json_decode($session['photos'], true) : [];
    
    // Check if session expired
    $now = time();
    $expiresAt = strtotime($session['expires_at']);
    
    if ($now > $expiresAt && $session['session_status'] === 'active') {
        // Mark session as expired
        $updateStmt = $db->prepare("
            UPDATE verification_sessions 
            SET session_status = 'expired' 
            WHERE id = ?
        ");
        $updateStmt->execute([$sessionId]);
        
        $session['session_status'] = 'expired';
        
        // Log audit trail
        $auditStmt = $db->prepare("
            INSERT INTO verification_audit_log 
            (session_id, assignment_id, action, details)
            VALUES (?, ?, 'session_expired', ?)
        ");
        $auditStmt->execute([
            $sessionId, 
            $session['assignment_id'], 
            json_encode(['expired_at' => date('Y-m-d H:i:s')])
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'session' => $session,
        'is_expired' => ($now > $expiresAt),
        'seconds_remaining' => max(0, $expiresAt - $now),
        'progress' => [
            'found' => (int)$session['serials_found'],
            'expected' => (int)$session['serials_expected'],
            'percentage' => $session['serials_expected'] > 0 
                ? round(($session['serials_found'] / $session['serials_expected']) * 100) 
                : 0
        ]
    ]);
    
} catch (Exception $e) {
    error_log("ERROR in get-session: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
