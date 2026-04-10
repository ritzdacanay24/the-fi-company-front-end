<?php
/**
 * Department Management API
 * Handles department CRUD operations and org chart structure
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db_connect = new EyefiDb\Databases\DatabaseEyefi();

class DepartmentAPI {
    private $db;
    private $user_id;

    public function __construct($database, $user_id = null) {
        $this->db = $database;
        $this->user_id = $user_id ?? 'api_user';
    }

    /**
     * Get all departments from users table
     */
    public function getDepartments($includeInactive = false) {
        try {
            // Get unique departments from users table
            $query = "
                SELECT 
                    dept_name as department_name,
                    COUNT(*) as user_count,
                    MIN(u.id) as id,
                    0 as display_order,
                    1 as is_active
                FROM (
                    SELECT 
                        u.id,
                        COALESCE(u.org_chart_department, u.department, 'Unassigned') as dept_name
                    FROM db.users u 
                    WHERE u.active = 1 
                    AND (u.org_chart_department IS NOT NULL OR u.department IS NOT NULL)
                ) u
                GROUP BY dept_name
                ORDER BY department_name ASC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute();
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
     * Get org chart structure for visualization
     */
    public function getOrgChartStructure() {
        try {
            // Get departments with their relationships
            $stmt = $this->db->prepare("
                SELECT 
                    d.id,
                    d.department_code,
                    d.department_name,
                    d.description,
                    d.parent_department_id,
                    d.department_head_user_id,
                    d.location,
                    d.display_order,
                    'department' as node_type,
                    (SELECT COUNT(*) 
                     FROM user_department_assignments uda 
                     WHERE uda.department_id = d.id 
                     AND uda.is_active = 1 
                     AND uda.is_primary_department = 1) as user_count
                FROM departments d
                WHERE d.is_active = 1
                ORDER BY d.display_order ASC, d.department_name ASC
            ");
            $stmt->execute();
            $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get users assigned to departments
            $stmt = $this->db->prepare("
                SELECT 
                    u.id as user_id,
                    u.department_id,
                    'user' as node_type,
                    COALESCE(CONCAT(u.first, ' ', u.last), u.username, CONCAT('User ID: ', u.id)) as display_name
                FROM db.users u
                WHERE u.active = 1 
                AND u.department_id IS NOT NULL
                ORDER BY u.department_id, u.first, u.last
            ");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Build hierarchical structure
            $orgChart = $this->buildHierarchy($departments, $users);

            return [
                'success' => true,
                'data' => [
                    'departments' => $departments,
                    'users' => $users,
                    'hierarchy' => $orgChart
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
     * Create new department by creating a placeholder user
     */
    public function createDepartment($data) {
        try {
            // Create a department placeholder user
            $stmt = $this->db->prepare("
                INSERT INTO db.users 
                (first, last, title, department, org_chart_department, active, type, orgChartPlaceHolder, openPosition) 
                VALUES (?, '', 'Department', ?, ?, 1, 3, 1, 1)
            ");
            
            $departmentName = $data['department_name'];
            
            $result = $stmt->execute([
                $departmentName, // first name = department name
                $departmentName, // department field
                $departmentName  // org_chart_department field
            ]);
            
            $departmentId = $this->db->lastInsertId();

            return [
                'success' => true,
                'message' => 'Department created successfully',
                'department_id' => $departmentId,
                'rows_affected' => $stmt->rowCount()
            ];

        } catch (PDOException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'error_code' => $e->getCode()
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Update department
     */
    public function updateDepartment($departmentId, $data) {
        try {
            $stmt = $this->db->prepare("
                UPDATE departments 
                SET department_name = ?, parent_department_id = ?, 
                    department_head_user_id = ?, display_order = ?
                WHERE id = ? AND is_active = 1
            ");
            
            $stmt->execute([
                $data['department_name'],
                $data['parent_department_id'] ?? null,
                $data['department_head_user_id'] ?? null,
                $data['display_order'] ?? 0,
                $departmentId
            ]);

            if ($stmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'error' => 'Department not found or already inactive'
                ];
            }

            return [
                'success' => true,
                'message' => 'Department updated successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Delete department placeholder user
     */
    public function deleteDepartment($departmentId) {
        try {
            // Check if department has users assigned to it
            $stmt = $this->db->prepare("
                SELECT org_chart_department, department 
                FROM db.users 
                WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1
            ");
            $stmt->execute([$departmentId]);
            $dept = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$dept) {
                return [
                    'success' => false,
                    'error' => 'Department not found'
                ];
            }

            $departmentName = $dept['org_chart_department'] ?: $dept['department'];

            // Check if department has users assigned to it
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as count 
                FROM db.users 
                WHERE (department = ? OR org_chart_department = ?) 
                AND active = 1 
                AND type != 3 
                AND orgChartPlaceHolder != 1
            ");
            $stmt->execute([$departmentName, $departmentName]);
            $userCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            if ($userCount > 0) {
                return [
                    'success' => false,
                    'error' => "Cannot delete department with assigned users ($userCount users found)"
                ];
            }

            // Delete the department placeholder user
            $stmt = $this->db->prepare("DELETE FROM db.users WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1");
            $stmt->execute([$departmentId]);

            if ($stmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'error' => 'Department not found'
                ];
            }

            return [
                'success' => true,
                'message' => 'Department deleted successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Assign user to department using existing department field
     */
    public function assignUserToDepartment($data) {
        try {
            // Get department name from department placeholder user
            $stmt = $this->db->prepare("
                SELECT org_chart_department, department 
                FROM db.users 
                WHERE id = ? AND type = 3 AND orgChartPlaceHolder = 1
            ");
            $stmt->execute([$data['department_id']]);
            $dept = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$dept) {
                return [
                    'success' => false,
                    'error' => 'Department not found'
                ];
            }

            $departmentName = $dept['org_chart_department'] ?: $dept['department'];

            // Check if user exists
            $stmt = $this->db->prepare("SELECT id FROM db.users WHERE id = ? AND active = 1");
            $stmt->execute([$data['user_id']]);
            if (!$stmt->fetch()) {
                return [
                    'success' => false,
                    'error' => 'User not found'
                ];
            }

            // Update user's department fields
            $stmt = $this->db->prepare("
                UPDATE db.users 
                SET department = ?, org_chart_department = ? 
                WHERE id = ?
            ");
            
            $stmt->execute([
                $departmentName,
                $departmentName,
                $data['user_id']
            ]);

            return [
                'success' => true,
                'message' => 'User assigned to department successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Remove user from department
     */
    public function removeUserFromDepartment($userId) {
        try {
            // Check if user exists
            $stmt = $this->db->prepare("SELECT id FROM db.users WHERE id = ?");
            $stmt->execute([$userId]);
            if (!$stmt->fetch()) {
                return [
                    'success' => false,
                    'error' => 'User not found'
                ];
            }

            // Remove user from department (set department_id to NULL)
            $stmt = $this->db->prepare("
                UPDATE db.users 
                SET department_id = NULL 
                WHERE id = ?
            ");
            
            $stmt->execute([$userId]);

            return [
                'success' => true,
                'message' => 'User removed from department successfully'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get available users for assignment
     */
    public function getAvailableUsers() {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    u.id,
                    COALESCE(CONCAT(TRIM(u.first), ' ', TRIM(u.last)), TRIM(u.first), CONCAT('User ', u.id)) as name,
                    u.email,
                    u.department,
                    u.org_chart_department,
                    u.title
                FROM db.users u 
                WHERE u.active = 1 
                AND u.type != 3
                AND u.orgChartPlaceHolder != 1
                ORDER BY u.first, u.last
                LIMIT 100
            ");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Debug method to check department status
     */
    public function debugDepartments() {
        try {
            // Get all departments including inactive ones
            $stmt = $this->db->prepare("
                SELECT id, department_name, is_active, 
                       created_at, updated_at 
                FROM departments 
                ORDER BY id
            ");
            $stmt->execute();
            $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get count of active vs inactive
            $stmt = $this->db->prepare("
                SELECT 
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_count,
                    COUNT(*) as total_count
                FROM departments
            ");
            $stmt->execute();
            $counts = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => [
                    'departments' => $departments,
                    'counts' => $counts
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
     * Seed sample departments if none exist
     */
    public function seedSampleDepartments() {
        try {
            // Check if departments already exist
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM departments WHERE is_active = 1");
            $stmt->execute();
            $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            if ($count > 0) {
                return [
                    'success' => true,
                    'message' => 'Departments already exist',
                    'count' => $count
                ];
            }

            // Create sample departments
            $sampleDepartments = [
                ['name' => 'Executive', 'parent' => null, 'head' => 1, 'order' => 1],
                ['name' => 'Information Technology', 'parent' => null, 'head' => 2, 'order' => 2],
                ['name' => 'Software Development', 'parent' => 2, 'head' => 3, 'order' => 1],
                ['name' => 'Network Administration', 'parent' => 2, 'head' => null, 'order' => 2],
                ['name' => 'Human Resources', 'parent' => null, 'head' => 4, 'order' => 3],
                ['name' => 'Finance', 'parent' => null, 'head' => 5, 'order' => 4],
                ['name' => 'Operations', 'parent' => null, 'head' => null, 'order' => 5],
                ['name' => 'Manufacturing', 'parent' => 7, 'head' => null, 'order' => 1],
                ['name' => 'Quality Assurance', 'parent' => 7, 'head' => null, 'order' => 2]
            ];

            $this->db->beginTransaction();

            // First pass - create departments without parent references
            $departmentMap = [];
            foreach ($sampleDepartments as $dept) {
                $stmt = $this->db->prepare("
                    INSERT INTO departments (department_name, department_head_user_id, display_order) 
                    VALUES (?, ?, ?)
                ");
                $stmt->execute([$dept['name'], $dept['head'], $dept['order']]);
                $departmentMap[$dept['name']] = $this->db->lastInsertId();
            }

            // Second pass - update parent relationships
            foreach ($sampleDepartments as $dept) {
                if ($dept['parent']) {
                    $parentName = array_keys($departmentMap)[$dept['parent'] - 1];
                    $parentId = $departmentMap[$parentName];
                    $currentId = $departmentMap[$dept['name']];

                    $stmt = $this->db->prepare("
                        UPDATE departments 
                        SET parent_department_id = ? 
                        WHERE id = ?
                    ");
                    $stmt->execute([$parentId, $currentId]);
                }
            }

            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Sample departments created successfully',
                'count' => count($sampleDepartments)
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
     * Get users in a department
     */
    public function getDepartmentUsers($departmentId) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    u.id,
                    u.username,
                    COALESCE(CONCAT(u.first, ' ', u.last), u.username) as full_name,
                    u.email,
                    u.department_id,
                    u.active,
                    u.created_at
                FROM db.users u
                WHERE u.department_id = ? AND u.active = 1
                ORDER BY u.first, u.last, u.username
            ");
            $stmt->execute([$departmentId]);
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
     * Build hierarchical structure for org chart
     */
    private function buildHierarchy($departments, $users) {
        $hierarchy = [];
        $departmentMap = [];

        // Create department map
        foreach ($departments as $dept) {
            $dept['children'] = [];
            $dept['users'] = [];
            $departmentMap[$dept['id']] = $dept;
        }

        // Add users to their departments
        foreach ($users as $user) {
            if (isset($departmentMap[$user['department_id']])) {
                $departmentMap[$user['department_id']]['users'][] = $user;
            }
        }

        // Build hierarchy
        foreach ($departmentMap as $dept) {
            if ($dept['parent_department_id'] === null) {
                $hierarchy[] = $dept;
            } else {
                if (isset($departmentMap[$dept['parent_department_id']])) {
                    $departmentMap[$dept['parent_department_id']]['children'][] = $dept;
                }
            }
        }

        return $hierarchy;
    }
}

// Handle the request
try {
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);
    
    $api = new DepartmentAPI($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $pathSegments = explode('/', trim($path, '/'));
    
    $action = end($pathSegments);
    $departmentId = isset($pathSegments[count($pathSegments) - 2]) ? $pathSegments[count($pathSegments) - 2] : null;
    
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            if ($action === 'org-chart') {
                $result = $api->getOrgChartStructure();
            } elseif ($action === 'users') {
                if ($departmentId) {
                    $result = $api->getDepartmentUsers($departmentId);
                } else {
                    $result = $api->getAvailableUsers();
                }
            } elseif ($action === 'seed') {
                $result = $api->seedSampleDepartments();
            } elseif ($action === 'debug') {
                $result = $api->debugDepartments();
            } else {
                $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === 'true';
                $result = $api->getDepartments($includeInactive);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            $action = $input['action'] ?? '';
            
            if ($action === 'assign') {
                $result = $api->assignUserToDepartment($input);
            } else {
                $result = $api->createDepartment($input);
            }
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            $departmentId = $input['id'] ?? null;
            
            if ($departmentId) {
                $result = $api->updateDepartment($departmentId, $input);
            } else {
                $result = ['success' => false, 'error' => 'Department ID required'];
            }
            break;
            
        case 'DELETE':
            $departmentId = $_GET['id'] ?? null;
            $userId = $_GET['user_id'] ?? null;
            
            if ($userId) {
                $result = $api->removeUserFromDepartment($userId);
            } elseif ($departmentId) {
                $result = $api->deleteDepartment($departmentId);
            } else {
                $result = ['success' => false, 'error' => 'Department ID or User ID required'];
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