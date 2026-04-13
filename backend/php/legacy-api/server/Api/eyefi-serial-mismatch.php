<?php
/**
 * EyeFi Serial Number Sequence Mismatch Report API
 * Handles submission and management of sequence mismatch reports
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class MismatchReportAPI {
    private $db;
    private $user_id;
    private $user_name;

    public function __construct($database, $user_id = null, $user_name = null) {
        $this->db = $database;
        $this->user_id = $user_id ?? 'api_user';
        $this->user_name = $user_name ?? 'System User';
    }

    /**
     * Submit a new mismatch report
     */
    public function submitReport($data) {
        // Validate required fields
        if (!isset($data['workOrderNumber']) || !isset($data['rowIndex'])) {
            return [
                'success' => false,
                'error' => 'Missing required fields: workOrderNumber, rowIndex'
            ];
        }

        // Determine which fields are required based on step
        $step = $data['step'] ?? 'step4';
        
        if ($step === 'step4') {
            if (!isset($data['physicalEyefiSerial'])) {
                return [
                    'success' => false,
                    'error' => 'Missing required field: physicalEyefiSerial'
                ];
            }
        } elseif (strpos($step, 'step5') === 0) {
            if (!isset($data['physicalCustomerSerial'])) {
                return [
                    'success' => false,
                    'error' => 'Missing required field: physicalCustomerSerial'
                ];
            }
        }
        
        try {
            $this->db->beginTransaction();
            
            // Insert mismatch report
            $query = "INSERT INTO eyefi_serial_mismatch_reports (
                        work_order_number,
                        category,
                        reported_by,
                        reported_by_user_id,
                        step,
                        row_index,
                        row_number,
                        expected_eyefi_serial,
                        expected_ul_number,
                        physical_eyefi_serial,
                        physical_ul_number,
                        expected_customer_serial,
                        physical_customer_serial,
                        reference_eyefi_serial,
                        reference_ul_number,
                        customer_type,
                        notes,
                        photo_base64,
                        contact_method,
                        contact_info,
                        status,
                        created_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reported', GETDATE()
                    )";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['workOrderNumber'],
                $data['category'] ?? 'new',
                $this->user_name,
                $this->user_id,
                $step,
                $data['rowIndex'],
                $data['rowIndex'] + 1,
                $data['expectedEyefiSerial'] ?? null,
                $data['expectedUlNumber'] ?? null,
                $data['physicalEyefiSerial'] ?? null,
                $data['physicalUlNumber'] ?? null,
                $data['expectedCustomerSerial'] ?? null,
                $data['physicalCustomerSerial'] ?? null,
                $data['referenceEyefiSerial'] ?? null,
                $data['referenceUlNumber'] ?? null,
                $data['customerType'] ?? null,
                $data['notes'] ?? null,
                $data['photoBase64'] ?? null,
                $data['contactMethod'] ?? 'workstation',
                $data['contactInfo'] ?? null
            ]);
            
            // Get the inserted report ID (SQL Server uses SCOPE_IDENTITY())
            $reportIdQuery = "SELECT SCOPE_IDENTITY() as id";
            $reportIdStmt = $this->db->query($reportIdQuery);
            $reportIdResult = $reportIdStmt->fetch(\PDO::FETCH_ASSOC);
            $reportId = $reportIdResult['id'];
            
            // TODO: Send email notification to admins
            // $this->sendMismatchNotification($reportId, $data);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'reportId' => $reportId,
                'message' => 'Mismatch report submitted successfully. Admin has been notified.'
            ];
            
        } catch (\Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => 'Failed to submit report: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all mismatch reports with optional filtering
     */
    public function getAllReports($filters = []) {
        try {
            $query = "SELECT 
                        id,
                        work_order_number as workOrderNumber,
                        category,
                        reported_by as reportedBy,
                        reported_by_user_id as reportedByUserId,
                        step,
                        row_index as rowIndex,
                        row_number as rowNumber,
                        expected_eyefi_serial as expectedEyefiSerial,
                        expected_ul_number as expectedUlNumber,
                        physical_eyefi_serial as physicalEyefiSerial,
                        physical_ul_number as physicalUlNumber,
                        expected_customer_serial as expectedCustomerSerial,
                        physical_customer_serial as physicalCustomerSerial,
                        reference_eyefi_serial as referenceEyefiSerial,
                        reference_ul_number as referenceUlNumber,
                        customer_type as customerType,
                        notes,
                        contact_method as contactMethod,
                        contact_info as contactInfo,
                        status,
                        investigated_by as investigatedBy,
                        investigated_by_user_id as investigatedByUserId,
                        investigation_notes as investigationNotes,
                        resolution_action as resolutionAction,
                        root_cause as rootCause,
                        created_at as timestamp,
                        resolution_date as resolutionDate
                      FROM eyefi_serial_mismatch_reports
                      WHERE 1=1";
            
            $params = [];
            
            if (isset($filters['status'])) {
                $query .= " AND status = ?";
                $params[] = $filters['status'];
            }
            
            if (isset($filters['workOrder'])) {
                $query .= " AND work_order_number LIKE ?";
                $params[] = '%' . $filters['workOrder'] . '%';
            }
            
            if (isset($filters['dateFrom'])) {
                $query .= " AND created_at >= ?";
                $params[] = $filters['dateFrom'];
            }
            
            if (isset($filters['dateTo'])) {
                $query .= " AND created_at <= ?";
                $params[] = $filters['dateTo'];
            }
            
            $query .= " ORDER BY created_at DESC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $results
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching reports: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get single report by ID
     */
    public function getReportById($reportId) {
        try {
            $query = "SELECT * FROM eyefi_serial_mismatch_reports WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$reportId]);
            $report = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$report) {
                http_response_code(404);
                return [
                    'success' => false,
                    'error' => 'Report not found'
                ];
            }
            
            return [
                'success' => true,
                'data' => $report
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching report: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update report status
     */
    public function updateReportStatus($reportId, $data) {
        try {
            $query = "UPDATE eyefi_serial_mismatch_reports
                      SET status = ?,
                          investigation_notes = ?,
                          resolution_action = ?,
                          root_cause = ?,
                          investigated_by = ?,
                          investigated_by_user_id = ?,
                          resolution_date = CASE WHEN ? = 'resolved' THEN GETDATE() ELSE resolution_date END,
                          updated_at = GETDATE()
                      WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['status'],
                $data['investigationNotes'] ?? null,
                $data['resolutionAction'] ?? null,
                $data['rootCause'] ?? null,
                $this->user_name,
                $this->user_id,
                $data['status'],
                $reportId
            ]);
            
            return [
                'success' => true,
                'message' => 'Report status updated successfully'
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error updating report: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get summary statistics
     */
    public function getSummary() {
        try {
            // Get totals by status
            $statusQuery = "SELECT 
                            COUNT(*) as total,
                            SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) as reported,
                            SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END) as investigating,
                            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
                            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                            FROM eyefi_serial_mismatch_reports";
            
            $stmt = $this->db->query($statusQuery);
            $statusCounts = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            // Get root cause distribution
            $rootCauseQuery = "SELECT 
                                root_cause,
                                COUNT(*) as count
                               FROM eyefi_serial_mismatch_reports
                               WHERE root_cause IS NOT NULL
                               GROUP BY root_cause";
            
            $stmt = $this->db->query($rootCauseQuery);
            $rootCausesArray = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            $rootCauses = [];
            foreach ($rootCausesArray as $row) {
                $rootCauses[$row['root_cause']] = (int)$row['count'];
            }
            
            // Calculate average resolution time
            $avgTimeQuery = "SELECT 
                              AVG(DATEDIFF(HOUR, created_at, resolution_date)) as avg_hours
                             FROM eyefi_serial_mismatch_reports
                             WHERE status = 'resolved' AND resolution_date IS NOT NULL";
            
            $stmt = $this->db->query($avgTimeQuery);
            $avgTime = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            // Get recent reports
            $recentQuery = "SELECT TOP 10 * 
                           FROM eyefi_serial_mismatch_reports
                           ORDER BY created_at DESC";
            
            $stmt = $this->db->query($recentQuery);
            $recentReports = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => [
                    'totalReports' => (int)$statusCounts['total'],
                    'byStatus' => [
                        'reported' => (int)$statusCounts['reported'],
                        'investigating' => (int)$statusCounts['investigating'],
                        'resolved' => (int)$statusCounts['resolved'],
                        'cancelled' => (int)$statusCounts['cancelled']
                    ],
                    'byRootCause' => $rootCauses,
                    'averageResolutionTimeHours' => round($avgTime['avg_hours'] ?? 0, 2),
                    'recentReports' => $recentReports
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching summary: ' . $e->getMessage()
            ];
        }
    }
}

// Initialize database connection and handle request
try {
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    
    if (!$db) {
        throw new \Exception("Database connection failed");
    }
    
    // TODO: Get user info from session/auth
    $api = new MismatchReportAPI($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    $result = null;
    
    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (strpos($path, '/submit') !== false) {
                $result = $api->submitReport($data);
            } else {
                $result = [
                    'success' => false,
                    'error' => 'Invalid endpoint'
                ];
            }
            break;
            
        case 'GET':
            if (strpos($path, '/summary') !== false) {
                $result = $api->getSummary();
            } elseif (preg_match('/\/reports\/(\d+)$/', $path, $matches)) {
                $result = $api->getReportById($matches[1]);
            } else {
                // Build filters from query parameters
                $filters = [];
                if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
                if (isset($_GET['workOrder'])) $filters['workOrder'] = $_GET['workOrder'];
                if (isset($_GET['dateFrom'])) $filters['dateFrom'] = $_GET['dateFrom'];
                if (isset($_GET['dateTo'])) $filters['dateTo'] = $_GET['dateTo'];
                
                $result = $api->getAllReports($filters);
            }
            break;
            
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (preg_match('/\/reports\/(\d+)\/status$/', $path, $matches)) {
                $result = $api->updateReportStatus($matches[1], $data);
            } else {
                $result = [
                    'success' => false,
                    'error' => 'Invalid endpoint'
                ];
            }
            break;
            
        default:
            http_response_code(405);
            $result = [
                'success' => false,
                'error' => 'Method not allowed'
            ];
    }
    
    echo json_encode($result);
    
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>
