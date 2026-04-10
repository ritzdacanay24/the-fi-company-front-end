<?php
/**
 * IGT Serial Number Management API
 * Handles IGT device serial number operations including retrieval and bulk assignment
 */

require_once __DIR__ . '/../../../../vendor/autoload.php';
require_once __DIR__ . '/IgtAssetGenerator.php';

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

class IGTSerialNumberAPI {
    private $db;
    private $user_id;
    private $user_full_name;

    public function __construct($database, $user_id = null, $user_full_name = 'System') {
        $this->db = $database;
        $this->user_id = $user_id ?? 'api_user';
        $this->user_full_name = $user_full_name;
    }

    /**
     * Get all IGT serial numbers with optional filtering
     */
    public function getAll($filters = []) {
        try {
            $query = "SELECT * FROM igt_serial_numbers WHERE is_active = 1";
            $params = [];

            // Apply filters
            if (!empty($filters['status'])) {
                $query .= " AND status = ?";
                $params[] = $filters['status'];
            }

            if (!empty($filters['category'])) {
                $query .= " AND category = ?";
                $params[] = $filters['category'];
            }

            if (!empty($filters['search'])) {
                $query .= " AND serial_number LIKE ?";
                $params[] = '%' . $filters['search'] . '%';
            }

            // Order by serial number
            $query .= " ORDER BY serial_number ASC";

            // Pagination
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
     * Bulk create IGT asset assignments
     */
    public function bulkCreate($assignments) {
        try {
            $this->db->beginTransaction();

            $createdAssets = [];
            $errors = [];
            $successCount = 0;

            foreach ($assignments as $assignment) {
                try {
                    $igtSerialNumber = $assignment['igt_serial_number'] ?? null;
                    $eyefiSerialNumber = $assignment['eyefi_serial_number'] ?? null;
                    $eyefiSerialId = $assignment['eyefi_serial_id'] ?? null;
                    $ulNumber = $assignment['ulNumber'] ?? null;
                    $ulLabelId = $assignment['ul_label_id'] ?? null;
                    $poNumber = $assignment['poNumber'] ?? null;
                    $partNumber = $assignment['partNumber'] ?? null;

                    // Check if IGT serial is available
                    $stmt = $this->db->prepare("
                        SELECT id, status FROM igt_serial_numbers 
                        WHERE serial_number = ? AND is_active = 1
                    ");
                    $stmt->execute([$igtSerialNumber]);
                    $igtSerial = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$igtSerial) {
                        $errors[] = "IGT serial '$igtSerialNumber' not found";
                        continue;
                    }

                    if ($igtSerial['status'] !== 'available') {
                        $errors[] = "IGT serial '$igtSerialNumber' is not available (status: {$igtSerial['status']})";
                        continue;
                    }

                    // Mark IGT serial as used
                    $stmt = $this->db->prepare("
                        UPDATE igt_serial_numbers 
                        SET status = 'used',
                            used_at = NOW(),
                            used_by = ?,
                            updated_at = NOW(),
                            updated_by = ?
                        WHERE serial_number = ? AND is_active = 1
                    ");
                    $stmt->execute([
                        $this->user_full_name,
                        $this->user_full_name,
                        $igtSerialNumber
                    ]);

                    // Create serial assignment tracking record
                    $stmt = $this->db->prepare("
                        INSERT INTO serial_assignments 
                        (eyefi_serial_id, eyefi_serial_number, ul_label_id, ul_number, 
                         po_number, part_number, status, inspector_name, consumed_by, consumed_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'consumed', ?, ?, NOW(), NOW())
                    ");
                    $stmt->execute([
                        $eyefiSerialId,
                        $eyefiSerialNumber,
                        $ulLabelId,
                        $ulNumber,
                        $poNumber,
                        $partNumber,
                        $this->user_full_name,
                        $this->user_full_name
                    ]);

                    $assignmentId = $this->db->lastInsertId();

                    // Mark EyeFi serial as consumed
                    if ($eyefiSerialId) {
                        $stmt = $this->db->prepare("
                            UPDATE eyefi_serial_numbers 
                            SET status = 'assigned',
                                assigned_at = NOW(),
                                assigned_by = ?,
                                updated_at = NOW(),
                                updated_by = ?
                            WHERE id = ?
                        ");
                        $stmt->execute([
                            $this->user_full_name,
                            $this->user_full_name,
                            $eyefiSerialId
                        ]);
                    }

                    // Mark UL label as consumed
                    if ($ulLabelId) {
                        $stmt = $this->db->prepare("
                            UPDATE ul_labels 
                            SET status = 'consumed',
                                consumed_at = NOW(),
                                consumed_by = ?,
                                updated_at = NOW(),
                                updated_by = ?
                            WHERE id = ?
                        ");
                        $stmt->execute([
                            $this->user_full_name,
                            $this->user_full_name,
                            $ulLabelId
                        ]);
                    }

                    $createdAssets[] = [
                        'generated_asset_number' => $igtSerialNumber,
                        'igt_serial_number' => $igtSerialNumber,
                        'eyefi_serial_number' => $eyefiSerialNumber,
                        'ul_number' => $ulNumber,
                        'assignment_id' => $assignmentId,
                        'poNumber' => $poNumber
                    ];

                    $successCount++;

                } catch (PDOException $e) {
                    $errors[] = "Error with IGT serial '$igtSerialNumber': " . $e->getMessage();
                }
            }

            $this->db->commit();

            return [
                'success' => true,
                'message' => "Bulk IGT assets created successfully",
                'count' => $successCount,
                'data' => $createdAssets,
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
}

// Handle the request
try {
    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }

    // Get user info from request
    $input = json_decode(file_get_contents('php://input'), true);
    $userFullName = $input['user_full_name'] ?? $_POST['user_full_name'] ?? 'System';
    
    $api = new IGTSerialNumberAPI($db, null, $userFullName);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    switch ($method) {
        case 'GET':
            $filters = $_GET;
            unset($filters['action']);
            $result = $api->getAll($filters);
            break;
            
        case 'POST':
            if ($action === 'bulkCreate') {
                $assignments = $input['assignments'] ?? [];
                
                // Use IgtAssetGenerator which extends BaseAssetGenerator
                // This ensures proper serial consumption tracking and prevents duplicates
                $generator = new IgtAssetGenerator($db);
                $generator->user_full_name = $userFullName;
                
                $result = $generator->bulkCreate($assignments);
            } else {
                $result = ['success' => false, 'error' => 'Invalid action'];
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
