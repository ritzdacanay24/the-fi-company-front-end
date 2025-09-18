<?php
/**
 * Badge Scanning API for Training Management
 * Handles real-time badge scanning and attendance tracking
 * 
 * @author Generated for Training Management System
 * @date 2025-09-17
 */

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


class BadgeScanAPI {
    private $db;
    
    public function __construct() {
        
        $db_connect = new DatabaseEyefi();
        $db = $db_connect->getConnection();
        $this->db = $db;
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $input = json_decode(file_get_contents('php://input'), true);
        
        try {
            switch ($method) {
                case 'POST':
                    $this->processBadgeScan($input);
                    break;
                case 'GET':
                    $this->getRecentScans();
                    break;
                default:
                    $this->sendResponse(405, ['error' => 'Method not allowed']);
            }
        } catch (Exception $e) {
            error_log("Badge Scan API Error: " . $e->getMessage());
            $this->sendResponse(500, ['error' => 'Internal server error', 'details' => $e->getMessage()]);
        }
    }
    
    private function processBadgeScan($data) {
        // Validate input
        if (!isset($data['sessionId']) || !isset($data['badgeNumber'])) {
            $this->sendResponse(400, [
                'success' => false,
                'message' => 'Missing required fields: sessionId and badgeNumber',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => false
            ]);
            return;
        }
        
        $sessionId = $data['sessionId'];
        $badgeNumber = trim($data['badgeNumber']);
        
        // Sanitize badge number (remove any non-alphanumeric characters except dashes)
        $badgeNumber = preg_replace('/[^a-zA-Z0-9\-]/', '', $badgeNumber);
        
        if (empty($badgeNumber)) {
            $this->sendResponse(400, [
                'success' => false,
                'message' => 'Invalid badge number format',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => false
            ]);
            return;
        }
        
        // Find employee by badge number (try multiple badge field variations)
        $employeeQuery = "
            SELECT * FROM db.users 
            WHERE (card_number = ? OR card_number = ? OR card_number = ?) 
            AND is_active = 1
            LIMIT 1
        ";
        
        $stmt = $this->db->prepare($employeeQuery);
        $stmt->execute([$badgeNumber, $badgeNumber, $badgeNumber]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            // Log the failed scan attempt
            $this->logScanAttempt($sessionId, $badgeNumber, 'BADGE_NOT_FOUND', $_SERVER['REMOTE_ADDR'] ?? null);
            
            $this->sendResponse(404, [
                'success' => false,
                'message' => "Badge number '{$badgeNumber}' not found in employee database",
                'alreadySignedIn' => false,
                'isExpectedAttendee' => false
            ]);
            return;
        }
        
        // Verify session exists and is active
        $sessionQuery = "
            SELECT * FROM training_sessions 
            WHERE id = ? AND status IN ('scheduled', 'in-progress')
        ";
        
        $stmt = $this->db->prepare($sessionQuery);
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$session) {
            // Log session not found
            $this->logScanAttempt($sessionId, $badgeNumber, 'SESSION_NOT_FOUND', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id'] ?? null);
            
            $this->sendResponse(404, [
                'success' => false,
                'message' => 'Training session not found or not active',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => false
            ]);
            return;
        }
        
        // Check if employee is expected for this session
        $expectedQuery = "
            SELECT * FROM training_attendees 
            WHERE session_id = ? AND employee_id = ?
        ";
        
        $stmt = $this->db->prepare($expectedQuery);
        $stmt->execute([$sessionId, $employee['id']]);
        $isExpected = $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        
        // Check if already signed in
        $attendanceQuery = "
            SELECT * FROM training_attendance 
            WHERE session_id = ? AND employee_id = ?
        ";
        
        $stmt = $this->db->prepare($attendanceQuery);
        $stmt->execute([$sessionId, $employee['id']]);
        $existingAttendance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingAttendance) {
            // Log already signed in attempt
            $this->logScanAttempt($sessionId, $badgeNumber, 'ALREADY_SIGNED_IN', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(200, [
                'success' => false,
                'message' => $employee['first_name'] . ' ' . $employee['last_name'] . ' is already signed in for this training session',
                'alreadySignedIn' => true,
                'isExpectedAttendee' => $isExpected,
                'signInTime' => $existingAttendance['sign_in_time'],
                'employee' => $this->formatEmployee($employee)
            ]);
            return;
        }
        
        // Calculate timing details
        $sessionStart = new DateTime($session['date'] . ' ' . $session['start_time']);
        $sessionEnd = new DateTime($session['date'] . ' ' . $session['end_time']);
        $signInTime = new DateTime();
        
        // Check if signing in too early (more than 30 minutes before session)
        $thirtyMinutesBefore = clone $sessionStart;
        $thirtyMinutesBefore->modify('-30 minutes');
        
        if ($signInTime < $thirtyMinutesBefore) {
            // Log too early attempt
            $this->logScanAttempt($sessionId, $badgeNumber, 'TOO_EARLY', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(400, [
                'success' => false,
                'message' => 'Training session sign-in opens 30 minutes before scheduled start time',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => $isExpected,
                'sessionStartTime' => $sessionStart->format('Y-m-d H:i:s'),
                'employee' => $this->formatEmployee($employee)
            ]);
            return;
        }
        
        // Check if signing in too late (after session end)
        $twoHoursAfter = clone $sessionEnd;
        $twoHoursAfter->modify('+2 hours');
        
        if ($signInTime > $twoHoursAfter) {
            // Log too late attempt
            $this->logScanAttempt($sessionId, $badgeNumber, 'TOO_LATE', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(400, [
                'success' => false,
                'message' => 'Training session sign-in window has closed',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => $isExpected,
                'sessionEndTime' => $sessionEnd->format('Y-m-d H:i:s'),
                'employee' => $this->formatEmployee($employee)
            ]);
            return;
        }
        
        // Determine if this is a late arrival
        $isLateArrival = $signInTime > $sessionEnd; // Signing in after session officially ended
        
        // Calculate attendance duration (time from session start to sign-in, or full session if signing in late)
        $attendanceDuration = null;
        if ($signInTime >= $sessionStart && $signInTime <= $sessionEnd) {
            // Signed in during session - calculate time from start to sign-in
            $interval = $sessionStart->diff($signInTime);
            $attendanceDuration = $interval->h * 60 + $interval->i;
        } elseif ($signInTime > $sessionEnd) {
            // Signed in after session ended - give credit for full session
            $interval = $sessionStart->diff($sessionEnd);
            $attendanceDuration = $interval->h * 60 + $interval->i;
        }
        
        // Record the attendance
        $insertQuery = "
            INSERT INTO training_attendance 
            (session_id, employee_id, sign_in_time, attendance_duration, badge_scanned, 
             ip_address, device_info, is_late_arrival, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $deviceInfo = $this->getDeviceInfo();
        $notes = $isExpected ? null : 'Unexpected attendee - not in original attendee list';
        
        $stmt = $this->db->prepare($insertQuery);
        $success = $stmt->execute([
            $sessionId,
            $employee['id'],
            $signInTime->format('Y-m-d H:i:s'),
            $attendanceDuration,
            $badgeNumber,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $deviceInfo,
            $isLateArrival ? 1 : 0,  // Convert boolean to integer
            $notes
        ]);
        
        if ($success) {
            // Log successful scan
            $this->logScanAttempt($sessionId, $badgeNumber, 'SUCCESS', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            // Update session status to 'in-progress' if it's the first sign-in
            $this->updateSessionStatus($sessionId);
            
            $message = $employee['first_name'] . ' ' . $employee['last_name'] . ' successfully signed in for training';
            if ($isLateArrival) {
                $message .= ' (Post-session sign-off)';
            }
            
            $this->sendResponse(200, [
                'success' => true,
                'message' => $message,
                'alreadySignedIn' => false,
                'isExpectedAttendee' => $isExpected,
                'isLateArrival' => $isLateArrival,
                'attendanceDuration' => $attendanceDuration,
                'signInTime' => $signInTime->format('Y-m-d H:i:s'),
                'employee' => $this->formatEmployee($employee)
            ]);
        } else {
            // Log failed scan
            $this->logScanAttempt($sessionId, $badgeNumber, 'DATABASE_ERROR', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Failed to record attendance. Please try again.',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => $isExpected,
                'employee' => $this->formatEmployee($employee)
            ]);
        }
    }
    
    private function getRecentScans() {
        $sessionId = $_GET['sessionId'] ?? null;
        $limit = $_GET['limit'] ?? 10;
        
        if (!$sessionId) {
            $this->sendResponse(400, ['error' => 'sessionId parameter required']);
            return;
        }
        
        $query = "
            SELECT 
                ta.*,
                e.card_number badge_number,
                e.first first_name,
                e.last last_name,
                e.title position,
                e.department
            FROM training_attendance ta
            JOIN db.users e ON ta.employee_id = e.id
            WHERE ta.session_id = ?
            ORDER BY ta.sign_in_time DESC
            LIMIT ?
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$sessionId, (int)$limit]);
        $recentScans = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedScans = array_map(function($scan) {
            return [
                'id' => $scan['id'],
                'signoffTime' => $scan['sign_in_time'],
                'signInTime' => $scan['sign_in_time'], // Alternative property
                'attendanceDuration' => $scan['attendance_duration'],
                'isLateArrival' => (bool)$scan['is_late_arrival'],
                'employee' => [
                    'id' => $scan['employee_id'],
                    'badgeNumber' => $scan['badge_number'],
                    'firstName' => $scan['first_name'],
                    'lastName' => $scan['last_name'],
                    'position' => $scan['position'],
                    'department' => $scan['department']
                ]
            ];
        }, $recentScans);
        
        $this->sendResponse(200, $formattedScans);
    }
    
    private function formatEmployee($employee) {
        return [
            'id' => (int)$employee['id'],
            'badgeNumber' => $employee['badge_number'],
            'badgeId' => $employee['badge_number'], // Alternative property
            'firstName' => $employee['first_name'],
            'lastName' => $employee['last_name'],
            'position' => $employee['position'],
            'title' => $employee['position'], // Alternative property
            'department' => $employee['department'],
            'email' => $employee['email'] ?? null
        ];
    }
    
    private function updateSessionStatus($sessionId) {
        // Update session to 'in-progress' if it's currently 'scheduled'
        $updateQuery = "
            UPDATE training_sessions 
            SET status = 'in-progress' 
            WHERE id = ? AND status = 'scheduled'
        ";
        
        $stmt = $this->db->prepare($updateQuery);
        $stmt->execute([$sessionId]);
    }
    
    private function logScanAttempt($sessionId, $badgeNumber, $result, $ipAddress, $employeeId = null) {
        // Log scan attempts for auditing and troubleshooting
        $logQuery = "
            INSERT INTO training_scan_log 
            (session_id, badge_number, employee_id, scan_result, ip_address, device_info, scan_timestamp)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ";
        
        try {
            $stmt = $this->db->prepare($logQuery);
            $stmt->execute([
                $sessionId,
                $badgeNumber,
                $employeeId,
                $result,
                $ipAddress,
                $this->getDeviceInfo()
            ]);
        } catch (Exception $e) {
            // Don't fail the main operation if logging fails
            error_log("Failed to log scan attempt: " . $e->getMessage());
        }
    }
    
    private function getDeviceInfo() {
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $deviceInfo = [
            'user_agent' => $userAgent,
            'timestamp' => date('Y-m-d H:i:s'),
            'request_id' => uniqid('scan_', true)
        ];
        
        return json_encode($deviceInfo);
    }
    
    private function sendResponse($statusCode, $data) {
        http_response_code($statusCode);
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit();
    }
}

// Initialize and handle request
$api = new BadgeScanAPI();
$api->handleRequest();
?>