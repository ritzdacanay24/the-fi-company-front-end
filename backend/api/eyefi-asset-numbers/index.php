<?php
/**
 * EYEFI Asset Number API
 * Handles asset number generation and management
 * Format: YYYYMMDDXXX (e.g., 20251105001)
 */

require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/AssetNumberGenerator.php';

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

class AssetNumberAPI {
    private $db;
    private $generator;
    private $user_full_name;

    public function __construct($database, $user_full_name = 'System') {
        $this->db = $database;
        $this->user_full_name = $user_full_name;
        $this->generator = new AssetNumberGenerator($database, $user_full_name);
    }

    /**
     * Get available asset numbers
     */
    public function getAvailableAssetNumbers() {
        try {
            $filters = [
                'status' => $_GET['status'] ?? 'available',
                'category' => $_GET['category'] ?? null,
                'limit' => $_GET['limit'] ?? 100
            ];

            return $this->generator->getAvailableAssetNumbers($filters);

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate new asset numbers
     * POST /api/eyefi-asset-numbers/generate
     * Body: { "quantity": 5, "category": "New" }
     */
    public function generateAssetNumbers() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $quantity = $data['quantity'] ?? 1;
            $category = $data['category'] ?? 'New';

            // Validate quantity
            if ($quantity < 1 || $quantity > 50) {
                return [
                    'success' => false,
                    'error' => 'Quantity must be between 1 and 50'
                ];
            }

            // Generate asset numbers
            $result = $this->generator->bulkGenerate($quantity, $category);

            return $result;

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Create bulk assignments
     * POST /api/eyefi-asset-numbers/bulk-assign
     * Body: { "assignments": [...] }
     */
    public function bulkCreateAssignments() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['assignments']) || !is_array($data['assignments'])) {
                return [
                    'success' => false,
                    'error' => 'Invalid assignments data'
                ];
            }

            $result = $this->generator->bulkCreateAssignments($data['assignments']);

            return $result;

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get assignment history
     */
    public function getAssignments() {
        try {
            $query = "SELECT 
                        a.*,
                        an.generation_date,
                        an.daily_sequence,
                        an.asset_number
                      FROM serial_assignments a
                      LEFT JOIN eyefi_asset_numbers an ON a.eyefi_asset_number_id = an.id
                      WHERE a.eyefi_asset_number_id IS NOT NULL";
            
            $params = [];

            // Filter by work order
            if (!empty($_GET['work_order'])) {
                $query .= " AND a.work_order_number = ?";
                $params[] = $_GET['work_order'];
            }

            // Filter by date range
            if (!empty($_GET['date_from'])) {
                $query .= " AND DATE(a.created_at) >= ?";
                $params[] = $_GET['date_from'];
            }

            if (!empty($_GET['date_to'])) {
                $query .= " AND DATE(a.created_at) <= ?";
                $params[] = $_GET['date_to'];
            }

            $query .= " ORDER BY a.created_at DESC";

            // Pagination
            if (!empty($_GET['limit'])) {
                $limit = (int)$_GET['limit'];
                $query .= " LIMIT $limit";
                
                if (!empty($_GET['offset'])) {
                    $offset = (int)$_GET['offset'];
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
     * Get daily statistics
     */
    public function getDailyStats() {
        try {
            $date = $_GET['date'] ?? date('Y-m-d');

            $query = "SELECT 
                        generation_date,
                        category,
                        COUNT(*) as total_generated,
                        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_count,
                        SUM(CASE WHEN status = 'consumed' THEN 1 ELSE 0 END) as consumed_count,
                        MAX(daily_sequence) as last_sequence
                      FROM eyefi_asset_numbers
                      WHERE generation_date = ?
                      GROUP BY generation_date, category";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$date]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results,
                'date' => $date
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}

// Initialize API
try {
    $database = DatabaseEyefi::getInstance();
    $userFullName = $_SERVER['HTTP_X_USER_FULL_NAME'] ?? 'API User';
    $api = new AssetNumberAPI($database, $userFullName);

    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_SERVER['PATH_INFO'] ?? '';
    $action = $_GET['action'] ?? '';

    $response = [];

    // Route requests - support both PATH_INFO and query parameters
    switch ($method) {
        case 'GET':
            if (strpos($path, '/available') !== false || $action === 'available') {
                $response = $api->getAvailableAssetNumbers();
            } elseif (strpos($path, '/assignments') !== false || $action === 'assignments') {
                $response = $api->getAssignments();
            } elseif (strpos($path, '/stats') !== false || $action === 'stats') {
                $response = $api->getDailyStats();
            } else {
                $response = $api->getAvailableAssetNumbers();
            }
            break;

        case 'POST':
            if (strpos($path, '/generate') !== false || $action === 'generate') {
                $response = $api->generateAssetNumbers();
            } elseif (strpos($path, '/bulk-assign') !== false || $action === 'bulk-assign') {
                $response = $api->bulkCreateAssignments();
            } else {
                $response = [
                    'success' => false,
                    'error' => 'Invalid endpoint. Use /generate or /bulk-assign'
                ];
            }
            break;

        default:
            $response = [
                'success' => false,
                'error' => 'Method not allowed'
            ];
            break;
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
