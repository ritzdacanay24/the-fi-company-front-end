<?php
/**
 * Shipping Priorities API
 * Handles all CRUD operations for shipping order priorities
 * Compatible with MySQL 5.7+ and 8.0+
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database configuration
require_once '../../config/database.php';

class ShippingPrioritiesAPI {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    /**
     * Get all active shipping priorities
     */
    public function getAllPriorities() {
        try {
            $query = "SELECT * FROM active_shipping_priorities ORDER BY priority_level ASC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $priorities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $priorities,
                'count' => count($priorities)
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch priorities: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Add a new shipping priority
     */
    public function addPriority($data) {
        try {
            // Validate required fields
            $required = ['order_id', 'sales_order_number', 'priority_level', 'created_by'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return [
                        'success' => false,
                        'error' => "Required field '$field' is missing"
                    ];
                }
            }
            
            $query = "INSERT INTO shipping_priorities 
                     (order_id, sales_order_number, sales_order_line, priority_level, notes, created_by) 
                     VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([
                $data['order_id'],
                $data['sales_order_number'],
                $data['sales_order_line'] ?? null,
                $data['priority_level'],
                $data['notes'] ?? null,
                $data['created_by']
            ]);
            
            if ($result) {
                $newId = $this->db->lastInsertId();
                return [
                    'success' => true,
                    'message' => 'Priority added successfully',
                    'id' => $newId
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to add priority'
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
     * Update shipping priority
     */
    public function updatePriority($id, $data) {
        try {
            // Validate ID
            if (empty($id) || !is_numeric($id)) {
                return [
                    'success' => false,
                    'error' => 'Invalid priority ID'
                ];
            }
            
            // Build dynamic update query
            $fields = [];
            $values = [];
            
            $allowedFields = ['priority_level', 'notes', 'updated_by', 'is_active'];
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $fields[] = "$field = ?";
                    $values[] = $data[$field];
                }
            }
            
            if (empty($fields)) {
                return [
                    'success' => false,
                    'error' => 'No valid fields to update'
                ];
            }
            
            $values[] = $id; // Add ID for WHERE clause
            
            $query = "UPDATE shipping_priorities SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute($values);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Priority updated successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to update priority'
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
     * Remove shipping priority (hard delete)
     */
    public function removePriority($id, $updatedBy = null) {
        try {
            // Validate ID
            if (empty($id) || !is_numeric($id)) {
                return [
                    'success' => false,
                    'error' => 'Invalid priority ID'
                ];
            }
            
            // Hard delete the priority record
            $query = "DELETE FROM shipping_priorities WHERE id = ? AND is_active = TRUE";
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([$id]);
            
            $rowsAffected = $stmt->rowCount();
            
            if ($result && $rowsAffected > 0) {
                return [
                    'success' => true,
                    'message' => 'Priority deleted successfully'
                ];
            } else if ($rowsAffected === 0) {
                return [
                    'success' => false,
                    'error' => 'Priority not found or already inactive'
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to delete priority'
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
     * Reorder priorities - replace all priorities with new array
     */
    public function reorderPriorities($priorityUpdates, $updatedBy = null, $debug = false) {
        try {
            // Debug logging
            error_log('Reorder request received: ' . json_encode($priorityUpdates));
            error_log('Updated by: ' . $updatedBy);
            
            // Start transaction
            $this->db->beginTransaction();
            
            // Simple approach: Delete all existing priorities for these orders, then insert new ones
            $orderIds = array_map(function($update) { return $update['id']; }, $priorityUpdates);
            $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
            
            // Get existing priority records to preserve other data
            $query = "SELECT * FROM shipping_priorities WHERE id IN ($placeholders) AND is_active = TRUE";
            $stmt = $this->db->prepare($query);
            $stmt->execute($orderIds);
            $existingRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Create a map of id to existing record
            $recordMap = [];
            foreach ($existingRecords as $record) {
                $recordMap[$record['id']] = $record;
            }
            
            // Prepare diagnostics container when debug is requested
            $diagnostics = [];

            // Update each priority record with new priority_level
            foreach ($priorityUpdates as $update) {
                if (empty($update['id']) || !isset($update['priority_level'])) {
                    error_log('Invalid priority update data: ' . json_encode($update));
                    $this->db->rollback();
                    return [
                        'success' => false,
                        'error' => 'Invalid priority update data: missing id or priority_level'
                    ];
                }
                
                $query = "UPDATE shipping_priorities SET priority_level = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = TRUE";
                $stmt = $this->db->prepare($query);
                $result = $stmt->execute([
                    $update['priority_level'],
                    $updatedBy,
                    $update['id']
                ]);
                
                $rowsAffected = $stmt->rowCount();
                error_log("Updated priority for ID {$update['id']}: new priority {$update['priority_level']}, affected {$rowsAffected} rows");

                // Collect diagnostics for this update
                if ($debug) {
                    $diagnostics[] = [
                        'id' => $update['id'],
                        'priority_level' => $update['priority_level'],
                        'rowsAffected' => $rowsAffected
                    ];
                }
                
                if (!$result) {
                    error_log('Failed to update priority for ID: ' . $update['id']);
                    $this->db->rollback();
                    return [
                        'success' => false,
                        'error' => 'Failed to update priority for ID: ' . $update['id']
                    ];
                }
                
                if ($rowsAffected === 0) {
                    error_log('Warning: No rows affected for ID: ' . $update['id']);
                }
            }
            
            $this->db->commit();
            error_log('All priorities reordered successfully');
            $response = [
                'success' => true,
                'message' => 'Priorities reordered successfully'
            ];

            if ($debug) {
                $response['debug'] = $diagnostics;
            }

            return $response;
        } catch (Exception $e) {
            error_log('Reorder error: ' . $e->getMessage());
            $this->db->rollback();
            $resp = [
                'success' => false,
                'error' => 'Database error: ' . $e->getMessage()
            ];

            if ($debug) {
                $resp['debug'] = isset($diagnostics) ? $diagnostics : [];
            }

            return $resp;
        }
    }

    /**
     * Atomically apply a single priority change (add, move, or remove) and shift others.
     * Expects: order_id, sales_order_number, sales_order_line, priority (int), notes, updated_by, created_by
     */
    public function applyPriorityChange($orderId, $salesOrderNumber = null, $salesOrderLine = null, $priority = 0, $notes = null, $updatedBy = null, $createdBy = null) {
        try {
            // Normalize inputs
            $priority = intval($priority);

            $this->db->beginTransaction();

            // Lock the target record (if exists)
            $stmt = $this->db->prepare("SELECT * FROM shipping_priorities WHERE order_id = ? FOR UPDATE");
            $stmt->execute([$orderId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($priority === 0) {
                // Removal flow: delete if exists and shift down higher priorities
                if ($existing) {
                    $removedPriority = intval($existing['priority_level']);

                    $del = $this->db->prepare("DELETE FROM shipping_priorities WHERE id = ?");
                    $del->execute([$existing['id']]);
                    $delCount = $del->rowCount();

                    if ($delCount === 0) {
                        $this->db->rollback();
                        return [ 'success' => false, 'error' => 'Failed to delete existing priority' ];
                    }

                    // Shift down priorities greater than removedPriority
                    $shift = $this->db->prepare("UPDATE shipping_priorities SET priority_level = priority_level - 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level > ? AND is_active = TRUE");
                    $shift->execute([$updatedBy, $removedPriority]);
                }

                $this->db->commit();
                return [ 'success' => true, 'message' => 'Priority removed and remaining priorities resequenced' ];
            }

            // Insert or move flow
            if ($existing) {
                $current = intval($existing['priority_level']);

                if ($current === $priority) {
                    // Nothing to do
                    $this->db->commit();
                    return [ 'success' => true, 'message' => 'No change needed' ];
                }

                if ($current < $priority) {
                    // Move down: decrement priorities between current+1 .. priority
                    $stmt = $this->db->prepare("UPDATE shipping_priorities SET priority_level = priority_level - 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level > ? AND priority_level <= ? AND is_active = TRUE");
                    $stmt->execute([$updatedBy, $current, $priority]);
                } else {
                    // Move up: increment priorities between priority .. current-1
                    $stmt = $this->db->prepare("UPDATE shipping_priorities SET priority_level = priority_level + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level >= ? AND priority_level < ? AND is_active = TRUE");
                    $stmt->execute([$updatedBy, $priority, $current]);
                }

                // Update the existing record to the new priority
                $upd = $this->db->prepare("UPDATE shipping_priorities SET priority_level = ?, notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $upd->execute([$priority, $notes, $updatedBy, $existing['id']]);

                $this->db->commit();
                return [ 'success' => true, 'message' => 'Priority moved and other priorities adjusted' ];
            } else {
                // New priority: shift up existing priorities >= priority, then insert
                $shift = $this->db->prepare("UPDATE shipping_priorities SET priority_level = priority_level + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level >= ? AND is_active = TRUE");
                $shift->execute([$updatedBy, $priority]);

                $ins = $this->db->prepare("INSERT INTO shipping_priorities (order_id, sales_order_number, sales_order_line, priority_level, notes, created_by, created_at, updated_by, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, TRUE)");
                $ins->execute([
                    $orderId,
                    $salesOrderNumber,
                    $salesOrderLine,
                    $priority,
                    $notes,
                    $createdBy ?? $updatedBy,
                    $updatedBy
                ]);

                $this->db->commit();
                return [ 'success' => true, 'message' => 'Priority created and others shifted' ];
            }
        } catch (Exception $e) {
            error_log('Apply change error: ' . $e->getMessage());
            $this->db->rollback();
            return [ 'success' => false, 'error' => 'Database error: ' . $e->getMessage() ];
        }
    }
    
    /**
     * Get priority by order ID
     */
    public function getPriorityByOrderId($orderId) {
        try {
            $query = "SELECT * FROM shipping_priorities WHERE order_id = ? AND is_active = TRUE";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$orderId]);
            
            $priority = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $priority
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to fetch priority: ' . $e->getMessage()
            ];
        }
    }
}

// Initialize API
try {
    $api = new ShippingPrioritiesAPI($pdo);
    
    // Get request method and data
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Route requests
    switch ($method) {
        case 'GET':
            if (isset($_GET['order_id'])) {
                // Get priority by order ID
                $result = $api->getPriorityByOrderId($_GET['order_id']);
            } else {
                // Get all priorities
                $result = $api->getAllPriorities();
            }
            break;
            
        case 'POST':
            if (isset($_GET['action']) && $_GET['action'] === 'reorder') {
                // Reorder priorities
                $priorityUpdates = $input['priorities'] ?? [];
                $updatedBy = $input['updated_by'] ?? null;
                $debug = $input['debug'] ?? false;
                $result = $api->reorderPriorities($priorityUpdates, $updatedBy, $debug);
            } else if (isset($_GET['action']) && $_GET['action'] === 'apply_change') {
                // Apply single priority change atomically (add/move/remove)
                $orderId = $input['order_id'] ?? null;
                $salesOrderNumber = $input['sales_order_number'] ?? null;
                $salesOrderLine = $input['sales_order_line'] ?? null;
                $priority = $input['priority'] ?? 0;
                $notes = $input['notes'] ?? null;
                $updatedBy = $input['updated_by'] ?? null;
                $createdBy = $input['created_by'] ?? null;

                $result = $api->applyPriorityChange($orderId, $salesOrderNumber, $salesOrderLine, $priority, $notes, $updatedBy, $createdBy);
            } else {
                // Add new priority
                $result = $api->addPriority($input);
            }
            break;
            
        case 'PUT':
            // Update priority
            $id = $_GET['id'] ?? null;
            $result = $api->updatePriority($id, $input);
            break;
            
        case 'DELETE':
            // Remove priority
            $id = $_GET['id'] ?? null;
            $updatedBy = $_GET['updated_by'] ?? null;
            $result = $api->removePriority($id, $updatedBy);
            break;
            
        default:
            $result = [
                'success' => false,
                'error' => 'Method not allowed'
            ];
            http_response_code(405);
            break;
    }
    
    // Return response
    echo json_encode($result);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
