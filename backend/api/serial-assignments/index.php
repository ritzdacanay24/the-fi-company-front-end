<?php
/**
 * Serial Assignments API
 * View and manage serial number assignments
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

class SerialAssignmentsAPI {
    private $db;

    public function __construct($database) {
        $this->db = $database;
    }

    /**
     * Get all serial assignments with optional filters
     * Uses vw_all_consumed_serials view to include ALL sources:
     * - serial_assignments (new system)
     * - ul_label_usages (legacy)
     * - agsSerialGenerator (legacy)
     * - sgAssetGenerator (legacy)
     * - igt_serial_numbers (used only)
     */
    public function getAssignments($filters = []) {
        try {
            $conditions = ["1=1"];
            $params = [];

            // Build WHERE conditions based on filters
            if (!empty($filters['wo_number'])) {
                $conditions[] = "(v.wo_number LIKE ? OR v.po_number LIKE ?)";
                $params[] = '%' . $filters['wo_number'] . '%';
                $params[] = '%' . $filters['wo_number'] . '%';
            }

            if (!empty($filters['eyefi_serial_number'])) {
                $conditions[] = "v.eyefi_serial_number LIKE ?";
                $params[] = '%' . $filters['eyefi_serial_number'] . '%';
            }

            if (!empty($filters['ul_number'])) {
                $conditions[] = "v.ul_number LIKE ?";
                $params[] = '%' . $filters['ul_number'] . '%';
            }

            if (!empty($filters['consumed_by'])) {
                $conditions[] = "v.used_by LIKE ?";
                $params[] = '%' . $filters['consumed_by'] . '%';
            }

            if (!empty($filters['date_from'])) {
                $conditions[] = "DATE(v.used_date) >= ?";
                $params[] = $filters['date_from'];
            }

            if (!empty($filters['date_to'])) {
                $conditions[] = "DATE(v.used_date) <= ?";
                $params[] = $filters['date_to'];
            }

            if (!empty($filters['status'])) {
                $conditions[] = "v.status = ?";
                $params[] = $filters['status'];
            }

            // Filter voided assignments unless explicitly requested
            if (!isset($filters['include_voided']) || !$filters['include_voided']) {
                $conditions[] = "(v.is_voided = 0 OR v.is_voided IS NULL)";
            }

            $whereClause = implode(' AND ', $conditions);

            // Pagination
            $page = isset($filters['page']) ? (int)$filters['page'] : 1;
            $limit = isset($filters['limit']) ? (int)$filters['limit'] : 50;
            $offset = ($page - 1) * $limit;

            // Get total count
            $countQuery = "SELECT COUNT(*) as total 
                          FROM eyefidb.vw_all_consumed_serials v 
                          WHERE {$whereClause}";
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->execute($params);
            $total = $countStmt->fetch(\PDO::FETCH_ASSOC)['total'];

            // Get assignments from comprehensive view
            $query = "SELECT 
                        v.unique_id,
                        v.source_table,
                        v.source_type,
                        v.source_id as id,
                        v.eyefi_serial_id,
                        v.eyefi_serial_number,
                        v.ul_label_id,
                        v.ul_number,
                        v.ul_category,
                        v.wo_number,
                        v.po_number,
                        v.batch_id,
                        v.used_date as consumed_at,
                        v.used_by as consumed_by,
                        v.status,
                        v.created_at,
                        v.is_voided,
                        v.voided_by,
                        v.voided_at,
                        v.void_reason,
                        v.part_number,
                        v.wo_description,
                        v.customer_part_number,
                        v.customer_name
                      FROM eyefidb.vw_all_consumed_serials v
                      WHERE {$whereClause}
                      ORDER BY v.used_date DESC, v.unique_id DESC
                      LIMIT {$limit} OFFSET {$offset}";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results,
                'total' => (int)$total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getAssignments: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching assignments: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get assignment by ID
     * Returns complete assignment details including work order information
     */
    public function getAssignmentById($id) {
        try {
            $query = "SELECT 
                        sa.id,
                        sa.eyefi_serial_id,
                        sa.eyefi_serial_number,
                        sa.ul_label_id,
                        sa.ul_number,
                        sa.wo_number,
                        sa.po_number,
                        sa.batch_id,
                        sa.consumed_at as used_date,
                        sa.consumed_by as used_by,
                        sa.status,
                        sa.created_at,
                        sa.is_voided,
                        sa.voided_by,
                        sa.voided_at,
                        sa.void_reason,
                        sa.part_number,
                        sa.wo_description,
                        sa.wo_qty_ord as qty_ord,
                        sa.wo_due_date as due_date,
                        sa.wo_routing as routing,
                        sa.wo_line as line,
                        sa.cp_cust_part as customer_part_number,
                        sa.cp_cust as customer_name,
                        sa.inspector_name,
                        sa.customer_type_id,
                        sa.customer_asset_id,
                        sa.generated_asset_number,
                        sa.verification_status,
                        sa.verification_photo,
                        sa.verified_at,
                        sa.verified_by,
                        -- Get IGT serial if exists
                        igt.serial_number as igt_serial_number,
                        -- Get AGS serial if exists
                        ags.generated_SG_asset as ags_serial_number,
                        -- Get SG asset if exists
                        sg.generated_SG_asset as sg_asset_number,
                        -- Get UL category
                        ul.category as ul_category
                      FROM serial_assignments sa
                      LEFT JOIN igt_serial_numbers igt ON sa.customer_type_id = 1 AND sa.customer_asset_id = igt.id
                      LEFT JOIN agsSerialGenerator ags ON sa.customer_type_id = 3 AND sa.customer_asset_id = ags.id
                      LEFT JOIN sgAssetGenerator sg ON sa.customer_type_id = 2 AND sa.customer_asset_id = sg.id
                      LEFT JOIN ul_labels ul ON sa.ul_label_id = ul.id
                      WHERE sa.id = ?";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($result) {
                return [
                    'success' => true,
                    'data' => $result
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Assignment not found'
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching assignment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get assignment statistics
     */
    public function getStatistics() {
        try {
            $query = "SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                        SUM(CASE WHEN status = 'consumed' THEN 1 ELSE 0 END) as consumed,
                        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned,
                        SUM(CASE WHEN DATE(consumed_at) = CURDATE() THEN 1 ELSE 0 END) as today,
                        SUM(CASE WHEN YEARWEEK(consumed_at, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) as this_week,
                        SUM(CASE WHEN is_voided = 1 THEN 1 ELSE 0 END) as voided
                      FROM serial_assignments";

            $stmt = $this->db->query($query);
            $stats = $stmt->fetch(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $stats
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching statistics: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get assignments grouped by status
     */
    public function getAssignmentsByType() {
        try {
            $query = "SELECT 
                        status,
                        COUNT(*) as count,
                        MAX(consumed_at) as last_consumed
                      FROM serial_assignments
                      GROUP BY status
                      ORDER BY count DESC";

            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error fetching assignments by status: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get recent assignments
     */
    public function getRecentAssignments($limit = 10) {
        try {
            $limit = (int)$limit;
            
            $query = "SELECT 
                        sa.id,
                        sa.serial_type,
                        sa.serial_id,
                        sa.serial_number,
                        sa.work_order_number,
                        sa.assigned_date,
                        sa.assigned_by
                      FROM serial_assignments sa
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
                'error' => 'Error fetching recent assignments: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Search assignments
     */
    public function searchAssignments($searchTerm) {
        try {
            $searchParam = '%' . $searchTerm . '%';
            
            $query = "SELECT 
                        sa.id,
                        sa.serial_type,
                        sa.serial_id,
                        sa.serial_number,
                        sa.work_order_number,
                        sa.assigned_date,
                        sa.assigned_by
                      FROM serial_assignments sa
                      WHERE sa.serial_number LIKE ?
                         OR sa.work_order_number LIKE ?
                         OR sa.assigned_by LIKE ?
                      ORDER BY sa.assigned_date DESC
                      LIMIT 100";

            $stmt = $this->db->prepare($query);
            $stmt->execute([$searchParam, $searchParam, $searchParam]);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error searching assignments: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Void an assignment (soft delete)
     * Marks assignment as voided and FREES UP the serial for reuse
     */
    public function voidAssignment($id, $reason, $performedBy) {
        try {
            $this->db->beginTransaction();

            // Get the assignment details first
            $query = "SELECT * FROM serial_assignments WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $assignment = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$assignment) {
                throw new \Exception('Assignment not found');
            }

            if ($assignment['is_voided']) {
                throw new \Exception('Assignment is already voided');
            }

            // Update assignment to mark as voided
            $updateQuery = "UPDATE serial_assignments 
                           SET is_voided = 1,
                               voided_by = ?,
                               voided_at = NOW(),
                               void_reason = ?,
                               status = 'cancelled'
                           WHERE id = ?";
            
            $updateStmt = $this->db->prepare($updateQuery);
            $updateStmt->execute([$performedBy, $reason, $id]);

            // FREE UP THE EYEFI SERIAL - set back to available
            $freeSerialQuery = "UPDATE eyefi_serial_numbers 
                               SET status = 'available' 
                               WHERE id = ?";
            $freeSerialStmt = $this->db->prepare($freeSerialQuery);
            $freeSerialStmt->execute([$assignment['eyefi_serial_id']]);

            // FREE UP THE UL LABEL - set back to available (if assigned)
            if (!empty($assignment['ul_label_id'])) {
                $freeUlQuery = "UPDATE ul_labels 
                               SET status = 'available',
                                   is_consumed = 0
                               WHERE id = ?";
                $freeUlStmt = $this->db->prepare($freeUlQuery);
                $freeUlStmt->execute([$assignment['ul_label_id']]);
            }

            // Note: Customer assets (SG/AGS) cannot be "ungenerated" 
            // They remain in the system but the assignment is voided

            // Create audit trail entry
            $auditQuery = "INSERT INTO serial_assignment_audit (
                            assignment_id,
                            action,
                            reason,
                            performed_by,
                            performed_at
                          ) VALUES (?, 'voided', ?, ?, NOW())";
            
            $auditStmt = $this->db->prepare($auditQuery);
            $auditStmt->execute([$id, $reason, $performedBy]);

            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Assignment voided and serials freed for reuse',
                'assignment_id' => $id,
                'freed_eyefi_serial' => $assignment['eyefi_serial_number'],
                'freed_ul_label' => $assignment['ul_number'] ?? null
            ];
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log("ERROR in voidAssignment: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error voiding assignment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Delete an assignment (hard delete)
     * Permanently removes assignment and FREES UP the serial for reuse
     */
    public function deleteAssignment($id, $reason, $performedBy) {
        try {
            $this->db->beginTransaction();

            // Get the assignment details first
            $query = "SELECT * FROM serial_assignments WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $assignment = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$assignment) {
                throw new \Exception('Assignment not found');
            }

            // FREE UP THE EYEFI SERIAL - set back to available
            $freeSerialQuery = "UPDATE eyefi_serial_numbers 
                               SET status = 'available' 
                               WHERE id = ?";
            $freeSerialStmt = $this->db->prepare($freeSerialQuery);
            $freeSerialStmt->execute([$assignment['eyefi_serial_id']]);

            // Create audit trail entry BEFORE deletion
            $auditQuery = "INSERT INTO serial_assignment_audit (
                            assignment_id,
                            action,
                            reason,
                            performed_by,
                            performed_at
                          ) VALUES (?, 'deleted', ?, ?, NOW())";
            
            $auditStmt = $this->db->prepare($auditQuery);
            $auditStmt->execute([$id, $reason, $performedBy]);

            // Delete the assignment
            $deleteQuery = "DELETE FROM serial_assignments WHERE id = ?";
            $deleteStmt = $this->db->prepare($deleteQuery);
            $deleteStmt->execute([$id]);

            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Assignment deleted and serial freed for reuse',
                'assignment_id' => $id,
                'freed_serial' => $assignment['eyefi_serial_number']
            ];
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log("ERROR in deleteAssignment: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error deleting assignment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Restore a voided assignment
     * Marks serial as consumed again
     */
    public function restoreAssignment($id, $performedBy) {
        try {
            $this->db->beginTransaction();

            // Get the assignment details first
            $query = "SELECT * FROM serial_assignments WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$id]);
            $assignment = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$assignment) {
                throw new \Exception('Assignment not found');
            }

            if (!$assignment['is_voided']) {
                throw new \Exception('Assignment is not voided');
            }

            // Update assignment to restore
            $updateQuery = "UPDATE serial_assignments 
                           SET is_voided = 0,
                               voided_by = NULL,
                               voided_at = NULL,
                               void_reason = NULL,
                               status = 'consumed'
                           WHERE id = ?";
            
            $updateStmt = $this->db->prepare($updateQuery);
            $updateStmt->execute([$id]);

            // MARK SERIAL AS CONSUMED AGAIN
            $consumeSerialQuery = "UPDATE eyefi_serial_numbers 
                                  SET status = 'consumed' 
                                  WHERE id = ?";
            $consumeSerialStmt = $this->db->prepare($consumeSerialQuery);
            $consumeSerialStmt->execute([$assignment['eyefi_serial_id']]);

            // MARK UL LABEL AS CONSUMED AGAIN (if assigned)
            if (!empty($assignment['ul_label_id'])) {
                $consumeUlQuery = "UPDATE ul_labels 
                                  SET status = 'consumed',
                                      is_consumed = 1
                                  WHERE id = ?";
                $consumeUlStmt = $this->db->prepare($consumeUlQuery);
                $consumeUlStmt->execute([$assignment['ul_label_id']]);
            }

            // Create audit trail entry
            $auditQuery = "INSERT INTO serial_assignment_audit (
                            assignment_id,
                            action,
                            reason,
                            performed_by,
                            performed_at
                          ) VALUES (?, 'restored', 'Assignment restored', ?, NOW())";
            
            $auditStmt = $this->db->prepare($auditQuery);
            $auditStmt->execute([$id, $performedBy]);

            $this->db->commit();

            return [
                'success' => true,
                'message' => 'Assignment restored and serial marked as consumed',
                'assignment_id' => $id
            ];
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log("ERROR in restoreAssignment: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error restoring assignment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get audit trail for an assignment
     */
    public function getAuditTrail($assignmentId = null, $limit = 100) {
        try {
            $limit = (int)$limit;
            
            if ($assignmentId) {
                $query = "SELECT 
                            id,
                            assignment_id,
                            action,
                            reason,
                            performed_by,
                            performed_at
                          FROM serial_assignment_audit
                          WHERE assignment_id = ?
                          ORDER BY performed_at DESC";
                
                $stmt = $this->db->prepare($query);
                $stmt->execute([$assignmentId]);
            } else {
                $query = "SELECT 
                            id,
                            assignment_id,
                            action,
                            reason,
                            performed_by,
                            performed_at
                          FROM serial_assignment_audit
                          ORDER BY performed_at DESC
                          LIMIT {$limit}";
                
                $stmt = $this->db->query($query);
            }
            
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getAuditTrail: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching audit trail: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Bulk void assignments
     */
    public function bulkVoidAssignments($ids, $reason, $performedBy) {
        try {
            $this->db->beginTransaction();
            
            $voidedCount = 0;
            $errors = [];

            foreach ($ids as $id) {
                $result = $this->voidAssignment($id, $reason, $performedBy);
                if ($result['success']) {
                    $voidedCount++;
                } else {
                    $errors[] = "ID {$id}: " . $result['error'];
                }
            }

            $this->db->commit();

            return [
                'success' => true,
                'message' => "Voided {$voidedCount} out of " . count($ids) . " assignments",
                'voided_count' => $voidedCount,
                'errors' => $errors
            ];
        } catch (\Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => 'Error in bulk void: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get all consumed serials from all sources (comprehensive view)
     * Includes: serial_assignments, ul_label_usages, agsSerialGenerator, sgAssetGenerator, used igt_serial_numbers
     */
    public function getAllConsumedSerials($filters = []) {
        try {
            $conditions = ["1=1"];
            $params = [];

            // Build WHERE conditions for filtering
            if (!empty($filters['source_table'])) {
                $conditions[] = "source_table = ?";
                $params[] = $filters['source_table'];
            }

            if (!empty($filters['search'])) {
                $search = '%' . $filters['search'] . '%';
                $conditions[] = "(eyefi_serial_number LIKE ? OR ul_number LIKE ? OR igt_serial_number LIKE ? OR ags_serial_number LIKE ? OR sg_asset_number LIKE ? OR wo_number LIKE ? OR po_number LIKE ? OR used_by LIKE ?)";
                $params = array_merge($params, [$search, $search, $search, $search, $search, $search, $search, $search]);
            }

            if (!empty($filters['used_by'])) {
                $conditions[] = "used_by LIKE ?";
                $params[] = '%' . $filters['used_by'] . '%';
            }

            if (!empty($filters['wo_number'])) {
                $conditions[] = "(wo_number LIKE ? OR po_number LIKE ?)";
                $woSearch = '%' . $filters['wo_number'] . '%';
                $params = array_merge($params, [$woSearch, $woSearch]);
            }

            if (!empty($filters['date_from'])) {
                $conditions[] = "DATE(used_date) >= ?";
                $params[] = $filters['date_from'];
            }

            if (!empty($filters['date_to'])) {
                $conditions[] = "DATE(used_date) <= ?";
                $params[] = $filters['date_to'];
            }

            $whereClause = implode(' AND ', $conditions);

            // Pagination
            $page = isset($filters['page']) ? (int)$filters['page'] : 1;
            $limit = isset($filters['limit']) ? (int)$filters['limit'] : 50;
            $offset = ($page - 1) * $limit;

            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM vw_all_consumed_serials WHERE {$whereClause}";
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->execute($params);
            $total = $countStmt->fetch(\PDO::FETCH_ASSOC)['total'];

            // Get data
            $query = "SELECT * FROM vw_all_consumed_serials 
                     WHERE {$whereClause}
                     ORDER BY used_date DESC
                     LIMIT {$limit} OFFSET {$offset}";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results,
                'total' => (int)$total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getAllConsumedSerials: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching consumed serials: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Bulk create "Other" customer assignments
     * Creates assignment records without customer asset generation
     * Just links EyeFi serial + UL label with custom customer name
     * 
     * @param array $assignments Array of assignment data
     * @param string $performedBy User who is creating the assignments
     * @return array Result with success status and data
     */
    public function bulkCreateOtherAssignments($assignments, $performedBy) {
        try {
            $this->db->beginTransaction();
            
            // Generate unique batch ID for this batch operation
            $batchId = 'BATCH-' . date('YmdHis') . '-' . substr(md5(uniqid(rand(), true)), 0, 8);
            
            $results = [];
            $errors = [];
            
            foreach ($assignments as $index => $assignment) {
                try {
                    // Validate required fields
                    if (empty($assignment['eyefi_serial_number']) && empty($assignment['eyefi_serial_id'])) {
                        throw new \Exception("EyeFi serial number is required");
                    }

                    // Find or create EyeFi serial if only serial number provided
                    $eyefi_serial_id = $assignment['eyefi_serial_id'] ?? null;
                    if (empty($eyefi_serial_id) && !empty($assignment['eyefi_serial_number'])) {
                        $eyefi_serial_id = $this->findOrCreateEyeFiSerial($assignment['eyefi_serial_number']);
                    }

                    // Check if this serial is already consumed (non-voided only)
                    $checkStmt = $this->db->prepare("
                        SELECT id, status, consumed_at, consumed_by 
                        FROM serial_assignments 
                        WHERE eyefi_serial_id = ? AND (is_voided = 0 OR is_voided IS NULL)
                    ");
                    $checkStmt->execute([$eyefi_serial_id]);
                    $existing = $checkStmt->fetch(\PDO::FETCH_ASSOC);
                    
                    if ($existing) {
                        throw new \Exception(
                            "EyeFi Serial #{$assignment['eyefi_serial_number']} has already been consumed on {$existing['consumed_at']} by {$existing['consumed_by']}"
                        );
                    }

                    // Insert assignment record - Save all work order details
                    // customer_type_id: 1=IGT, 2=SG, 3=AGS, 4=Other
                    $insertQuery = "
                        INSERT INTO serial_assignments (
                            eyefi_serial_id,
                            eyefi_serial_number,
                            ul_label_id,
                            ul_number,
                            customer_type_id,
                            customer_asset_id,
                            generated_asset_number,
                            po_number,
                            part_number,
                            wo_number,
                            wo_part,
                            wo_description,
                            wo_qty_ord,
                            wo_due_date,
                            wo_routing,
                            wo_line,
                            cp_cust_part,
                            cp_cust,
                            inspector_name,
                            batch_id,
                            status,
                            consumed_at,
                            consumed_by,
                            is_voided,
                            verification_status
                        ) VALUES (?, ?, ?, ?, 4, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'consumed', NOW(), ?, 0, 'skipped')
                    ";
                    
                    // Customer name goes into cp_cust field
                    $customerName = $assignment['customer_name'] ?? $assignment['cp_cust'] ?? 'Other';
                    $insertStmt = $this->db->prepare($insertQuery);
                    $insertStmt->execute([
                        $eyefi_serial_id,                              // eyefi_serial_id
                        $assignment['eyefi_serial_number'],            // eyefi_serial_number
                        $assignment['ul_label_id'] ?? null,            // ul_label_id
                        $assignment['ulNumber'] ?? null,               // ul_number
                        $assignment['poNumber'] ?? null,               // po_number
                        $assignment['partNumber'] ?? null,             // part_number
                        $assignment['wo_number'] ?? null,              // wo_number
                        $assignment['wo_part'] ?? null,                // wo_part
                        $assignment['wo_description'] ?? null,         // wo_description
                        $assignment['wo_qty_ord'] ?? null,             // wo_qty_ord (quantity ordered)
                        $assignment['wo_due_date'] ?? null,            // wo_due_date
                        $assignment['wo_routing'] ?? null,             // wo_routing
                        $assignment['wo_line'] ?? null,                // wo_line
                        $assignment['cp_cust_part'] ?? null,           // cp_cust_part (customer part number)
                        $customerName,                                 // cp_cust (customer name)
                        $performedBy,                                  // inspector_name
                        $batchId,                                      // batch_id
                        $performedBy                                   // consumed_by
                    ]);

                    $assignmentId = $this->db->lastInsertId();

                    // Mark EyeFi serial as consumed
                    if ($eyefi_serial_id) {
                        $updateSerialStmt = $this->db->prepare("
                            UPDATE eyefi_serial_numbers 
                            SET status = 'consumed' 
                            WHERE id = ?
                        ");
                        $updateSerialStmt->execute([$eyefi_serial_id]);
                    }

                    // Mark UL label as consumed (if provided)
                    if (!empty($assignment['ul_label_id'])) {
                        $updateUlStmt = $this->db->prepare("
                            UPDATE ul_labels 
                            SET status = 'consumed', 
                                is_consumed = 1 
                            WHERE id = ?
                        ");
                        $updateUlStmt->execute([$assignment['ul_label_id']]);
                    }

                    $results[] = [
                        'assignment_id' => $assignmentId,
                        'eyefi_serial_number' => $assignment['eyefi_serial_number'],
                        'ul_number' => $assignment['ulNumber'] ?? null,
                        'customer_name' => $assignment['customer_name'] ?? 'Other',
                        'wo_number' => $assignment['wo_number'] ?? null
                    ];

                } catch (\Exception $e) {
                    $errors[] = "Row " . ($index + 1) . ": " . $e->getMessage();
                    error_log("Error creating Other assignment (row " . ($index + 1) . "): " . $e->getMessage());
                }
            }

            // If there are any errors, rollback
            if (!empty($errors)) {
                $this->db->rollBack();
                return [
                    'success' => false,
                    'error' => 'Failed to create some assignments',
                    'errors' => $errors
                ];
            }

            $this->db->commit();
            return [
                'success' => true,
                'message' => "Created " . count($results) . " Other customer assignments",
                'count' => count($results),
                'batch_id' => $batchId,
                'data' => $results
            ];  'data' => $results
            ];

        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log("ERROR in bulkCreateOtherAssignments: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error creating Other assignments: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Find or create EyeFi serial number
     * Used when USED category serials are entered manually
     */
    private function findOrCreateEyeFiSerial($serialNumber) {
        // First, try to find existing serial
        $findStmt = $this->db->prepare("
            SELECT id FROM eyefi_serial_numbers 
            WHERE serial_number = ?
        ");
        $findStmt->execute([$serialNumber]);
        $existing = $findStmt->fetch(\PDO::FETCH_ASSOC);
        
        if ($existing) {
            return $existing['id'];
        }
        
        // If not found, create new USED serial
        $insertStmt = $this->db->prepare("
            INSERT INTO eyefi_serial_numbers (
                serial_number,
                category,
                status,
                created_at
            ) VALUES (?, 'Used', 'consumed', NOW())
        ");
        $insertStmt->execute([$serialNumber]);
        
        return $this->db->lastInsertId();
    }

    /**
     * Get consumed serials summary statistics
     */
    public function getConsumedSerialsSummary() {
        try {
            $query = "SELECT * FROM vw_consumed_serials_summary ORDER BY total_consumed DESC";
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getConsumedSerialsSummary: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching summary: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get daily consumption trend (last 30 days)
     */
    public function getDailyConsumptionTrend() {
        try {
            $query = "SELECT * FROM vw_daily_consumption_trend ORDER BY consumption_date DESC, source_table";
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getDailyConsumptionTrend: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching trend: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get user consumption activity
     */
    public function getUserConsumptionActivity() {
        try {
            $query = "SELECT * FROM vw_user_consumption_activity ORDER BY total_consumed DESC";
            $stmt = $this->db->query($query);
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getUserConsumptionActivity: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching user activity: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get work order serial tracking
     */
    public function getWorkOrderSerials($workOrder = null) {
        try {
            if ($workOrder) {
                $query = "SELECT * FROM vw_work_order_serials 
                         WHERE work_order LIKE ?
                         ORDER BY last_used DESC";
                $stmt = $this->db->prepare($query);
                $stmt->execute(['%' . $workOrder . '%']);
            } else {
                $query = "SELECT * FROM vw_work_order_serials ORDER BY last_used DESC LIMIT 100";
                $stmt = $this->db->query($query);
            }
            
            $results = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'data' => $results
            ];
        } catch (\Exception $e) {
            error_log("ERROR in getWorkOrderSerials: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error fetching work order serials: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get audit signoffs
     */
    public function getAuditSignoffs() {
        try {
            $query = "SELECT * FROM ul_audit_signoffs 
                     ORDER BY audit_date DESC, created_at DESC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $signoffs = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            // Decode JSON ul_numbers
            foreach ($signoffs as &$signoff) {
                $signoff['ul_numbers'] = json_decode($signoff['ul_numbers'], true) ?: [];
            }
            
            return [
                'success' => true,
                'message' => 'Audit signoffs retrieved successfully',
                'data' => $signoffs
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to get audit signoffs: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Submit audit signoff
     */
    public function submitAuditSignoff($data) {
        try {
            $this->db->beginTransaction();
            
            $query = "INSERT INTO ul_audit_signoffs (
                        audit_date,
                        auditor_name,
                        auditor_signature,
                        items_audited,
                        ul_numbers,
                        notes
                     ) VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $data['audit_date'],
                $data['auditor_name'],
                $data['auditor_signature'],
                $data['items_audited'],
                json_encode($data['ul_numbers']),
                $data['notes'] ?? ''
            ]);
            
            $signoffId = $this->db->lastInsertId();
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Audit signoff submitted successfully',
                'data' => [
                    'id' => $signoffId
                ]
            ];
            
        } catch (\Exception $e) {
            $this->db->rollBack();
            return [
                'success' => false,
                'error' => 'Failed to submit audit signoff: ' . $e->getMessage()
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
    
    // Disable strict SQL mode to allow warnings instead of errors
    // This fixes "Data truncated for column 'status'" error caused by UNIQUE constraint
    $db->exec("SET sql_mode = ''");
    
    $api = new SerialAssignmentsAPI($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    $result = null;
    
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'get_assignments':
                    $filters = [
                        'serial_type' => $_GET['serial_type'] ?? null,
                        'work_order_number' => $_GET['work_order_number'] ?? null,
                        'serial_number' => $_GET['serial_number'] ?? null,
                        'assigned_by' => $_GET['assigned_by'] ?? null,
                        'date_from' => $_GET['date_from'] ?? null,
                        'date_to' => $_GET['date_to'] ?? null,
                        'page' => $_GET['page'] ?? 1,
                        'limit' => $_GET['limit'] ?? 50
                    ];
                    $result = $api->getAssignments($filters);
                    break;
                    
                case 'get_assignment':
                    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
                    if ($id > 0) {
                        $result = $api->getAssignmentById($id);
                    } else {
                        $result = [
                            'success' => false,
                            'error' => 'Invalid assignment ID'
                        ];
                    }
                    break;
                    
                case 'get_statistics':
                    $result = $api->getStatistics();
                    break;
                    
                case 'get_by_type':
                    $result = $api->getAssignmentsByType();
                    break;
                    
                case 'get_recent':
                    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                    $result = $api->getRecentAssignments($limit);
                    break;
                    
                case 'search':
                    $term = isset($_GET['term']) ? $_GET['term'] : '';
                    if (!empty($term)) {
                        $result = $api->searchAssignments($term);
                    } else {
                        $result = [
                            'success' => false,
                            'error' => 'Search term is required'
                        ];
                    }
                    break;
                    
                case 'get_audit_trail':
                    $assignmentId = isset($_GET['assignment_id']) ? (int)$_GET['assignment_id'] : null;
                    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
                    $result = $api->getAuditTrail($assignmentId, $limit);
                    break;
                
                case 'get_all_consumed_serials':
                    $filters = [
                        'source_table' => $_GET['source_table'] ?? null,
                        'search' => $_GET['search'] ?? null,
                        'used_by' => $_GET['used_by'] ?? null,
                        'wo_number' => $_GET['wo_number'] ?? null,
                        'date_from' => $_GET['date_from'] ?? null,
                        'date_to' => $_GET['date_to'] ?? null,
                        'page' => $_GET['page'] ?? 1,
                        'limit' => $_GET['limit'] ?? 50
                    ];
                    $result = $api->getAllConsumedSerials($filters);
                    break;
                
                case 'get_consumed_summary':
                    $result = $api->getConsumedSerialsSummary();
                    break;
                
                case 'get_consumption_trend':
                    $result = $api->getDailyConsumptionTrend();
                    break;
                
                case 'get_user_activity':
                    $result = $api->getUserConsumptionActivity();
                    break;
                
                case 'get_audit_signoffs':
                    $result = $api->getAuditSignoffs();
                    break;
                
                case 'get_work_order_serials':
                    $workOrder = $_GET['work_order'] ?? null;
                    $result = $api->getWorkOrderSerials($workOrder);
                    break;
                    
                default:
                    $result = [
                        'success' => false,
                        'error' => 'Invalid action. Available actions: get_assignments, get_assignment, get_statistics, get_by_type, get_recent, search, get_audit_trail, get_all_consumed_serials, get_consumed_summary, get_consumption_trend, get_user_activity, get_work_order_serials'
                    ];
            }
            break;
            
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $action = isset($_GET['action']) ? $_GET['action'] : '';
            
            switch ($action) {
                case 'bulk_create_other':
                    if (!isset($data['assignments']) || !is_array($data['assignments']) || !isset($data['performed_by'])) {
                        $result = [
                            'success' => false,
                            'error' => 'Missing required fields: assignments (array), performed_by'
                        ];
                    } else {
                        $result = $api->bulkCreateOtherAssignments($data['assignments'], $data['performed_by']);
                    }
                    break;
                
                case 'void_assignment':
                    if (!isset($data['id']) || !isset($data['performed_by'])) {
                        $result = [
                            'success' => false,
                            'error' => 'Missing required fields: id, performed_by'
                        ];
                    } else {
                        $reason = $data['reason'] ?? 'No reason provided';
                        $result = $api->voidAssignment($data['id'], $reason, $data['performed_by']);
                    }
                    break;
                
                case 'submit_audit_signoff':
                    if (!isset($data['audit_date']) || !isset($data['auditor_name']) || !isset($data['auditor_signature']) || !isset($data['ul_numbers'])) {
                        $result = [
                            'success' => false,
                            'error' => 'Missing required fields: audit_date, auditor_name, auditor_signature, ul_numbers'
                        ];
                    } else {
                        $result = $api->submitAuditSignoff($data);
                    }
                    break;
                    
                case 'delete_assignment':
                    if (!isset($data['id']) || !isset($data['performed_by'])) {
                        $result = [
                            'success' => false,
                            'error' => 'Missing required fields: id, performed_by'
                        ];
                    } else {
                        $reason = $data['reason'] ?? 'No reason provided';
                        $result = $api->deleteAssignment($data['id'], $reason, $data['performed_by']);
                    }
                    break;
                    
                case 'restore_assignment':
                    if (!isset($data['id']) || !isset($data['performed_by'])) {
                        $result = [
                            'success' => false,
                            'error' => 'Missing required fields: id, performed_by'
                        ];
                    } else {
                        $result = $api->restoreAssignment($data['id'], $data['performed_by']);
                    }
                    break;
                    
                case 'bulk_void':
                    if (!isset($data['ids']) || !is_array($data['ids']) || !isset($data['performed_by'])) {
                        $result = [
                            'success' => false,
                            'error' => 'Missing required fields: ids (array), performed_by'
                        ];
                    } else {
                        $reason = $data['reason'] ?? 'Bulk void';
                        $result = $api->bulkVoidAssignments($data['ids'], $reason, $data['performed_by']);
                    }
                    break;
                    
                default:
                    $result = [
                        'success' => false,
                        'error' => 'Invalid POST action. Available: bulk_create_other, void_assignment, delete_assignment, restore_assignment, bulk_void, submit_audit_signoff'
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