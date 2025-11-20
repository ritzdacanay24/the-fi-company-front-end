<?php
/**
 * Owners API
 * Handles all CRUD operations for owner management
 * Admin-only access for create/update/delete operations
 * Compatible with MySQL 5.7+ and 8.0+
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, AuthorizationTwoStep');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../config/database.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

class OwnersAPI {
    private $db;
    private $userId;
    
    public function __construct($database, $userId = 'system') {
        $this->db = $database;
        $this->userId = $userId;
    }
    
    /**
     * Check if user has admin permission for owners
     */
    private function isAdmin($userId = null) {
        try {
            if (!$userId) return false;
            
            // Check if user is in owner_admin_users table
            $query = "SELECT COUNT(*) as count FROM owner_admin_users WHERE user_id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result['count'] > 0;
        } catch (Exception $e) {
            error_log('Error checking admin status: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check if user can see all owners (is admin)
     */
    private function canSeeAllOwners($userId = null) {
        return $this->isAdmin($userId);
    }
    
    /**
     * Get owners available to a specific user
     * If user is admin, returns all active owners
     * Otherwise, returns only owners assigned to that user
     */
    public function getOwnersForUser($userId, $activeOnly = true) {
        try {
            // Check if user is admin
            if ($this->canSeeAllOwners($userId)) {
                // Admin sees all owners
                return $this->getAllOwners($activeOnly);
            }
            
            // Regular user sees only assigned owners
            $query = "SELECT DISTINCT
                        o.id, 
                        o.name, 
                        o.email, 
                        o.department,
                        o.description,
                        o.display_order,
                        o.is_active,
                        o.created_at,
                        o.created_by,
                        o.updated_at,
                        o.updated_by
                    FROM owners o
                    INNER JOIN user_owners uo ON uo.owner_id = o.id
                    WHERE uo.user_id = ?";
            
            if ($activeOnly) {
                $query .= " AND o.is_active = TRUE";
            }
            
            $query .= " ORDER BY o.display_order ASC, o.name ASC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$userId]);
            
            $owners = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $owners,
                'count' => count($owners),
                'is_admin' => false
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch owners for user: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all owners (active and inactive based on filter)
     */
    public function getAllOwners($activeOnly = false) {
        try {
            if ($activeOnly) {
                $query = "SELECT * FROM active_owners";
            } else {
                $query = "SELECT 
                    id, 
                    name, 
                    email, 
                    department,
                    description,
                    display_order, 
                    is_active,
                    created_at,
                    created_by,
                    updated_at,
                    updated_by
                FROM owners 
                ORDER BY is_active DESC, display_order ASC, name ASC";
            }
            
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $owners = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $owners,
                'count' => count($owners)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch owners: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get owner by ID
     */
    public function getOwnerById($id) {
        try {
            $query = "SELECT 
                id, 
                name, 
                email, 
                department,
                description,
                display_order, 
                is_active,
                created_at,
                created_by,
                updated_at,
                updated_by
            FROM owners 
            WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            
            $owner = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($owner) {
                return [
                    'success' => true,
                    'data' => $owner
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Owner not found'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch owner: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Create a new owner (admin only)
     */
    public function createOwner($data, $createdBy = 'system') {
        try {
            // Check admin permission
            if (!$this->isAdmin($createdBy)) {
                return [
                    'success' => false,
                    'error' => 'Insufficient permissions. Admin access required.'
                ];
            }
            
            // Validate required fields
            if (empty($data['name'])) {
                return [
                    'success' => false,
                    'error' => 'Owner name is required'
                ];
            }
            
            // Check for duplicate name
            $checkQuery = "SELECT id FROM owners WHERE name = ?";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([$data['name']]);
            if ($checkStmt->fetch()) {
                return [
                    'success' => false,
                    'error' => 'An owner with this name already exists'
                ];
            }
            
            $query = "INSERT INTO owners 
                     (name, email, department, description, display_order, is_active, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([
                $data['name'],
                $data['email'] ?? null,
                $data['department'] ?? null,
                $data['description'] ?? null,
                $data['display_order'] ?? 999,
                isset($data['is_active']) ? ($data['is_active'] ? 1 : 0) : 1,
                $createdBy
            ]);
            
            if ($result) {
                $newId = $this->db->lastInsertId();
                return [
                    'success' => true,
                    'message' => 'Owner created successfully',
                    'id' => $newId
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to create owner'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Update an existing owner (admin only)
     */
    public function updateOwner($id, $data, $updatedBy = 'system') {
        try {
            // Check admin permission
            if (!$this->isAdmin($updatedBy)) {
                return [
                    'success' => false,
                    'error' => 'Insufficient permissions. Admin access required.'
                ];
            }
            
            // Check if owner exists
            $checkQuery = "SELECT id FROM owners WHERE id = ?";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([$id]);
            if (!$checkStmt->fetch()) {
                return [
                    'success' => false,
                    'error' => 'Owner not found'
                ];
            }
            
            // Build dynamic update query based on provided fields
            $updateFields = [];
            $updateValues = [];
            
            $allowedFields = ['name', 'email', 'department', 'description', 'display_order', 'is_active'];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateFields[] = "$field = ?";
                    if ($field === 'is_active') {
                        $updateValues[] = $data[$field] ? 1 : 0;
                    } else {
                        $updateValues[] = $data[$field];
                    }
                }
            }
            
            if (empty($updateFields)) {
                return [
                    'success' => false,
                    'error' => 'No valid fields to update'
                ];
            }
            
            // Add updated_by and updated_at
            $updateFields[] = "updated_by = ?";
            $updateFields[] = "updated_at = CURRENT_TIMESTAMP";
            $updateValues[] = $updatedBy;
            
            // Add ID for WHERE clause
            $updateValues[] = $id;
            
            $query = "UPDATE owners SET " . implode(', ', $updateFields) . " WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute($updateValues);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Owner updated successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to update owner'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Delete an owner (soft delete - marks as inactive) (admin only)
     */
    public function deleteOwner($id, $deletedBy = 'system') {
        try {
            // Check admin permission
            if (!$this->isAdmin($deletedBy)) {
                return [
                    'success' => false,
                    'error' => 'Insufficient permissions. Admin access required.'
                ];
            }
            
            // Soft delete - mark as inactive
            $query = "UPDATE owners SET is_active = FALSE, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([$deletedBy, $id]);
            
            if ($result && $stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Owner deactivated successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Owner not found or already inactive'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Reorder owners display order
     */
    public function reorderOwners($orderUpdates, $updatedBy = 'system') {
        try {
            // Check admin permission
            if (!$this->isAdmin($updatedBy)) {
                return [
                    'success' => false,
                    'error' => 'Insufficient permissions. Admin access required.'
                ];
            }
            
            $this->db->beginTransaction();
            
            $query = "UPDATE owners SET display_order = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            $stmt = $this->db->prepare($query);
            
            foreach ($orderUpdates as $update) {
                if (empty($update['id']) || !isset($update['display_order'])) {
                    $this->db->rollBack();
                    return [
                        'success' => false,
                        'error' => 'Invalid order update data'
                    ];
                }
                
                $stmt->execute([
                    $update['display_order'],
                    $updatedBy,
                    $update['id']
                ]);
            }
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Owner order updated successfully'
            ];
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            return [
                'success' => false,
                'error' => 'Failed to reorder owners: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Assign an owner to a user
     */
    public function assignOwnerToUser($userId, $ownerId, $createdBy = 'system') {
        try {
            // Check admin permission
            if (!$this->isAdmin($createdBy)) {
                return [
                    'success' => false,
                    'error' => 'Insufficient permissions. Admin access required.'
                ];
            }
            
            // Check if assignment already exists
            $checkQuery = "SELECT id FROM user_owners WHERE user_id = ? AND owner_id = ?";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([$userId, $ownerId]);
            
            if ($checkStmt->fetch()) {
                return [
                    'success' => false,
                    'error' => 'Owner is already assigned to this user'
                ];
            }
            
            $query = "INSERT INTO user_owners (user_id, owner_id, created_by) VALUES (?, ?, ?)";
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([$userId, $ownerId, $createdBy]);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Owner assigned to user successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to assign owner to user'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Remove owner assignment from a user
     */
    public function removeOwnerFromUser($userId, $ownerId, $deletedBy = 'system') {
        try {
            // Check admin permission
            if (!$this->isAdmin($deletedBy)) {
                return [
                    'success' => false,
                    'error' => 'Insufficient permissions. Admin access required.'
                ];
            }
            
            $query = "DELETE FROM user_owners WHERE user_id = ? AND owner_id = ?";
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([$userId, $ownerId]);
            
            if ($result && $stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Owner assignment removed successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Assignment not found'
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all users assigned to an owner
     */
    public function getUsersForOwner($ownerId) {
        try {
            $query = "SELECT 
                        u.id as user_id,
                        u.username,
                        CONCAT(u.first, ' ', u.last) as full_name,
                        u.email,
                        uo.created_at
                    FROM user_owners uo
                    INNER JOIN db.users u ON uo.user_id = u.id
                    WHERE uo.owner_id = ? AND u.active = 1
                    ORDER BY u.first, u.last";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$ownerId]);
            
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $users,
                'count' => count($users)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch users: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all owners assigned to a user
     */
    public function getOwnersForUserAssignments($userId) {
        try {
            $query = "SELECT 
                        o.id,
                        o.id as owner_id,
                        o.name,
                        o.email,
                        o.department,
                        o.description,
                        o.display_order,
                        uo.created_at
                    FROM user_owners uo
                    INNER JOIN owners o ON uo.owner_id = o.id
                    WHERE uo.user_id = ? AND o.is_active = TRUE
                    ORDER BY o.display_order, o.name";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$userId]);
            
            $owners = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $owners,
                'count' => count($owners)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch owner assignments: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all admin users
     */
    public function getAdminUsers() {
        try {
            $query = "SELECT 
                        oa.user_id,
                        oa.created_at,
                        oa.created_by,
                        u.first,
                        u.last,
                        u.email
                    FROM owner_admin_users oa
                    LEFT JOIN db.users u ON u.id = oa.user_id
                    ORDER BY oa.created_at DESC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $admins,
                'count' => count($admins)
            ];
        } catch (Exception $e) {
            error_log('Error fetching admin users: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to fetch admin users: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Add a user as admin
     */
    public function addAdminUser($userId, $createdBy = 'system') {
        try {
            // Check if user is already an admin
            $checkQuery = "SELECT COUNT(*) as count FROM owner_admin_users WHERE user_id = ?";
            $checkStmt = $this->db->prepare($checkQuery);
            $checkStmt->execute([$userId]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing['count'] > 0) {
                return [
                    'success' => false,
                    'error' => 'User is already an admin'
                ];
            }
            
            // Add user as admin
            $query = "INSERT INTO owner_admin_users (user_id, created_by, created_at) 
                     VALUES (?, ?, NOW())";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$userId, $createdBy]);
            
            return [
                'success' => true,
                'message' => 'Admin user added successfully'
            ];
        } catch (Exception $e) {
            error_log('Error adding admin user: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to add admin user: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Remove admin access from a user
     */
    public function removeAdminUser($userId, $removedBy = 'system') {
        try {
            $query = "DELETE FROM owner_admin_users WHERE user_id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$userId]);
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Admin access removed successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Admin user not found'
                ];
            }
        } catch (Exception $e) {
            error_log('Error removing admin user: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to remove admin user: ' . $e->getMessage()
            ];
        }
    }
}

// Initialize API
try {
    $api = new OwnersAPI($db, 'system');
    
    // Get request method
    $method = $_SERVER['REQUEST_METHOD'];
    
    // Parse request body for POST/PUT requests
    $requestBody = null;
    if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
        $requestBody = json_decode(file_get_contents('php://input'), true);
    }
    
    // Get user ID from request body or use default
    $requestUserId = isset($requestBody['user_id']) ? $requestBody['user_id'] : 'system';
    
    // Route handling
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? '';
            
            if ($action === 'for-user') {
                // Get owners available to a specific user
                $userId = $_GET['user_id'] ?? null;
                if ($userId) {
                    $activeOnly = isset($_GET['active']) && $_GET['active'] === 'true';
                    $response = $api->getOwnersForUser($userId, $activeOnly);
                } else {
                    $response = [
                        'success' => false,
                        'error' => 'user_id parameter is required'
                    ];
                }
            } elseif ($action === 'users-for-owner') {
                // Get users assigned to an owner
                $ownerId = $_GET['owner_id'] ?? null;
                if ($ownerId) {
                    $response = $api->getUsersForOwner($ownerId);
                } else {
                    $response = [
                        'success' => false,
                        'error' => 'owner_id parameter is required'
                    ];
                }
            } elseif ($action === 'owner-assignments') {
                // Get owner assignments for a user
                $userId = $_GET['user_id'] ?? null;
                if ($userId) {
                    $response = $api->getOwnersForUserAssignments($userId);
                } else {
                    $response = [
                        'success' => false,
                        'error' => 'user_id parameter is required'
                    ];
                }
            } elseif ($action === 'get-admin-users') {
                // Get all admin users
                $response = $api->getAdminUsers();
            } elseif (isset($_GET['id'])) {
                // Get specific owner by ID
                $response = $api->getOwnerById($_GET['id']);
            } else {
                // Get all owners
                $activeOnly = isset($_GET['active']) && $_GET['active'] === 'true';
                $response = $api->getAllOwners($activeOnly);
            }
            break;
            
        case 'POST':
            $action = $requestBody['action'] ?? '';
            
            if ($action === 'reorder') {
                // Reorder owners
                $response = $api->reorderOwners($requestBody['orders'], $requestUserId);
            } elseif ($action === 'assign-to-user') {
                // Assign owner to user
                $userId = $requestBody['user_id'] ?? null;
                $ownerId = $requestBody['owner_id'] ?? null;
                if ($userId && $ownerId) {
                    $response = $api->assignOwnerToUser($userId, $ownerId, $requestUserId);
                } else {
                    $response = [
                        'success' => false,
                        'error' => 'user_id and owner_id are required'
                    ];
                }
            } elseif ($action === 'remove-from-user') {
                // Remove owner from user
                $userId = $requestBody['user_id'] ?? null;
                $ownerId = $requestBody['owner_id'] ?? null;
                if ($userId && $ownerId) {
                    $response = $api->removeOwnerFromUser($userId, $ownerId, $requestUserId);
                } else {
                    $response = [
                        'success' => false,
                        'error' => 'user_id and owner_id are required'
                    ];
                }
            } elseif ($action === 'add-admin-user') {
                // Add admin user
                $userId = $requestBody['user_id'] ?? null;
                $createdBy = $requestBody['created_by'] ?? $requestUserId;
                if ($userId) {
                    $response = $api->addAdminUser($userId, $createdBy);
                } else {
                    $response = [
                        'success' => false,
                        'error' => 'user_id is required'
                    ];
                }
            } elseif ($action === 'remove-admin-user') {
                // Remove admin user
                $userId = $requestBody['user_id'] ?? null;
                $removedBy = $requestBody['removed_by'] ?? $requestUserId;
                if ($userId) {
                    $response = $api->removeAdminUser($userId, $removedBy);
                } else {
                    $response = [
                        'success' => false,
                        'error' => 'user_id is required'
                    ];
                }
            } else {
                // Create new owner
                $response = $api->createOwner($requestBody, $requestUserId);
            }
            break;
            
        case 'PUT':
            // Update existing owner
            if (empty($requestBody['id'])) {
                $response = [
                    'success' => false,
                    'error' => 'Owner ID is required for update'
                ];
            } else {
                $response = $api->updateOwner($requestBody['id'], $requestBody, $requestUserId);
            }
            break;
            
        case 'DELETE':
            // Delete owner (soft delete)
            if (empty($requestBody['id'])) {
                $response = [
                    'success' => false,
                    'error' => 'Owner ID is required for deletion'
                ];
            } else {
                $response = $api->deleteOwner($requestBody['id'], $requestUserId);
            }
            break;
            
        default:
            $response = [
                'success' => false,
                'error' => 'Method not allowed'
            ];
            http_response_code(405);
            break;
    }
    
    // Send response
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
