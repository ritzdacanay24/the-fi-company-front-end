<?php
/**
 * Serial Number Availability API
 * Uses JOIN-based views instead of status columns
 * 
 * ONLY for PRE-LOADED serials:
 *   - EyeFi serial numbers
 *   - UL labels  
 *   - IGT serial numbers
 * 
 * NOT for GENERATED serials:
 *   - SG (Light & Wonder) - generated via formula, immediately consumed
 *   - AGS - generated via formula, immediately consumed
 */



use EyefiDb\Databases\DatabaseEyefi;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class SerialAvailabilityAPI {
    private $db;
    private $user_id;

    public function __construct($database, $user_id = null) {
        $this->db = $database;
        $this->user_id = $user_id ?? 'api_user';
    }

    /**
     * Get available EyeFi serials
     * Query directly from eyefi_serial_numbers table with status='available'
     */
    public function getAvailableEyefiSerials($quantity = 10) {
        try {
            // Cast to int for security (prevents SQL injection)
            $limit = (int)$quantity;
            
            // DEBUG: Log the query
            error_log("=== EYEFI SERIAL QUERY ===");
            error_log("Limit: " . $limit);
            
            $query = "SELECT 
                        id,
                        serial_number,
                        product_model,
                        hardware_version,
                        firmware_version,
                        batch_number,
                        status,
                        created_at
                      FROM eyefi_serial_numbers
                      WHERE status = 'available' 
                        AND is_active = 1
                      ORDER BY id ASC
                      LIMIT {$limit}";
            
            error_log("Query: " . $query);
            
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            // DEBUG: Log results
            error_log("Results count: " . count($results));
            if (count($results) > 0) {
                error_log("First result ID: " . $results[0]['id']);
                error_log("First result serial: " . $results[0]['serial_number']);
            }
            
            return [
                'success' => true,
                'data' => $results,
                'count' => count($results),
                'debug' => [
                    'query' => $query,
                    'first_id' => count($results) > 0 ? $results[0]['id'] : null,
                    'first_serial' => count($results) > 0 ? $results[0]['serial_number'] : null
                ]
            ];
        } catch (\Exception $e) {
            error_log("ERROR: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching available EyeFi serials: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get available UL labels
     * LEFT JOIN to ul_label_usages to exclude consumed ULs (legacy table)
     * Returns next available ULs in sequence
     */
    public function getAvailableUlLabels($quantity = 10) {
        try {
            // Cast to int for security (prevents SQL injection)
            $limit = (int)$quantity;
            
            // DEBUG: Log the query
            error_log("=== UL LABELS QUERY ===");
            error_log("Limit: " . $limit);
            
            $query = "SELECT 
                        ul.id,
                        ul.ul_number,
                        ul.description,
                        ul.category,
                        ul.manufacturer,
                        ul.part_number,
                        ul.status,
                        ul.created_at,
                        ulu.id as usage_id
                      FROM ul_labels ul
                      LEFT JOIN ul_label_usages ulu ON ul.id = ulu.ul_label_id
                      WHERE ul.status = 'active' 
                        AND ulu.id IS NULL
                      ORDER BY ul.ul_number ASC
                      LIMIT {$limit}";
            
            error_log("Query: " . $query);
            
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            // DEBUG: Log results
            error_log("Results count: " . count($results));
            if (count($results) > 0) {
                error_log("First result UL: " . $results[0]['ul_number']);
                error_log("First result ID: " . $results[0]['id']);
                error_log("First result usage_id: " . ($results[0]['usage_id'] ?? 'NULL'));
            }
            
            // Remove usage_id from results (it was just for debugging)
            foreach ($results as &$result) {
                unset($result['usage_id']);
            }
            
            return [
                'success' => true,
                'data' => $results,
                'count' => count($results),
                'debug' => [
                    'first_ul' => count($results) > 0 ? $results[0]['ul_number'] : null
                ]
            ];
        } catch (\Exception $e) {
            error_log("ERROR: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching available UL labels: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get recently used EyeFi serials
     * Query serial_assignments for last consumed EyeFi serials
     */
    public function getRecentlyUsedEyefiSerials($quantity = 10) {
        try {
            $limit = (int)$quantity;
            
            $query = "SELECT 
                        sa.id,
                        sa.serial_number,
                        sa.work_order_number,
                        sa.assigned_date,
                        sa.assigned_by,
                        esn.product_model,
                        esn.status
                      FROM serial_assignments sa
                      LEFT JOIN eyefi_serial_numbers esn ON sa.serial_id = esn.id
                      WHERE sa.serial_type = 'eyefi'
                      ORDER BY sa.assigned_date DESC, sa.id DESC
                      LIMIT {$limit}";
            
            error_log("=== RECENTLY USED EYEFI QUERY ===");
            error_log("Query: " . $query);
            
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            error_log("Recently used EyeFi count: " . count($results));
            
            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getRecentlyUsedEyefiSerials: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching recently used EyeFi serials: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get recently used UL labels
     * Query ul_label_usages for last consumed ULs
     */
    public function getRecentlyUsedUlLabels($quantity = 10) {
        try {
            $limit = (int)$quantity;
            
            $query = "SELECT 
                        ulu.id,
                        ulu.ul_number,
                        ulu.eyefi_serial_number,
                        ulu.wo_nbr as work_order_number,
                        ulu.date_used,
                        ulu.user_name,
                        ul.category,
                        ul.status
                      FROM ul_label_usages ulu
                      LEFT JOIN ul_labels ul ON ulu.ul_label_id = ul.id
                      ORDER BY ulu.date_used DESC, ulu.id DESC
                      LIMIT {$limit}";
            
            error_log("=== RECENTLY USED UL QUERY ===");
            error_log("Query: " . $query);
            
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            error_log("Recently used UL count: " . count($results));
            
            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getRecentlyUsedUlLabels: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching recently used UL labels: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get recently used IGT serials
     * Query serial_assignments for last consumed IGT serials
     */
    public function getRecentlyUsedIgtSerials($quantity = 10) {
        try {
            $limit = (int)$quantity;
            
            $query = "SELECT 
                        sa.id,
                        sa.serial_number,
                        sa.work_order_number,
                        sa.assigned_date,
                        sa.assigned_by,
                        igt.category,
                        igt.status
                      FROM serial_assignments sa
                      LEFT JOIN igt_serial_numbers igt ON sa.serial_id = igt.id
                      WHERE sa.serial_type = 'igt'
                      ORDER BY sa.assigned_date DESC, sa.id DESC
                      LIMIT {$limit}";
            
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching recently used IGT serials: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get available IGT serials
     * Query directly from igt_serial_numbers table with status='available'
     */
    public function getAvailableIgtSerials($quantity = 10) {
        try {
            // Cast to int for security (prevents SQL injection)
            $limit = (int)$quantity;
            
            $query = "SELECT 
                        id,
                        serial_number,
                        category,
                        status,
                        manufacturer,
                        model,
                        created_at
                      FROM igt_serial_numbers
                      WHERE status = 'available' 
                        AND is_active = 1
                      ORDER BY id ASC
                      LIMIT {$limit}";
            
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching available IGT serials: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get availability summary
     * Query directly from tables (no views needed)
     */
    public function getAvailabilitySummary() {
        try {
            $query = "
                SELECT 'EyeFi Serials' as serial_type, 
                       COUNT(*) as total_count,
                       SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_count,
                       SUM(CASE WHEN status != 'available' THEN 1 ELSE 0 END) as consumed_count
                FROM eyefi_serial_numbers
                WHERE is_active = 1
                
                UNION ALL
                
                SELECT 'UL Labels' as serial_type,
                       COUNT(*) as total_count,
                       SUM(CASE WHEN status = 'active' AND is_consumed = 0 THEN 1 ELSE 0 END) as available_count,
                       SUM(CASE WHEN status != 'active' OR is_consumed = 1 THEN 1 ELSE 0 END) as consumed_count
                FROM ul_labels
                
                UNION ALL
                
                SELECT 'IGT Serials' as serial_type,
                       COUNT(*) as total_count,
                       SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_count,
                       SUM(CASE WHEN status != 'available' THEN 1 ELSE 0 END) as consumed_count
                FROM igt_serial_numbers
                WHERE is_active = 1
            ";
            
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $results
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching availability summary: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Consume a serial (mark as used)
     * Just INSERT into serial_assignments - no status updates needed!
     */
    public function consumeSerial($data) {
        try {
            $this->db->beginTransaction();
            
            $query = "INSERT INTO serial_assignments (
                        serial_type,
                        serial_id,
                        serial_number,
                        work_order_number,
                        assigned_date,
                        assigned_by
                      ) VALUES (?, ?, ?, ?, GETDATE(), ?)";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['serial_type'],
                $data['serial_id'],
                $data['serial_number'],
                $data['work_order_number'] ?? null,
                $this->user_id
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Serial marked as consumed'
            ];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => 'Error consuming serial: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Bulk consume serials
     */
    public function consumeSerialsBulk($serials) {
        try {
            $this->db->beginTransaction();
            
            $query = "INSERT INTO serial_assignments (
                        serial_type,
                        serial_id,
                        serial_number,
                        work_order_number,
                        assigned_date,
                        assigned_by
                      ) VALUES (?, ?, ?, ?, GETDATE(), ?)";
            
            $stmt = $this->db->prepare($query);
            
            foreach ($serials as $serial) {
                $stmt->execute([
                    $serial['serial_type'],
                    $serial['serial_id'],
                    $serial['serial_number'],
                    $serial['work_order_number'] ?? null,
                    $this->user_id
                ]);
            }
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => count($serials) . ' serials marked as consumed'
            ];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => 'Error consuming serials: ' . $e->getMessage()
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
    
    $api = new SerialAvailabilityAPI($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    $result = null;
    
    switch ($method) {
        case 'GET':
            $action = isset($_GET['action']) ? $_GET['action'] : '';
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            
            switch ($action) {
                case 'get_available_eyefi_serials':
                    $result = $api->getAvailableEyefiSerials($limit);
                    break;
                case 'get_available_ul_labels':
                    $result = $api->getAvailableUlLabels($limit);
                    break;
                case 'get_available_igt_serials':
                    $result = $api->getAvailableIgtSerials($limit);
                    break;
                case 'get_recently_used_eyefi_serials':
                    $result = $api->getRecentlyUsedEyefiSerials($limit);
                    break;
                case 'get_recently_used_ul_labels':
                    $result = $api->getRecentlyUsedUlLabels($limit);
                    break;
                case 'get_recently_used_igt_serials':
                    $result = $api->getRecentlyUsedIgtSerials($limit);
                    break;
                case 'get_summary':
                    $result = $api->getAvailabilitySummary();
                    break;
                default:
                    $result = [
                        'success' => false,
                        'error' => 'Invalid action parameter. Use: get_available_eyefi_serials, get_available_ul_labels, get_available_igt_serials, or get_summary'
                    ];
            }
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (strpos($path, '/consume-bulk') !== false) {
                if (!isset($data['serials']) || !is_array($data['serials'])) {
                    $result = [
                        'success' => false,
                        'error' => 'Missing or invalid serials array'
                    ];
                } else {
                    $result = $api->consumeSerialsBulk($data['serials']);
                }
            } elseif (strpos($path, '/consume') !== false) {
                $result = $api->consumeSerial($data);
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
            break;
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
