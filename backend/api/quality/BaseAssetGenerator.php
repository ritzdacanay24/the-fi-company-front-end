<?php
/**
 * BaseAssetGenerator
 * 
 * Abstract base class for all customer-specific asset generators
 * Provides common functionality for:
 * - Bulk asset generation with transaction safety
 * - Central assignment tracking
 * - Serial number consumption marking
 * - Backward compatibility with existing code
 * 
 * Date: 2025-10-17
 * Author: System
 */

abstract class BaseAssetGenerator
{
    protected $db;
    protected $customerTypeId;
    protected $customerCode;
    public $user_full_name;
    protected $nowDate;
    
    // Feature flag for new assignment tracking (can be toggled)
    protected $enableAssignmentTracking = true;

    /**
     * Constructor
     * 
     * @param PDO $db Database connection
     * @param int $customerTypeId Customer type ID from customer_types table
     * @param string $customerCode Customer code (sg, ags, igt, etc.)
     */
    public function __construct($db, $customerTypeId, $customerCode)
    {
        $this->db = $db;
        $this->customerTypeId = $customerTypeId;
        $this->customerCode = $customerCode;
        $this->nowDate = date("Y-m-d H:i:s", time());
    }

    /**
     * Find or create EyeFi serial number in database
     * If serial exists, return its ID
     * If not, create it and return new ID
     * 
     * @param string $serialNumber Serial number to find or create
     * @return int Serial ID
     */
    protected function findOrCreateEyeFiSerial($serialNumber)
    {
        if (empty($serialNumber)) {
            return null;
        }
        
        // Try to find existing serial
        $stmt = $this->db->prepare("
            SELECT id FROM eyefi_serial_numbers 
            WHERE serial_number = ?
            LIMIT 1
        ");
        $stmt->execute([$serialNumber]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            return $existing['id'];
        }
        
        // Serial doesn't exist, create it
        $insertStmt = $this->db->prepare("
            INSERT INTO eyefi_serial_numbers (
                serial_number,
                status,
                is_consumed,
                created_at
            ) VALUES (?, 'available', FALSE, NOW())
        ");
        $insertStmt->execute([$serialNumber]);
        
        return $this->db->lastInsertId();
    }

    /**
     * Bulk create multiple assignments in a single transaction
     * Main entry point for all customer types
     * 
     * @param array $assignments Array of assignment data
     * @return array Result with success status and data
     */
    public function bulkCreateAssignments($assignments)
    {
        try {
            // Start transaction for atomicity
            $this->db->beginTransaction();
            
            $results = [];
            
            foreach ($assignments as $assignment) {
                // 0. Ensure EyeFi serial exists in database if provided
                if (!empty($assignment['serialNumber']) && empty($assignment['eyefi_serial_id'])) {
                    $assignment['eyefi_serial_id'] = $this->findOrCreateEyeFiSerial($assignment['serialNumber']);
                    error_log("Created/found EyeFi serial '{$assignment['serialNumber']}' with ID: {$assignment['eyefi_serial_id']}");
                }
                
                // 1. Generate customer-specific asset number OR use manually provided one
                // Check if manual asset number is provided (for USED category)
                if (!empty($assignment['sgAssetNumber'])) {
                    // Use manually entered asset number for SG
                    $generatedAssetNumber = $assignment['sgAssetNumber'];
                    error_log("Using manual SG asset number: {$generatedAssetNumber}");
                } elseif (!empty($assignment['agsAssetNumber'])) {
                    // Use manually entered asset number for AGS
                    $generatedAssetNumber = $assignment['agsAssetNumber'];
                    error_log("Using manual AGS asset number: {$generatedAssetNumber}");
                } elseif (!empty($assignment['igtAssetNumber'])) {
                    // Use manually entered asset number for IGT
                    $generatedAssetNumber = $assignment['igtAssetNumber'];
                    error_log("Using manual IGT asset number: {$generatedAssetNumber}");
                } else {
                    // Auto-generate asset number
                    $generatedAssetNumber = $this->generateAssetNumber($assignment);
                }
                
                // 2. Insert into customer-specific table
                $customerAssetId = $this->insertCustomerAsset($assignment, $generatedAssetNumber);
                
                // 3. Create central assignment record (if tracking enabled)
                $assignmentId = null;
                if ($this->enableAssignmentTracking) {
                    $assignmentId = $this->createAssignment(
                        $assignment,
                        $customerAssetId,
                        $generatedAssetNumber
                    );
                    
                    // 4. Mark serials as consumed
                    $this->markSerialsAsConsumed($assignment, $assignmentId);
                }
                
                $results[] = [
                    'generated_asset_number' => $generatedAssetNumber,
                    'customer_asset_id' => $customerAssetId,
                    'assignment_id' => $assignmentId,
                    'serialNumber' => $assignment['serialNumber'] ?? null,
                    'poNumber' => $assignment['poNumber'] ?? null
                ];
            }
            
            // Commit transaction - all or nothing
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => "Bulk {$this->customerCode} assets created successfully",
                'count' => count($results),
                'data' => $results
            ];

        } catch (Exception $e) {
            // Rollback on error
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Create central assignment record
     * Links EyeFi serial → UL label → Customer asset
     * Checks if serial is already consumed before creating record
     * 
     * @param array $assignment Assignment data
     * @param int $customerAssetId ID from customer-specific table
     * @param string $generatedAssetNumber Generated asset number
     * @return int Assignment ID
     * @throws Exception if serial is already consumed
     */
    protected function createAssignment($assignment, $customerAssetId, $generatedAssetNumber)
    {
        // DEBUG: Log what we're receiving
        error_log("=== CREATE ASSIGNMENT DEBUG ===");
        error_log("Assignment inspector_name: " . ($assignment['inspector_name'] ?? 'NOT SET'));
        error_log("Assignment consumed_by: " . ($assignment['consumed_by'] ?? 'NOT SET'));
        error_log("Class user_full_name: " . ($this->user_full_name ?? 'NOT SET'));
        error_log("Full assignment data: " . json_encode($assignment));
        
        // First, check if this serial already has a consumed record
        if (!empty($assignment['eyefi_serial_id'])) {
            $checkStmt = $this->db->prepare("
                SELECT id, status, consumed_at, consumed_by 
                FROM eyefidb.serial_assignments 
                WHERE eyefi_serial_id = ? AND status = 'consumed'
            ");
            $checkStmt->execute([$assignment['eyefi_serial_id']]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                throw new Exception(
                    "EyeFi Serial #{$assignment['serialNumber']} has already been consumed. " .
                    "Consumed on {$existing['consumed_at']} by {$existing['consumed_by']}. " .
                    "Please select an available serial."
                );
            }
        }
        
        $qry = "
            INSERT INTO eyefidb.serial_assignments (
                eyefi_serial_id,
                eyefi_serial_number,
                ul_label_id,
                ul_number,
                customer_type_id,
                customer_asset_id,
                generated_asset_number,
                po_number,
                property_site,
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
                status,
                consumed_at,
                consumed_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'consumed', NOW(), ?)
        ";
        
        $stmt = $this->db->prepare($qry);
        $stmt->execute([
            $assignment['eyefi_serial_id'] ?? null,
            $assignment['serialNumber'] ?? null,
            $assignment['ul_label_id'] ?? null,
            $assignment['ulNumber'] ?? null,
            $this->customerTypeId,
            $customerAssetId,
            $generatedAssetNumber,
            $assignment['poNumber'] ?? null,
            $assignment['property_site'] ?? null,
            $assignment['partNumber'] ?? $assignment['sgPartNumber'] ?? $assignment['agsPartNumber'] ?? null,
            $assignment['wo_number'] ?? null,
            $assignment['wo_part'] ?? null,
            $assignment['wo_description'] ?? null,
            $assignment['wo_qty_ord'] ?? null,
            $assignment['wo_due_date'] ?? null,
            $assignment['wo_routing'] ?? null,
            $assignment['wo_line'] ?? null,
            $assignment['cp_cust_part'] ?? null,
            $assignment['cp_cust'] ?? null,
            $assignment['inspector_name'] ?? $this->user_full_name ?? 'System',
            $assignment['consumed_by'] ?? $this->user_full_name ?? 'System'
        ]);
        
        return $this->db->lastInsertId();
    }

    /**
     * Mark serials as consumed (prevents reuse)
     * Updates both eyefi_serial_numbers and ul_labels tables
     * Only marks if not already consumed to prevent duplicate key errors
     * 
     * @param array $assignment Assignment data
     * @param int $assignmentId Assignment ID from serial_assignments
     */
    protected function markSerialsAsConsumed($assignment, $assignmentId)
    {
        // Get user name from assignment or fall back to class property
        $userName = $assignment['consumed_by'] ?? $this->user_full_name ?? 'System';
        
        // Mark EyeFi serial as consumed (only if not already consumed)
        if (!empty($assignment['eyefi_serial_id'])) {
            $stmt = $this->db->prepare("
                UPDATE eyefi_serial_numbers 
                SET is_consumed = TRUE, 
                    consumed_at = NOW(),
                    consumed_by = ?,
                    assignment_id = ?
                WHERE id = ? 
                AND is_consumed = FALSE
            ");
            $stmt->execute([
                $userName,
                $assignmentId,
                $assignment['eyefi_serial_id']
            ]);
            
            // Check if serial was already consumed
            if ($stmt->rowCount() === 0) {
                // Check if it's already consumed
                $checkStmt = $this->db->prepare("
                    SELECT is_consumed, consumed_at, consumed_by 
                    FROM eyefi_serial_numbers 
                    WHERE id = ?
                ");
                $checkStmt->execute([$assignment['eyefi_serial_id']]);
                $status = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($status && $status['is_consumed']) {
                    throw new Exception(
                        "EyeFi Serial #{$assignment['serialNumber']} is already consumed. " .
                        "Consumed on {$status['consumed_at']} by {$status['consumed_by']}. " .
                        "Please select an available serial."
                    );
                }
            }
        }
        
        // Mark UL label as consumed (only if not already consumed)
        if (!empty($assignment['ul_label_id'])) {
            $stmt = $this->db->prepare("
                UPDATE ul_labels 
                SET is_consumed = TRUE, 
                    consumed_at = NOW(),
                    consumed_by = ?,
                    assignment_id = ?
                WHERE id = ? 
                AND is_consumed = FALSE
            ");
            $stmt->execute([
                $userName,
                $assignmentId,
                $assignment['ul_label_id']
            ]);
            
            // Check if UL was already consumed
            if ($stmt->rowCount() === 0) {
                $checkStmt = $this->db->prepare("
                    SELECT is_consumed, consumed_at, consumed_by 
                    FROM ul_labels 
                    WHERE id = ?
                ");
                $checkStmt->execute([$assignment['ul_label_id']]);
                $status = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($status && $status['is_consumed']) {
                    throw new Exception(
                        "UL Label #{$assignment['ulNumber']} is already consumed. " .
                        "Consumed on {$status['consumed_at']} by {$status['consumed_by']}. " .
                        "Please select an available UL label."
                    );
                }
            }
        }
    }

    /**
     * Abstract methods - must be implemented by child classes
     */
    
    /**
     * Generate asset number using customer-specific formula
     * 
     * @param array $assignment Assignment data
     * @return string Generated asset number
     */
    abstract protected function generateAssetNumber($assignment);
    
    /**
     * Insert record into customer-specific asset table
     * 
     * @param array $assignment Assignment data
     * @param string $generatedAssetNumber Generated asset number
     * @return int Insert ID from customer table
     */
    abstract protected function insertCustomerAsset($assignment, $generatedAssetNumber);
}
