<?php
/**
 * Training Management API
 * Handles training sessions, attendees, and attendance tracking
 * 
 * @author Generated for Training Management System
 * @date 2025-09-17
 */

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class TrainingAPI {
    private $db;
    
    public function __construct() {
        $db_connect = new DatabaseEyefi();
        $db = $db_connect->getConnection();
        $this->db = $db;
    }
    
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        // Get path from query parameter, fallback to URL parsing for backward compatibility
        $path = $_GET['path'] ?? '';
        if (empty($path)) {
            $urlPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            $pathParts = explode('/', trim($urlPath, '/'));
            $apiIndex = array_search('training', $pathParts);
            if ($apiIndex !== false) {
                $pathParts = array_slice($pathParts, $apiIndex + 1);
                $path = implode('/', $pathParts);
            }
        }
        
        $pathParts = explode('/', trim($path, '/'));
        
        try {
            switch ($method) {
                case 'GET':
                    $this->handleGet($pathParts);
                    break;
                case 'POST':
                    $this->handlePost($pathParts);
                    break;
                case 'PUT':
                    $this->handlePut($pathParts);
                    break;
                case 'DELETE':
                    $this->handleDelete($pathParts);
                    break;
                default:
                    $this->sendResponse(405, ['error' => 'Method not allowed']);
            }
        } catch (Exception $e) {
            error_log("Training API Error: " . $e->getMessage());
            $this->sendResponse(500, ['error' => 'Internal server error', 'details' => $e->getMessage()]);
        }
    }
    
    private function handleGet($pathParts) {
        if (empty($pathParts[0])) {
            $this->sendResponse(400, ['error' => 'Invalid endpoint']);
            return;
        }
        
        switch ($pathParts[0]) {
            case 'sessions':
                if (isset($pathParts[1])) {
                    if ($pathParts[1] === 'attendance' && isset($_GET['sessionId'])) {
                        $this->getSessionAttendance($_GET['sessionId']);
                    } else if ($pathParts[1] === 'metrics' && isset($_GET['sessionId'])) {
                        $this->getSessionMetrics($_GET['sessionId']);
                    } else if ($pathParts[1] === 'export' && isset($_GET['sessionId'])) {
                        $this->exportAttendanceSheet($_GET['sessionId']);
                    } else if (isset($pathParts[2])) {
                        // /sessions/{id}/{action}
                        $this->handleSessionAction($pathParts[1], $pathParts[2]);
                    } else {
                        // /sessions/{id}
                        $this->getSession($pathParts[1]);
                    }
                } else {
                    // Check for query parameters
                    if (isset($_GET['id'])) {
                        $this->getSession($_GET['id']);
                    } else {
                        // /sessions
                        $this->getSessions();
                    }
                }
                break;
            case 'employees':
                if (isset($pathParts[1])) {
                    if ($pathParts[1] === 'search' && isset($_GET['q'])) {
                        $this->searchEmployees($_GET['q']);
                    } else if ($pathParts[1] === 'badge' && isset($_GET['badgeNumber'])) {
                        $this->getEmployeeByBadge($_GET['badgeNumber']);
                    }
                } else {
                    $this->getEmployees();
                }
                break;
            case 'attendance':
                if (isset($_GET['id'])) {
                    $this->removeAttendance($_GET['id']);
                }
                break;
            case 'categories':
                $this->getCategories();
                break;
            case 'templates':
                if (isset($_GET['id'])) {
                    $this->getTemplate($_GET['id']);
                } else {
                    $this->getTemplates();
                }
                break;
            default:
                $this->sendResponse(404, ['error' => 'Endpoint not found']);
        }
    }
    
    private function handlePost($pathParts) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($pathParts[0]) {
            case 'sessions':
                if (isset($pathParts[1])) {
                    if ($pathParts[1] === 'expected-attendees') {
                        if (isset($_GET['sessionId'])) {
                            if (isset($pathParts[2]) && $pathParts[2] === 'bulk') {
                                $this->bulkAddExpectedAttendees($_GET['sessionId'], $input);
                            } else {
                                $this->addExpectedAttendee($_GET['sessionId'], $input);
                            }
                        }
                    } else {
                        // /sessions/{id}/{action}
                        $this->handleSessionPostAction($pathParts[1], $pathParts[2] ?? '', $input);
                    }
                } else {
                    // /sessions
                    $this->createSession($input);
                }
                break;
            case 'badge-scan':
                $this->processBadgeScan($input);
                break;
            case 'debug-sessions':
                $this->debugSessions();
                break;
            case 'templates':
                $this->createTemplate($input);
                break;
            default:
                $this->sendResponse(404, ['error' => 'Endpoint not found']);
        }
    }
    
    
    private function searchEmployees($query) {
        $searchQuery = "
            SELECT 
                id,
                card_number as badge_number,
                card_number as badge_id,
                first as first_name,
                last as last_name,
                title as position,
                title,
                department,
                email,
                image
            FROM db.users 
            WHERE active = 1
            AND (
                first LIKE ? OR 
                last LIKE ? OR 
                card_number LIKE ? OR 
                title LIKE ? OR 
                department LIKE ?
            )
            ORDER BY last, first
            LIMIT 50
        ";
        
        $searchTerm = "%{$query}%";
        $stmt = $this->db->prepare($searchQuery);
        $stmt->execute([$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm]);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedEmployees = array_map(function($employee) {
            return [
                'id' => (int)$employee['id'],
                'badgeNumber' => $employee['badge_number'],
                'badgeId' => $employee['badge_id'],
                'firstName' => $employee['first_name'],
                'lastName' => $employee['last_name'],
                'position' => $employee['position'],
                'title' => $employee['title'],
                'department' => $employee['department'],
                'email' => $employee['email'],
            'image' => $employee['image']
            ];
        }, $employees);
        
        $this->sendResponse(200, $formattedEmployees);
    }
    
    private function getEmployeeByBadge($badgeNumber) {
        $query = "
            SELECT 
                id,
                card_number as badge_number,
                card_number as badge_id,
                first as first_name,
                last as last_name,
                title as position,
                title,
                department,
                email,
                image
            FROM db.users 
            WHERE card_number = ? AND active = 1
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$badgeNumber]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            $this->sendResponse(404, ['error' => 'Employee not found']);
            return;
        }
        
        $formattedEmployee = [
            'id' => (int)$employee['id'],
            'badgeNumber' => $employee['badge_number'],
            'badgeId' => $employee['badge_id'],
            'firstName' => $employee['first_name'],
            'lastName' => $employee['last_name'],
            'position' => $employee['position'],
            'title' => $employee['title'],
            'department' => $employee['department'],
            'email' => $employee['email'],
            'image' => $employee['image']
        ];
        
        $this->sendResponse(200, $formattedEmployee);
    }

    
    // Expected Attendees Management
    private function addExpectedAttendee($sessionId, $data) {
        $query = "
            INSERT INTO training_attendees (session_id, employee_id, is_required, added_by)
            VALUES (?, ?, ?, ?)
        ";
        
        $stmt = $this->db->prepare($query);
        $success = $stmt->execute([
            $sessionId,
            $data['employeeId'],
            ($data['isRequired'] ?? true) ? 1 : 0,  // Convert boolean to integer
            $data['addedBy'] ?? 1
        ]);
        
        if ($success) {
            $this->sendResponse(200, ['message' => 'Expected attendee added successfully']);
        } else {
            $this->sendResponse(500, ['error' => 'Failed to add expected attendee']);
        }
    }
    
    
    private function handlePut($pathParts) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($pathParts[0] === 'sessions') {
            if (isset($_GET['id'])) {
                $this->updateSession($_GET['id'], $input);
            } else if (isset($pathParts[1])) {
                $this->updateSession($pathParts[1], $input);
            }
        } else if ($pathParts[0] === 'templates') {
            if (isset($_GET['id'])) {
                $this->updateTemplate($_GET['id'], $input);
            } else {
                $this->sendResponse(400, ['error' => 'Template ID is required for update']);
            }
        } else {
            $this->sendResponse(404, ['error' => 'Endpoint not found']);
        }
    }
    
    private function handleDelete($pathParts) {
        if ($pathParts[0] === 'sessions') {
            if (isset($_GET['id'])) {
                $this->deleteSession($_GET['id']);
            } else if (isset($pathParts[1])) {
                $this->deleteSession($pathParts[1]);
            } else if (isset($pathParts[1]) && $pathParts[1] === 'expected-attendees' && isset($_GET['sessionId']) && isset($_GET['employeeId'])) {
                $this->removeExpectedAttendee($_GET['sessionId'], $_GET['employeeId']);
            }
        } else if ($pathParts[0] === 'templates') {
            if (isset($_GET['id'])) {
                $this->deleteTemplate($_GET['id']);
            } else {
                $this->sendResponse(400, ['error' => 'Template ID is required for deletion']);
            }
        } else if ($pathParts[0] === 'attendance' && isset($_GET['id'])) {
            $this->removeAttendance($_GET['id']);
        } else {
            $this->sendResponse(404, ['error' => 'Endpoint not found']);
        }
    }

    
    
    private function removeAttendance($attendanceId) {
        $query = "DELETE FROM training_attendance WHERE id = ?";
        $stmt = $this->db->prepare($query);
        $success = $stmt->execute([$attendanceId]);
        
        if ($success) {
            $this->sendResponse(200, ['message' => 'Attendance record removed successfully']);
        } else {
            $this->sendResponse(500, ['error' => 'Failed to remove attendance record']);
        }
    }
    

    
    private function removeExpectedAttendee($sessionId, $employeeId) {
        $query = "DELETE FROM training_attendees WHERE session_id = ? AND employee_id = ?";
        $stmt = $this->db->prepare($query);
        $success = $stmt->execute([$sessionId, $employeeId]);
        
        if ($success) {
            $this->sendResponse(200, ['message' => 'Expected attendee removed successfully']);
        } else {
            $this->sendResponse(500, ['error' => 'Failed to remove expected attendee']);
        }
    }
    

    
    private function bulkAddExpectedAttendees($sessionId, $data) {
        if (!isset($data['employeeIds']) || !is_array($data['employeeIds'])) {
            $this->sendResponse(400, ['error' => 'employeeIds array is required']);
            return;
        }
        
        $this->db->beginTransaction();
        
        try {
            $query = "
                INSERT INTO training_attendees (session_id, employee_id, is_required, added_by)
                VALUES (?, ?, ?, ?)
            ";
            
            $stmt = $this->db->prepare($query);
            foreach ($data['employeeIds'] as $employeeId) {
                $stmt->execute([
                    $sessionId,
                    $employeeId,
                    1,  // Convert boolean true to integer
                    $data['addedBy'] ?? 1
                ]);
            }
            
            $this->db->commit();
            $this->sendResponse(200, ['message' => 'Expected attendees added successfully']);
            
        } catch (Exception $e) {
            $this->db->rollBack();
            $this->sendResponse(500, ['error' => 'Failed to add expected attendees']);
        }
    }
    
    
    // Session Management
    private function getSessions() {
        $query = "
            SELECT 
                ts.*,
                tc.name as category_name,
                tc.color_code as category_color,
                COUNT(DISTINCT ta.employee_id) as expected_count,
                COUNT(DISTINCT att.employee_id) as completed_count
            FROM training_sessions ts
            LEFT JOIN training_categories tc ON ts.category_id = tc.id
            LEFT JOIN training_attendees ta ON ts.id = ta.session_id
            LEFT JOIN training_attendance att ON ts.id = att.session_id
            GROUP BY ts.id
            ORDER BY ts.date DESC, ts.start_time DESC
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendResponse(200, $sessions);
    }
    
    private function getSession($id) {
        // Get session details
        $query = "
            SELECT 
                ts.*,
                tc.name as category_name,
                tc.color_code as category_color
            FROM training_sessions ts
            LEFT JOIN training_categories tc ON ts.category_id = tc.id
            WHERE ts.id = ?
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$id]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$session) {
            $this->sendResponse(404, ['error' => 'Session not found']);
            return;
        }
        
        // Get expected attendees
        $attendeesQuery = "
            SELECT 
                ta.*,
                e.card_number badge_number,
                e.first first_name,
                e.last last_name,
                e.title position,
                e.department,
                e.email
            FROM training_attendees ta
            JOIN db.users e ON ta.employee_id = e.id
            WHERE ta.session_id = ?
            ORDER BY e.first, e.last
        ";
        
        $stmt = $this->db->prepare($attendeesQuery);
        $stmt->execute([$id]);
        $expectedAttendees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get actual attendance
        $attendanceQuery = "
            SELECT 
                att.*,
                e.card_number badge_number,
                e.first first_name,
                e.last last_name,
                e.title position,
                e.department,
                e.email
            FROM training_attendance att
            JOIN db.users e ON att.employee_id = e.id
            WHERE att.session_id = ?
            ORDER BY att.sign_in_time DESC
        ";
        
        $stmt = $this->db->prepare($attendanceQuery);
        $stmt->execute([$id]);
        $actualAttendees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $session['expectedAttendees'] = array_map(function($attendee) {
            return [
                'id' => $attendee['id'],
                'sessionId' => $attendee['session_id'],
                'employeeId' => $attendee['employee_id'],
                'isRequired' => (bool)$attendee['is_required'],
                'notificationSent' => (bool)$attendee['notification_sent'],
                'addedDate' => $attendee['added_date'],
                'addedBy' => $attendee['added_by'],
                'employee' => [
                    'id' => $attendee['employee_id'],
                    'badgeNumber' => $attendee['badge_number'],
                    'badgeId' => $attendee['badge_number'], // Alternative property
                    'firstName' => $attendee['first_name'],
                    'lastName' => $attendee['last_name'],
                    'position' => $attendee['position'],
                    'title' => $attendee['position'], // Alternative property
                    'department' => $attendee['department'],
                    'email' => $attendee['email']
                ]
            ];
        }, $expectedAttendees);
        
        $session['actualAttendees'] = array_map(function($attendance) {
            return [
                'id' => $attendance['id'],
                'sessionId' => $attendance['session_id'],
                'employeeId' => $attendance['employee_id'],
                'signInTime' => $attendance['sign_in_time'],
                'signoffTime' => $attendance['sign_in_time'], // Alternative property
                'attendanceDuration' => $attendance['attendance_duration'],
                'badgeScanned' => $attendance['badge_scanned'],
                'ipAddress' => $attendance['ip_address'],
                'deviceInfo' => $attendance['device_info'],
                'isLateArrival' => (bool)$attendance['is_late_arrival'],
                'notes' => $attendance['notes'],
                'employee' => [
                    'id' => $attendance['employee_id'],
                    'badgeNumber' => $attendance['badge_number'],
                    'badgeId' => $attendance['badge_number'], // Alternative property
                    'firstName' => $attendance['first_name'],
                    'lastName' => $attendance['last_name'],
                    'position' => $attendance['position'],
                    'title' => $attendance['position'], // Alternative property
                    'department' => $attendance['department'],
                    'email' => $attendance['email']
                ]
            ];
        }, $actualAttendees);
        
        // Calculate duration in minutes
        $session['durationMinutes'] = $session['duration_minutes'];
        
        $this->sendResponse(200, $session);
    }
    
    private function createSession($data) {
        // Validate required fields
        $required = ['title', 'description', 'purpose', 'date', 'startTime', 'endTime', 'location', 'facilitatorName', 'expectedAttendeeIds'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $this->sendResponse(400, ['error' => "Missing required field: $field"]);
                return;
            }
        }
        
        $this->db->beginTransaction();
        
        try {
            // Create session
            $query = "
                INSERT INTO training_sessions 
                (title, description, purpose, date, start_time, end_time, location, facilitator_name, category_id, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['title'],
                $data['description'],
                $data['purpose'],
                $data['date'],
                $data['startTime'],
                $data['endTime'],
                $data['location'],
                $data['facilitatorName'],
                $data['categoryId'] ?? null,
                $data['createdBy'] ?? 1 // Default user
            ]);
            
            $sessionId = $this->db->lastInsertId();
            
            // Add expected attendees
            if (!empty($data['expectedAttendeeIds'])) {
                $attendeeQuery = "
                    INSERT INTO training_attendees (session_id, employee_id, is_required, added_by)
                    VALUES (?, ?, ?, ?)
                ";
                
                $attendeeStmt = $this->db->prepare($attendeeQuery);
                foreach ($data['expectedAttendeeIds'] as $employeeId) {
                    $attendeeStmt->execute([
                        $sessionId,
                        $employeeId,
                        1,  // Convert boolean true to integer
                        $data['createdBy'] ?? 1
                    ]);
                }
            }
            
            $this->db->commit();
            
            // Return the created session
            $this->getSession($sessionId);
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    private function updateSession($id, $data) {
        // Check if this is a simple status update
        if (isset($data['status']) && count($data) === 1) {
            $this->updateSessionStatus($id, $data['status']);
            return;
        }
        
        // Start transaction for full session update
        $this->db->beginTransaction();
        
        try {
            // Update session basic fields
            $query = "
                UPDATE training_sessions 
                SET title = ?, description = ?, purpose = ?, date = ?, start_time = ?, 
                    end_time = ?, location = ?, facilitator_name = ?, category_id = ?, updated_at = NOW()
                WHERE id = ?
            ";
            
            $stmt = $this->db->prepare($query);
            $success = $stmt->execute([
                $data['title'],
                $data['description'],
                $data['purpose'],
                $data['date'],
                $data['startTime'],
                $data['endTime'],
                $data['location'],
                $data['facilitatorName'],
                $data['categoryId'] ?? null,
                $id
            ]);
            
            if (!$success) {
                throw new Exception('Failed to update session');
            }
            
            // Update expected attendees if provided
            if (isset($data['expectedAttendeeIds'])) {
                // First, remove all existing expected attendees for this session
                $deleteQuery = "DELETE FROM training_attendees WHERE session_id = ?";
                $deleteStmt = $this->db->prepare($deleteQuery);
                $deleteStmt->execute([$id]);
                
                // Then add the new expected attendees
                if (!empty($data['expectedAttendeeIds'])) {
                    $attendeeQuery = "
                        INSERT INTO training_attendees (session_id, employee_id, is_required, added_by, added_date)
                        VALUES (?, ?, ?, ?, NOW())
                    ";
                    
                    $attendeeStmt = $this->db->prepare($attendeeQuery);
                    foreach ($data['expectedAttendeeIds'] as $employeeId) {
                        $attendeeStmt->execute([
                            $id,
                            $employeeId,
                            1,  // is_required = true
                            1   // added_by = current user (you might want to pass this in the data)
                        ]);
                    }
                }
            }
            
            $this->db->commit();
            
            // Return the updated session
            $this->getSession($id);
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    private function updateSessionStatus($id, $status) {
        // Validate status
        $validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
        if (!in_array($status, $validStatuses)) {
            $this->sendResponse(400, ['error' => 'Invalid session status']);
            return;
        }
        
        $query = "UPDATE training_sessions SET status = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($query);
        $success = $stmt->execute([$status, $id]);
        
        if ($success) {
            // Return the updated session
            $this->getSession($id);
        } else {
            $this->sendResponse(500, ['error' => 'Failed to update session status']);
        }
    }
    
    private function deleteSession($id) {
        $query = "DELETE FROM training_sessions WHERE id = ?";
        $stmt = $this->db->prepare($query);
        $success = $stmt->execute([$id]);
        
        if ($success) {
            $this->sendResponse(200, ['message' => 'Session deleted successfully']);
        } else {
            $this->sendResponse(500, ['error' => 'Failed to delete session']);
        }
    }
    
    // Session Actions
    private function handleSessionAction($sessionId, $action) {
        switch ($action) {
            case 'attendance':
                $this->getSessionAttendance($sessionId);
                break;
            case 'metrics':
                $this->getSessionMetrics($sessionId);
                break;
            case 'export':
                $this->exportAttendanceSheet($sessionId);
                break;
            default:
                $this->sendResponse(404, ['error' => 'Action not found']);
        }
    }
    
    private function handleSessionPostAction($sessionId, $action, $data) {
        switch ($action) {
            case 'attendees':
                $this->addSessionAttendees($sessionId, $data);
                break;
            default:
                $this->sendResponse(404, ['error' => 'Action not found']);
        }
    }
    
    private function addSessionAttendees($sessionId, $data) {
        // Validate required fields
        if (!isset($data['employeeIds']) || !is_array($data['employeeIds'])) {
            $this->sendResponse(400, ['error' => 'Missing or invalid employeeIds array']);
            return;
        }
        
        // Check if session exists
        $sessionQuery = "SELECT id FROM training_sessions WHERE id = ?";
        $stmt = $this->db->prepare($sessionQuery);
        $stmt->execute([$sessionId]);
        if (!$stmt->fetch()) {
            $this->sendResponse(404, ['error' => 'Session not found']);
            return;
        }
        
        $this->db->beginTransaction();
        
        try {
            $addedCount = 0;
            $skippedCount = 0;
            $errors = [];
            
            foreach ($data['employeeIds'] as $employeeId) {
                // Check if employee exists
                $employeeQuery = "SELECT id FROM db.users WHERE id = ? AND active = 1";
                $stmt = $this->db->prepare($employeeQuery);
                $stmt->execute([$employeeId]);
                if (!$stmt->fetch()) {
                    $errors[] = "Employee ID $employeeId not found or inactive";
                    continue;
                }
                
                // Check if already added to this session
                $existingQuery = "SELECT id FROM training_attendees WHERE session_id = ? AND employee_id = ?";
                $stmt = $this->db->prepare($existingQuery);
                $stmt->execute([$sessionId, $employeeId]);
                if ($stmt->fetch()) {
                    $skippedCount++;
                    continue;
                }
                
                // Add attendee
                $insertQuery = "
                    INSERT INTO training_attendees (session_id, employee_id, is_required, added_by, added_date)
                    VALUES (?, ?, ?, ?, NOW())
                ";
                
                $stmt = $this->db->prepare($insertQuery);
                $success = $stmt->execute([
                    $sessionId,
                    $employeeId,
                    ($data['isRequired'] ?? true) ? 1 : 0,  // Convert boolean to integer
                    $data['addedBy'] ?? 1 // Default user
                ]);
                
                if ($success) {
                    $addedCount++;
                } else {
                    $errors[] = "Failed to add employee ID $employeeId";
                }
            }
            
            $this->db->commit();
            
            $this->sendResponse(200, [
                'success' => true,
                'message' => "Successfully processed attendees",
                'addedCount' => $addedCount,
                'skippedCount' => $skippedCount,
                'errors' => $errors
            ]);
            
        } catch (Exception $e) {
            $this->db->rollBack();
            $this->sendResponse(500, ['error' => 'Failed to add attendees: ' . $e->getMessage()]);
        }
    }
    
    private function getSessionAttendance($sessionId) {
        $query = "
            SELECT 
                att.*,
                e.card_number as badge_number,
                e.first as first_name,
                e.last as last_name,
                e.title as position,
                e.department,
                e.email
            FROM training_attendance att
            JOIN db.users e ON att.employee_id = e.id
            WHERE att.session_id = ?
            ORDER BY att.sign_in_time DESC
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$sessionId]);
        $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedAttendance = array_map(function($record) {
            return [
                'id' => $record['id'],
                'sessionId' => $record['session_id'],
                'employeeId' => $record['employee_id'],
                'signInTime' => $record['sign_in_time'],
                'signoffTime' => $record['sign_in_time'], // Alternative property
                'attendanceDuration' => $record['attendance_duration'],
                'badgeScanned' => $record['badge_scanned'],
                'ipAddress' => $record['ip_address'],
                'isLateArrival' => (bool)$record['is_late_arrival'],
                'notes' => $record['notes'],
                'employee' => [
                    'id' => $record['employee_id'],
                    'badgeNumber' => $record['badge_number'],
                    'badgeId' => $record['badge_number'], // Alternative property
                    'firstName' => $record['first_name'],
                    'lastName' => $record['last_name'],
                    'position' => $record['position'],
                    'title' => $record['position'], // Alternative property
                    'department' => $record['department'],
                    'email' => $record['email']
                ]
            ];
        }, $attendance);
        
        $this->sendResponse(200, $formattedAttendance);
    }
    
    private function getSessionMetrics($sessionId) {
        $query = "
            SELECT 
                COUNT(DISTINCT ta.employee_id) as total_expected,
                COUNT(DISTINCT att.employee_id) as total_present,
                COUNT(DISTINCT att.employee_id) as completed_count,
                ROUND(
                    CASE 
                        WHEN COUNT(DISTINCT ta.employee_id) > 0 
                        THEN (COUNT(DISTINCT att.employee_id) * 100.0 / COUNT(DISTINCT ta.employee_id))
                        ELSE 0 
                    END, 2
                ) as attendance_rate,
                COUNT(CASE WHEN att.is_late_arrival = 1 THEN 1 END) as late_arrivals,
                COUNT(CASE WHEN ta.employee_id IS NULL THEN 1 END) as unexpected_attendees
            FROM training_sessions ts
            LEFT JOIN training_attendees ta ON ts.id = ta.session_id
            LEFT JOIN training_attendance att ON ts.id = att.session_id
            WHERE ts.id = ?
            GROUP BY ts.id
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$sessionId]);
        $metrics = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$metrics) {
            $metrics = [
                'total_expected' => 0,
                'total_present' => 0,
                'completed_count' => 0,
                'attendance_rate' => 0,
                'late_arrivals' => 0,
                'unexpected_attendees' => 0
            ];
        }
        
        $formattedMetrics = [
            'totalExpected' => (int)$metrics['total_expected'],
            'totalPresent' => (int)$metrics['total_present'],
            'completedCount' => (int)$metrics['completed_count'],
            'attendanceRate' => (float)$metrics['attendance_rate'],
            'lateArrivals' => (int)$metrics['late_arrivals'],
            'unexpectedAttendees' => (int)$metrics['unexpected_attendees']
        ];
        
        $this->sendResponse(200, $formattedMetrics);
    }
    
    // Badge Scanning
    private function processBadgeScan($data) {
        // Log incoming request for debugging
        error_log("Badge scan request: " . json_encode($data));
        
        // Validate required fields
        if (!isset($data['sessionId']) || !isset($data['badgeNumber'])) {
            $this->sendResponse(400, ['error' => 'Missing sessionId or badgeNumber']);
            return;
        }

        $sessionId = $data['sessionId'];
        $badgeNumber = $data['badgeNumber'];
        
        // Log session and badge being processed
        error_log("Processing badge scan - SessionID: $sessionId, BadgeNumber: $badgeNumber");
        
        // Find employee by badge number
        $employeeQuery = "SELECT * FROM db.users WHERE card_number = ? AND active = 1";
        $stmt = $this->db->prepare($employeeQuery);
        $stmt->execute([$badgeNumber]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$employee) {
            // Log the failed scan attempt
            error_log("Employee not found for badge: $badgeNumber");
            $this->logScanAttempt($sessionId, $badgeNumber, 'BADGE_NOT_FOUND', $_SERVER['REMOTE_ADDR'] ?? null);
            
            $this->sendResponse(404, [
                'success' => false,
                'message' => 'Badge number not found',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => false
            ]);
            return;
        }
        
        error_log("Employee found: " . $employee['first'] . " " . $employee['last'] . " (ID: " . $employee['id'] . ")");

        // Verify session exists and is active
        $sessionQuery = "SELECT * FROM training_sessions WHERE id = ?";
        $stmt = $this->db->prepare($sessionQuery);
        $stmt->execute([$sessionId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("Session query result for ID $sessionId: " . json_encode($session));
        
        if (!$session) {
            // Log session not found
            $this->logScanAttempt($sessionId, $badgeNumber, 'SESSION_NOT_FOUND', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(404, [
                'success' => false,
                'message' => 'Training session not found',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => false,
                'debug' => ['sessionId' => $sessionId]
            ]);
            return;
        }
        
        // Check if session is in active status
        if (!in_array($session['status'], ['scheduled', 'in-progress', 'completed'])) {
            $this->sendResponse(400, [
                'success' => false,
                'message' => 'Training session is not active (status: ' . $session['status'] . ')',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => false,
                'debug' => ['sessionId' => $sessionId, 'status' => $session['status']]
            ]);
            return;
        }
        
        // Check if employee is expected
        $expectedQuery = "SELECT * FROM training_attendees WHERE session_id = ? AND employee_id = ?";
        $stmt = $this->db->prepare($expectedQuery);
        $stmt->execute([$sessionId, $employee['id']]);
        $isExpected = $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        
        // Check if already signed in
        $attendanceQuery = "SELECT * FROM training_attendance WHERE session_id = ? AND employee_id = ?";
        $stmt = $this->db->prepare($attendanceQuery);
        $stmt->execute([$sessionId, $employee['id']]);
        $existingAttendance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existingAttendance) {
            // Log already signed in attempt
            $this->logScanAttempt($sessionId, $badgeNumber, 'ALREADY_SIGNED_IN', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(200, [
                'success' => false,
                'message' => 'Employee already signed in for this session',
                'alreadySignedIn' => true,
                'isExpectedAttendee' => $isExpected,
                'employee' => [
                    'id' => $employee['id'],
                    'badgeNumber' => $employee['card_number'],
                    'badgeId' => $employee['card_number'],
                    'firstName' => $employee['first'],
                    'lastName' => $employee['last'],
                    'position' => $employee['title'],
                    'title' => $employee['title'],
                    'department' => $employee['department']
                ]
            ]);
            return;
        }

        // Record the attendance
        $signInTime = new DateTime();
        $insertQuery = "
            INSERT INTO training_attendance 
            (session_id, employee_id, sign_in_time, badge_scanned, ip_address, device_info)
            VALUES (?, ?, ?, ?, ?, ?)
        ";
        
        $deviceInfo = json_encode([
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
            'timestamp' => date('Y-m-d H:i:s'),
            'request_id' => uniqid('scan_', true)
        ]);
        
        $stmt = $this->db->prepare($insertQuery);
        $success = $stmt->execute([
            $sessionId,
            $employee['id'],
            $signInTime->format('Y-m-d H:i:s'),
            $badgeNumber,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $deviceInfo
        ]);
        
        if ($success) {
            // Log successful scan
            $this->logScanAttempt($sessionId, $badgeNumber, 'SUCCESS', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(200, [
                'success' => true,
                'message' => $employee['first'] . ' ' . $employee['last'] . ' successfully signed in for training',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => $isExpected,
                'employee' => [
                    'id' => $employee['id'],
                    'badgeNumber' => $employee['card_number'],
                    'badgeId' => $employee['card_number'],
                    'firstName' => $employee['first'],
                    'lastName' => $employee['last'],
                    'position' => $employee['title'],
                    'title' => $employee['title'],
                    'department' => $employee['department']
                ]
            ]);
        } else {
            // Log failed scan
            $this->logScanAttempt($sessionId, $badgeNumber, 'DATABASE_ERROR', $_SERVER['REMOTE_ADDR'] ?? null, $employee['id']);
            
            $this->sendResponse(500, [
                'success' => false,
                'message' => 'Failed to record attendance. Please try again.',
                'alreadySignedIn' => false,
                'isExpectedAttendee' => $isExpected,
                'employee' => [
                    'id' => $employee['id'],
                    'badgeNumber' => $employee['card_number'],
                    'badgeId' => $employee['card_number'],
                    'firstName' => $employee['first'],
                    'lastName' => $employee['last'],
                    'position' => $employee['title'],
                    'title' => $employee['title'],
                    'department' => $employee['department']
                ]
            ]);
        }
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
            $deviceInfo = json_encode([
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
                'timestamp' => date('Y-m-d H:i:s'),
                'request_id' => uniqid('scan_', true)
            ]);
            
            $stmt->execute([
                $sessionId,
                $badgeNumber,
                $employeeId,
                $result,
                $ipAddress,
                $deviceInfo
            ]);
        } catch (Exception $e) {
            // Don't fail the main operation if logging fails
            error_log("Failed to log scan attempt: " . $e->getMessage());
        }
    }
    
    // Employee Management
    private function getEmployees() {
        $query = "
            SELECT 
                id,
                card_number as badge_number,
                card_number as badge_id,
                first as first_name,
                last as last_name,
                title as position,
                title,
                department,
                email
            FROM db.users 
            WHERE active = 1
            ORDER BY first, last
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $formattedEmployees = array_map(function($employee) {
            return [
                'id' => (int)$employee['id'],
                'badgeNumber' => $employee['badge_number'],
                'badgeId' => $employee['badge_id'],
                'firstName' => $employee['first_name'],
                'lastName' => $employee['last_name'],
                'position' => $employee['position'],
                'title' => $employee['title'],
                'department' => $employee['department'],
                'email' => $employee['email']
            ];
        }, $employees);
        
        $this->sendResponse(200, $formattedEmployees);
    }
    
    // Categories and Templates
    private function getCategories() {
        $query = "SELECT * FROM training_categories WHERE is_active = 1 ORDER BY name";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendResponse(200, $categories);
    }
    
    private function getTemplates() {
        $query = "
            SELECT 
                tst.*,
                tc.name as category_name,
                tc.color_code as category_color
            FROM training_session_templates tst
            LEFT JOIN training_categories tc ON tst.category_id = tc.id
            WHERE tst.is_active = 1
            ORDER BY tst.name
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendResponse(200, $templates);
    }
    
    private function getTemplate($id) {
        $query = "
            SELECT 
                tst.*,
                tc.name as category_name,
                tc.color_code as category_color
            FROM training_session_templates tst
            LEFT JOIN training_categories tc ON tst.category_id = tc.id
            WHERE tst.id = :id
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $template = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($template) {
            $this->sendResponse(200, $template);
        } else {
            $this->sendResponse(404, ['error' => 'Template not found']);
        }
    }
    
    private function createTemplate($data) {
        $query = "
            INSERT INTO training_session_templates 
            (name, title_template, description_template, purpose_template, 
             default_duration_minutes, default_location, category_id, is_active, created_by)
            VALUES 
            (:name, :title_template, :description_template, :purpose_template,
             :default_duration_minutes, :default_location, :category_id, :is_active, :created_by)
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':title_template', $data['title_template']);
        $stmt->bindParam(':description_template', $data['description_template']);
        $stmt->bindParam(':purpose_template', $data['purpose_template']);
        $stmt->bindParam(':default_duration_minutes', $data['default_duration_minutes'], PDO::PARAM_INT);
        $stmt->bindParam(':default_location', $data['default_location']);
        $stmt->bindParam(':category_id', $data['category_id'], PDO::PARAM_INT);
        $stmt->bindParam(':is_active', $data['is_active'], PDO::PARAM_INT);
        $stmt->bindParam(':created_by', $data['created_by'], PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            $templateId = $this->db->lastInsertId();
            $this->getTemplate($templateId);
        } else {
            $this->sendResponse(400, ['error' => 'Failed to create template']);
        }
    }
    
    private function updateTemplate($id, $data) {
        $query = "
            UPDATE training_session_templates 
            SET name = :name,
                title_template = :title_template,
                description_template = :description_template,
                purpose_template = :purpose_template,
                default_duration_minutes = :default_duration_minutes,
                default_location = :default_location,
                category_id = :category_id,
                is_active = :is_active
            WHERE id = :id
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':title_template', $data['title_template']);
        $stmt->bindParam(':description_template', $data['description_template']);
        $stmt->bindParam(':purpose_template', $data['purpose_template']);
        $stmt->bindParam(':default_duration_minutes', $data['default_duration_minutes'], PDO::PARAM_INT);
        $stmt->bindParam(':default_location', $data['default_location']);
        $stmt->bindParam(':category_id', $data['category_id'], PDO::PARAM_INT);
        $stmt->bindParam(':is_active', $data['is_active'], PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            $this->getTemplate($id);
        } else {
            $this->sendResponse(400, ['error' => 'Failed to update template']);
        }
    }
    
    private function deleteTemplate($id) {
        $query = "DELETE FROM training_session_templates WHERE id = :id";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            $this->sendResponse(200, ['message' => 'Template deleted successfully']);
        } else {
            $this->sendResponse(400, ['error' => 'Failed to delete template']);
        }
    }
    
    // Export functionality
    private function exportAttendanceSheet($sessionId) {
        // This would generate a PDF or Excel file
        // For now, return JSON data that can be processed by frontend
        $this->getSession($sessionId);
    }
    
    // Debug method to check sessions
    private function debugSessions() {
        $query = "SELECT id, title, status, date FROM training_sessions ORDER BY id DESC LIMIT 10";
        $stmt = $this->db->prepare($query);
        $stmt->execute();
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $this->sendResponse(200, [
            'sessions' => $sessions,
            'count' => count($sessions)
        ]);
    }
    
    // Utility methods
    private function sendResponse($statusCode, $data) {
        http_response_code($statusCode);
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit();
    }
}

// Initialize and handle request
$api = new TrainingAPI();
$api->handleRequest();
?>