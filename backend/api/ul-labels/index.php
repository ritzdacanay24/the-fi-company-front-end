<?php
/**
 * UL Labels API
 * Handles all UL label operations including CRUD and search
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

class ULLabelsAPI {
    private $db;
    private $user_id;

    public function __construct($database, $user_id = null) {
        $this->db = $database;
        $this->user_id = $user_id ?? 'api_user';
    }

    /**
     * Get all UL labels with optional filtering and search
     */
    public function getULLabels($filters = []) {
        try {
            $query = "SELECT 
                ul.*,
                COALESCE(
                    (SELECT SUM(quantity_used) 
                     FROM ul_label_usages 
                     WHERE ul_number = ul.ul_number AND status != 'deleted'),
                    0
                ) as total_used
            FROM ul_labels ul";
            
            // LEFT JOIN to ul_label_usages to exclude consumed ULs when available filter is on
            $useLeftJoin = !empty($filters['available']) && $filters['available'] === 'true';
            if ($useLeftJoin) {
                $query .= " LEFT JOIN ul_label_usages ulu ON ul.id = ulu.ul_label_id";
            }
            
            $query .= " WHERE 1=1";
            $params = [];

            // Apply filters
            if (!empty($filters['id'])) {
                $query .= " AND ul.id = ?";
                $params[] = $filters['id'];
            }

            // Search filter - searches ul_number and description
            if (!empty($filters['search'])) {
                $query .= " AND (ul.ul_number LIKE ? OR ul.description LIKE ?)";
                $searchTerm = '%' . $filters['search'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }

            // Category filter
            if (!empty($filters['category'])) {
                $query .= " AND ul.category = ?";
                $params[] = $filters['category'];
            }

            // Status filter
            if (!empty($filters['status'])) {
                $query .= " AND ul.status = ?";
                $params[] = $filters['status'];
            }

            // Available filter - exclude ULs that have usage records (legacy approach)
            if ($useLeftJoin) {
                $query .= " AND ul.status = 'active' AND ulu.id IS NULL";
            }

            if (!empty($filters['manufacturer'])) {
                $query .= " AND ul.manufacturer LIKE ?";
                $params[] = '%' . $filters['manufacturer'] . '%';
            }

            if (!empty($filters['date_from'])) {
                $query .= " AND ul.created_at >= ?";
                $params[] = $filters['date_from'] . ' 00:00:00';
            }

            if (!empty($filters['date_to'])) {
                $query .= " AND ul.created_at <= ?";
                $params[] = $filters['date_to'] . ' 23:59:59';
            }

            // Sorting
            $sortBy = $filters['sort'] ?? 'ul_number';
            $sortOrder = $filters['order'] ?? 'ASC';
            
            // Map frontend sort field to database column
            $sortMap = [
                'ul_number' => 'ul.ul_number',
                'description' => 'ul.description',
                'category' => 'ul.category',
                'status' => 'ul.status',
                'created_at' => 'ul.created_at'
            ];
            
            $sortColumn = $sortMap[$sortBy] ?? 'ul.ul_number';
            $sortOrder = strtoupper($sortOrder) === 'DESC' ? 'DESC' : 'ASC';
            
            $query .= " ORDER BY $sortColumn $sortOrder";

            // Pagination
            if (!empty($filters['limit'])) {
                $limit = (int)$filters['limit'];
                $offset = !empty($filters['offset']) ? (int)$filters['offset'] : 0;
                $query .= " LIMIT $limit OFFSET $offset";
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
                'message' => 'Error fetching UL labels: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get a single UL label by ID
     */
    public function getULLabelById($id) {
        try {
            $query = "SELECT 
                ul.*,
                COALESCE(
                    (SELECT SUM(quantity_used) 
                     FROM ul_label_usages 
                     WHERE ul_number = ul.ul_number AND status != 'deleted'),
                    0
                ) as total_used
            FROM ul_labels ul
            WHERE ul.id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result) {
                return [
                    'success' => true,
                    'data' => $result
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'UL label not found'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error fetching UL label: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create a new UL label
     */
    public function createULLabel($data) {
        try {
            $query = "INSERT INTO ul_labels 
                (ul_number, description, category, manufacturer, status, created_by) 
                VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['ul_number'],
                $data['description'] ?? '',
                $data['category'] ?? 'New',
                $data['manufacturer'] ?? null,
                $data['status'] ?? 'active',
                $this->user_id
            ]);

            $newId = $this->db->lastInsertId();

            return [
                'success' => true,
                'message' => 'UL label created successfully',
                'data' => ['id' => $newId]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error creating UL label: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update a UL label
     */
    public function updateULLabel($id, $data) {
        try {
            $query = "UPDATE ul_labels SET 
                ul_number = ?,
                description = ?,
                category = ?,
                manufacturer = ?,
                status = ?,
                updated_by = ?,
                updated_at = NOW()
                WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['ul_number'],
                $data['description'] ?? '',
                $data['category'] ?? 'New',
                $data['manufacturer'] ?? null,
                $data['status'] ?? 'active',
                $this->user_id,
                $id
            ]);

            return [
                'success' => true,
                'message' => 'UL label updated successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error updating UL label: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete a UL label
     */
    public function deleteULLabel($id) {
        try {
            // Check if label is in use
            $checkQuery = "SELECT COUNT(*) as usage_count 
                          FROM ul_label_usages 
                          WHERE ul_number = (SELECT ul_number FROM ul_labels WHERE id = ?) 
                          AND status != 'deleted'";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([$id]);
            $result = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($result['usage_count'] > 0) {
                return [
                    'success' => false,
                    'message' => 'Cannot delete UL label that is in use. Please remove all usages first.'
                ];
            }

            $query = "DELETE FROM ul_labels WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);

            return [
                'success' => true,
                'message' => 'UL label deleted successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error deleting UL label: ' . $e->getMessage()
            ];
        }
    }
}

// Initialize database connection
try {
    $database = new DatabaseEyefi();
    $db = $database->getConnection();
    $api = new ULLabelsAPI($db);

    // Handle different HTTP methods
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            if (!empty($_GET['id'])) {
                $result = $api->getULLabelById($_GET['id']);
            } else {
                // Build filters from query parameters
                $filters = [];
                $allowedFilters = ['search', 'category', 'status', 'available', 'manufacturer', 
                                  'date_from', 'date_to', 'sort', 'order', 'limit', 'offset'];
                
                foreach ($allowedFilters as $filter) {
                    if (isset($_GET[$filter])) {
                        $filters[$filter] = $_GET[$filter];
                    }
                }
                
                $result = $api->getULLabels($filters);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $result = $api->createULLabel($data);
            break;

        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($_GET['id'])) {
                $result = [
                    'success' => false,
                    'message' => 'ID is required for update'
                ];
            } else {
                $result = $api->updateULLabel($_GET['id'], $data);
            }
            break;

        case 'DELETE':
            if (empty($_GET['id'])) {
                $result = [
                    'success' => false,
                    'message' => 'ID is required for delete'
                ];
            } else {
                $result = $api->deleteULLabel($_GET['id']);
            }
            break;

        default:
            $result = [
                'success' => false,
                'message' => 'Method not allowed'
            ];
            break;
    }

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection error: ' . $e->getMessage()
    ]);
}
