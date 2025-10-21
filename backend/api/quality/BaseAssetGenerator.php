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
     * Bulk create assignments with asset generation
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
                // 1. Generate asset number (customer-specific logic)
                $generatedAssetNumber = $this->generateAssetNumber($assignment);
                
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
                inspector_name,
                status,
                consumed_at,
                consumed_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'consumed', NOW(), ?)
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
            $this->user_full_name,
            $this->user_full_name
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
                $this->user_full_name,
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
                $this->user_full_name,
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
