<?php
/**
 * Kanban Priorities API
 * Handles all CRUD operations for kanban/production order priorities
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

class KanbanPrioritiesAPI {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    /**
     * Get all active kanban priorities
     */
    public function getAllPriorities() {
        try {
            $query = "SELECT * FROM active_kanban_priorities ORDER BY priority_level ASC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $priorities = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'message' => 'Priorities retrieved successfully',
                'data' => $priorities
            ];
        } catch (Exception $e) {
            error_log('Get priorities error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to retrieve priorities: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get priority by order ID
     */
    public function getPriorityByOrderId($orderId) {
        try {
            $query = "SELECT * FROM kanban_priorities WHERE order_id = ? AND is_active = TRUE";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$orderId]);
            
            $priority = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'message' => 'Priority retrieved successfully',
                'data' => $priority ?: null
            ];
        } catch (Exception $e) {
            error_log('Get priority by order ID error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to retrieve priority: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Apply change (atomic insert/update/move with resequencing)
     * This is the main endpoint for all priority operations
     */
    public function applyChange($data) {
        try {
            $this->db->beginTransaction();
            
            $orderId = $data['order_id'] ?? null;
            $salesOrderNumber = $data['sales_order_number'] ?? null;
            $salesOrderLine = $data['sales_order_line'] ?? null;
            $priority = (int)($data['priority'] ?? 0);
            $notes = $data['notes'] ?? '';
            $createdBy = $data['created_by'] ?? null;
            $updatedBy = $data['updated_by'] ?? null;
            
            if (!$orderId || !$salesOrderNumber || !$updatedBy) {
                throw new Exception('Missing required fields: order_id, sales_order_number, updated_by');
            }
            
            // Check if priority already exists for this order
            $checkExisting = $this->db->prepare("SELECT * FROM kanban_priorities WHERE order_id = ? AND is_active = TRUE");
            $checkExisting->execute([$orderId]);
            $existing = $checkExisting->fetch(PDO::FETCH_ASSOC);
            
            if ($priority === 0) {
                // REMOVE: Deactivate and resequence
                if ($existing) {
                    $oldPriority = $existing['priority_level'];
                    
                    // Deactivate this priority
                    $deactivate = $this->db->prepare("UPDATE kanban_priorities SET is_active = FALSE, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $deactivate->execute([$updatedBy, $existing['id']]);
                    
                    // Shift down priorities that were higher than the removed one
                    $shiftDown = $this->db->prepare("UPDATE kanban_priorities SET priority_level = priority_level - 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level > ? AND is_active = TRUE");
                    $shiftDown->execute([$updatedBy, $oldPriority]);
                }
                
                $this->db->commit();
                return [ 'success' => true, 'message' => 'Priority removed and remaining priorities resequenced' ];
            }
            
            if ($existing) {
                // MOVE: Existing priority to new position
                $oldPriority = $existing['priority_level'];
                
                if ($oldPriority === $priority) {
                    // Same position, just update notes
                    $upd = $this->db->prepare("UPDATE kanban_priorities SET notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                    $upd->execute([$notes, $updatedBy, $existing['id']]);
                    $this->db->commit();
                    return [ 'success' => true, 'message' => 'Notes updated' ];
                }
                
                if ($oldPriority < $priority) {
                    // Moving down: shift up items between old and new position
                    $shift = $this->db->prepare("UPDATE kanban_priorities SET priority_level = priority_level - 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level > ? AND priority_level <= ? AND is_active = TRUE AND id != ?");
                    $shift->execute([$updatedBy, $oldPriority, $priority, $existing['id']]);
                } else {
                    // Moving up: shift down items between new and old position
                    $shift = $this->db->prepare("UPDATE kanban_priorities SET priority_level = priority_level + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level >= ? AND priority_level < ? AND is_active = TRUE AND id != ?");
                    $shift->execute([$updatedBy, $priority, $oldPriority, $existing['id']]);
                }
                
                // Update the moved priority
                $upd = $this->db->prepare("UPDATE kanban_priorities SET priority_level = ?, notes = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $upd->execute([$priority, $notes, $updatedBy, $existing['id']]);

                $this->db->commit();
                return [ 'success' => true, 'message' => 'Priority moved and other priorities adjusted' ];
            } else {
                // NEW: shift up existing priorities >= priority, then insert
                $shift = $this->db->prepare("UPDATE kanban_priorities SET priority_level = priority_level + 1, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE priority_level >= ? AND is_active = TRUE");
                $shift->execute([$updatedBy, $priority]);

                $ins = $this->db->prepare("INSERT INTO kanban_priorities (order_id, sales_order_number, sales_order_line, priority_level, notes, created_by, created_at, updated_by, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, TRUE)");
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
     * Reorder multiple priorities at once (for drag-and-drop)
     */
    public function reorderPriorities($data) {
        try {
            $this->db->beginTransaction();
            
            $priorities = $data['priorities'] ?? [];
            $updatedBy = $data['updated_by'] ?? 'system';
            
            if (empty($priorities)) {
                throw new Exception('No priorities provided for reordering');
            }
            
            // Update each priority to its new position
            $updateStmt = $this->db->prepare(
                "UPDATE kanban_priorities 
                 SET priority_level = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ? AND is_active = TRUE"
            );
            
            foreach ($priorities as $priority) {
                $id = $priority['id'] ?? null;
                $priorityLevel = $priority['priority_level'] ?? null;
                
                if ($id === null || $priorityLevel === null) {
                    throw new Exception('Invalid priority data: missing id or priority_level');
                }
                
                $updateStmt->execute([$priorityLevel, $updatedBy, $id]);
            }
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Priorities reordered successfully',
                'data' => null
            ];
        } catch (Exception $e) {
            error_log('Reorder priorities error: ' . $e->getMessage());
            $this->db->rollback();
            return [
                'success' => false,
                'error' => 'Failed to reorder priorities: ' . $e->getMessage()
            ];
        }
    }
}

// Initialize API
try {
    $api = new KanbanPrioritiesAPI($database);
    
    // Get request method and action
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    // Route requests
    if ($method === 'GET') {
        if (isset($_GET['order_id'])) {
            $result = $api->getPriorityByOrderId($_GET['order_id']);
        } else {
            $result = $api->getAllPriorities();
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if ($action === 'apply_change') {
            $result = $api->applyChange($input);
        } elseif ($action === 'reorder') {
            $result = $api->reorderPriorities($input);
        } else {
            $result = [
                'success' => false,
                'error' => 'Unknown action. Use ?action=apply_change or ?action=reorder'
            ];
        }
    } else {
        $result = [
            'success' => false,
            'error' => 'Method not allowed'
        ];
        http_response_code(405);
    }
    
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
