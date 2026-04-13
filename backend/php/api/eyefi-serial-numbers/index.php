<?php
/**
 * EyeFi Serial Number Management API
 * Handles all EyeFi device serial number operations including CRUD, assignments, and statistics
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class EyeFiSerialNumberAPI {
    private $db;
    private $user_id;

    public function __construct($database, $user_id = null) {
        $this->db = $database;
        $this->user_id = $user_id ?? 'api_user';
    }

    /**
     * Get all serial numbers with optional filtering
     */
    public function getSerialNumbers($filters = []) {
        try {
            $query = "SELECT 
                esn.*,
                COALESCE(ags.id, ul.id, sg.id) as assigned_to_id,
                CASE 
                    WHEN ags.id IS NOT NULL THEN 'agsSerialGenerator'
                    WHEN ul.id IS NOT NULL THEN 'ul_label_usages'
                    WHEN sg.id IS NOT NULL THEN 'sgAssetGenerator'
                    ELSE NULL 
                END as assigned_to_table
            FROM eyefi_serial_numbers esn
            LEFT JOIN agsSerialGenerator ags ON esn.serial_number = ags.serialNumber
            LEFT JOIN ul_label_usages ul ON esn.serial_number = ul.eyefi_serial_number
            LEFT JOIN sgAssetGenerator sg ON esn.serial_number = sg.serialNumber
            WHERE 1=1";
            $params = [];

            // Apply filters
            if (!empty($filters['id'])) {
                $query .= " AND esn.id = ?";
                $params[] = $filters['id'];
            }

            if (!empty($filters['search'])) {
                $query .= " AND (esn.serial_number LIKE ? OR esn.product_model LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            if (!empty($filters['status'])) {
                $query .= " AND esn.status = ?";
                $params[] = $filters['status'];
            }

            if (!empty($filters['product_model'])) {
                $query .= " AND esn.product_model = ?";
                $params[] = $filters['product_model'];
            }

            if (!empty($filters['batch_number'])) {
                $query .= " AND esn.batch_number LIKE ?";
                $params[] = '%' . $filters['batch_number'] . '%';
            }

            if (!empty($filters['date_from'])) {
                $query .= " AND esn.created_at >= ?";
                $params[] = $filters['date_from'] . ' 00:00:00';
            }

            if (!empty($filters['date_to'])) {
                $query .= " AND esn.created_at <= ?";
                $params[] = $filters['date_to'] . ' 23:59:59';
            }

            // Sorting
            $sortBy = $filters['sort'] ?? 'serial_number';
            $sortOrder = $filters['order'] ?? 'ASC';
            
            // Map frontend sort field to database column
            $sortMap = [
                'serial_number' => 'esn.serial_number',
                'product_model' => 'esn.product_model',
                'status' => 'esn.status',
                'created_at' => 'esn.created_at'
            ];
            
            $sortColumn = $sortMap[$sortBy] ?? 'esn.created_at';
            $query .= " ORDER BY $sortColumn $sortOrder";

            // Pagination - handle LIMIT without binding (for MySQL compatibility)
            if (isset($filters['limit'])) {
                $limit = (int)$filters['limit'];
                $query .= " LIMIT $limit";
                
                if (isset($filters['offset'])) {
                    $offset = (int)$filters['offset'];
                    $query .= " OFFSET $offset";
                }
            }

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get serial number statistics
     */
    public function getStatistics() {
        try {
            $stmt = $this->db->prepare("SELECT * FROM vw_eyefi_statistics");
            $stmt->execute();
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            // Get model distribution
            $stmt = $this->db->prepare("
                SELECT 
                    product_model,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM eyefi_serial_numbers WHERE is_active = 1), 2) as percentage
                FROM eyefi_serial_numbers 
                WHERE is_active = 1 
                GROUP BY product_model 
                ORDER BY count DESC
            ");
            $stmt->execute();
            $modelDistribution = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get monthly trends (last 12 months)
            $stmt = $this->db->prepare("
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as generated,
                    COUNT(CASE WHEN status IN ('assigned', 'shipped') THEN 1 END) as assigned,
                    COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped
                FROM eyefi_serial_numbers 
                WHERE is_active = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month ASC
            ");
            $stmt->execute();
            $monthlyTrends = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => [
                    'overall' => $stats,
                    'model_distribution' => $modelDistribution,
                    'monthly_trends' => $monthlyTrends
                ]
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Create serial numbers from range
     */
    public function createFromRange($data) {
        try {
            $this->db->beginTransaction();

            $serialNumbers = $data['serialNumbers'] ?? [];
            $successCount = 0;
            $errors = [];

            foreach ($serialNumbers as $serialData) {
                try {
                    $stmt = $this->db->prepare("
                        INSERT INTO eyefi_serial_numbers 
                        (serial_number, product_model, status, hardware_version, firmware_version, 
                         manufacture_date, batch_number, qr_code, notes, created_by) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    
                    $stmt->execute([
                        $serialData['serial_number'],
                        $serialData['product_model'] ?? 'EyeFi Pro X1',
                        $serialData['status'] ?? 'available',
                        $serialData['hardware_version'] ?? null,
                        $serialData['firmware_version'] ?? null,
                        $serialData['manufacture_date'] ?? null,
                        $serialData['batch_number'] ?? null,
                        $serialData['qr_code'] ?? null,
                        $serialData['notes'] ?? null,
                        $this->user_id
                    ]);
                    
                    $successCount++;
                    
                } catch (PDOException $e) {
                    if ($e->getCode() == 23000) { // Duplicate entry
                        $errors[] = "Serial number '{$serialData['serial_number']}' already exists";
                    } else {
                        $errors[] = "Error with '{$serialData['serial_number']}': " . $e->getMessage();
                    }
                }
            }

            $this->db->commit();

            return [
                'success' => true,
                'message' => "Successfully created $successCount serial numbers",
                'total_attempted' => count($serialNumbers),
                'success_count' => $successCount,
                'error_count' => count($errors),
                'errors' => $errors
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Update serial number status
     */
    public function updateStatus($serialNumber, $newStatus, $reason = null) {
        try {
            $validStatuses = ['available', 'assigned', 'shipped', 'returned', 'defective'];
            if (!in_array($newStatus, $validStatuses)) {
                throw new Exception("Invalid status. Must be one of: " . implode(', ', $validStatuses));
            }

            $this->db->beginTransaction();

            // Update the main record
            $updateFields = ['status = ?', 'updated_by = ?'];
            $params = [$newStatus, $this->user_id];

            // Add status-specific timestamp fields
            switch ($newStatus) {
                case 'assigned':
                    $updateFields[] = 'assigned_at = NOW()';
                    $updateFields[] = 'assigned_by = ?';
                    $params[] = $this->user_id;
                    break;
                case 'shipped':
                    $updateFields[] = 'shipped_at = NOW()';
                    $updateFields[] = 'shipped_by = ?';
                    $params[] = $this->user_id;
                    break;
                case 'returned':
                    $updateFields[] = 'returned_at = NOW()';
                    $updateFields[] = 'returned_by = ?';
                    $params[] = $this->user_id;
                    break;
                case 'defective':
                    $updateFields[] = 'defective_at = NOW()';
                    $updateFields[] = 'defective_by = ?';
                    $updateFields[] = 'defective_reason = ?';
                    $params[] = $this->user_id;
                    $params[] = $reason ?? 'Not specified';
                    break;
            }

            $params[] = $serialNumber;

            $stmt = $this->db->prepare("
                UPDATE eyefi_serial_numbers 
                SET " . implode(', ', $updateFields) . " 
                WHERE serial_number = ? AND is_active = 1
            ");
            
            $stmt->execute($params);

            if ($stmt->rowCount() === 0) {
                throw new Exception("Serial number not found or already inactive");
            }

            $this->db->commit();

            return [
                'success' => true,
                'message' => "Status updated to '$newStatus' for serial number: $serialNumber"
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Assign serial numbers to customer/work order
     */
    public function assignToCustomer($data) {
        try {
            $this->db->beginTransaction();

            $serialNumbers = $data['serial_numbers'] ?? [];
            $assignmentData = [
                'customer_name' => $data['customer_name'],
                'customer_po' => $data['customer_po'] ?? null,
                'work_order_number' => $data['work_order_number'] ?? null,
                'wo_part' => $data['wo_part'] ?? null,
                'wo_qty_ord' => $data['wo_qty_ord'] ?? null,
                'wo_due_date' => $data['wo_due_date'] ?? null,
                'wo_description' => $data['wo_description'] ?? null,
                'assigned_date' => $data['assigned_date'] ?? date('Y-m-d'),
                'assigned_by_name' => $data['assigned_by_name'],
                'shipped_date' => $data['shipped_date'] ?? null,
                'tracking_number' => $data['tracking_number'] ?? null,
                'notes' => $data['notes'] ?? null
            ];

            $successCount = 0;
            $errors = [];

            foreach ($serialNumbers as $serialNumber) {
                try {
                    // Check if serial number is available
                    $stmt = $this->db->prepare("
                        SELECT status FROM eyefi_serial_numbers 
                        WHERE serial_number = ? AND is_active = 1
                    ");
                    $stmt->execute([$serialNumber]);
                    $current = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$current) {
                        $errors[] = "Serial number '$serialNumber' not found";
                        continue;
                    }

                    if ($current['status'] !== 'available') {
                        $errors[] = "Serial number '$serialNumber' is not available (current status: {$current['status']})";
                        continue;
                    }

                    // Update serial number status
                    $this->updateStatus($serialNumber, 'assigned');

                    // Create assignment record
                    $stmt = $this->db->prepare("
                        INSERT INTO eyefi_serial_assignments 
                        (serial_number, customer_name, customer_po, work_order_number, wo_part, 
                         wo_qty_ord, wo_due_date, wo_description, assigned_date, assigned_by_name, 
                         shipped_date, tracking_number, notes, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");

                    $stmt->execute([
                        $serialNumber,
                        $assignmentData['customer_name'],
                        $assignmentData['customer_po'],
                        $assignmentData['work_order_number'],
                        $assignmentData['wo_part'],
                        $assignmentData['wo_qty_ord'],
                        $assignmentData['wo_due_date'],
                        $assignmentData['wo_description'],
                        $assignmentData['assigned_date'],
                        $assignmentData['assigned_by_name'],
                        $assignmentData['shipped_date'],
                        $assignmentData['tracking_number'],
                        $assignmentData['notes'],
                        $this->user_id
                    ]);

                    $successCount++;

                } catch (Exception $e) {
                    $errors[] = "Error assigning '$serialNumber': " . $e->getMessage();
                }
            }

            $this->db->commit();

            return [
                'success' => true,
                'message' => "Successfully assigned $successCount serial numbers to {$assignmentData['customer_name']}",
                'total_attempted' => count($serialNumbers),
                'success_count' => $successCount,
                'error_count' => count($errors),
                'errors' => $errors
            ];

        } catch (Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get assignment history
     */
    public function getAssignmentHistory($filters = []) {
        try {
            $query = "SELECT * FROM eyefi_serial_assignments WHERE is_active = 1";
            $params = [];

            if (!empty($filters['serial_number'])) {
                $query .= " AND serial_number = ?";
                $params[] = $filters['serial_number'];
            }

            if (!empty($filters['customer_name'])) {
                $query .= " AND customer_name LIKE ?";
                $params[] = '%' . $filters['customer_name'] . '%';
            }

            if (!empty($filters['work_order_number'])) {
                $query .= " AND work_order_number = ?";
                $params[] = $filters['work_order_number'];
            }

            $query .= " ORDER BY assigned_date DESC, created_at DESC";

            if (isset($filters['limit'])) {
                $query .= " LIMIT " . (int)$filters['limit'];
            }

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Export serial numbers to CSV
     */
    public function exportToCSV($serialNumbers = []) {
        try {
            $query = "SELECT * FROM vw_eyefi_serial_summary WHERE 1=1";
            $params = [];

            if (!empty($serialNumbers)) {
                $placeholders = str_repeat('?,', count($serialNumbers) - 1) . '?';
                $query .= " AND serial_number IN ($placeholders)";
                $params = $serialNumbers;
            }

            $query .= " ORDER BY serial_number ASC";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Generate CSV content
            $csvContent = "Serial Number,Product Model,Status,Hardware Version,Firmware Version,Manufacture Date,Batch Number,Customer,Work Order,Assigned Date,Shipped Date,Tracking Number\n";
            
            foreach ($results as $row) {
                $csvContent .= sprintf(
                    '"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
                    $row['serial_number'],
                    $row['product_model'],
                    $row['status'],
                    $row['hardware_version'] ?? '',
                    $row['firmware_version'] ?? '',
                    $row['manufacture_date'] ?? '',
                    $row['batch_number'] ?? '',
                    $row['customer_name'] ?? '',
                    $row['work_order_number'] ?? '',
                    $row['assigned_date'] ?? '',
                    $row['shipped_date'] ?? '',
                    $row['tracking_number'] ?? ''
                );
            }

            return [
                'success' => true,
                'data' => $csvContent,
                'filename' => 'eyefi_serial_numbers_' . date('Y-m-d_H-i-s') . '.csv'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}

// Handle the request
try {
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    $api = new EyeFiSerialNumberAPI($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Get action from query parameter instead of URL path
    $action = $_GET['action'] ?? '';
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    switch ($method) {
        case 'GET':
            if ($action === 'statistics') {
                $result = $api->getStatistics();
            } elseif ($action === 'assignments') {
                $filters = $_GET;
                unset($filters['action']); // Remove action from filters
                $result = $api->getAssignmentHistory($filters);
            } elseif ($action === 'export') {
                $serialNumbers = isset($_GET['serial_numbers']) ? explode(',', $_GET['serial_numbers']) : [];
                $result = $api->exportToCSV($serialNumbers);
                
                if ($result['success']) {
                    header('Content-Type: text/csv');
                    header('Content-Disposition: attachment; filename="' . $result['filename'] . '"');
                    echo $result['data'];
                    exit;
                }
            } else {
                $filters = $_GET;
                unset($filters['action']); // Remove action from filters
                $result = $api->getSerialNumbers($filters);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if ($action === 'bulk-upload') {
                $result = $api->createFromRange($input);
            } elseif ($action === 'assign') {
                $result = $api->assignToCustomer($input);
            } else {
                $result = ['success' => false, 'error' => 'Invalid action. Use ?action=bulk-upload or ?action=assign'];
            }
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (isset($input['serial_number']) && isset($input['status'])) {
                $result = $api->updateStatus(
                    $input['serial_number'], 
                    $input['status'], 
                    $input['reason'] ?? null
                );
            } else {
                $result = ['success' => false, 'error' => 'Missing required fields'];
            }
            break;
            
        default:
            $result = ['success' => false, 'error' => 'Method not allowed'];
            http_response_code(405);
            break;
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>