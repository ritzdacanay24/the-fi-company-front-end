<?php

/**
 * IGT Assignment Generator
 * 
 * Unlike SG/AGS which generate NEW asset numbers, IGT uses pre-loaded serial numbers.
 * This class creates assignments linking:
 * - EyeFi Serial Number (consumed)
 * - UL Label (assigned)
 * - IGT Serial Number (marked as used)
 */
class IgtAssetGenerator
{
    private $db;
    public $user_full_name = 'System';
    private $nowDate;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());
    }

    /**
     * Mark an IGT serial number as used
     * 
     * @param int $serialId IGT serial number ID
     * @param int $assignmentId The serial_assignments record ID
     * @return bool Success status
     */
    private function markIgtSerialAsUsed($serialId, $assignmentId)
    {
        $query = "
            UPDATE igt_serial_numbers 
            SET 
                status = 'used',
                used_at = :used_at,
                used_by = :used_by,
                used_in_asset_id = :assignment_id,
                updated_at = :updated_at,
                updated_by = :updated_by
            WHERE id = :id
        ";
        
        $stmt = $this->db->prepare($query);
        return $stmt->execute([
            ':id' => $serialId,
            ':used_at' => $this->nowDate,
            ':used_by' => $this->user_full_name,
            ':assignment_id' => $assignmentId,
            ':updated_at' => $this->nowDate,
            ':updated_by' => $this->user_full_name
        ]);
    }

    /**
     * Mark EyeFi serial as consumed
     */
    private function markEyefiSerialAsConsumed($eyefiSerialId, $assignmentId)
    {
        $query = "
            UPDATE eyefi_serial_numbers 
            SET 
                status = 'consumed',
                consumed_at = :consumed_at,
                consumed_by = :consumed_by,
                updated_at = :updated_at,
                updated_by = :updated_by
            WHERE id = :id
        ";
        
        $stmt = $this->db->prepare($query);
        return $stmt->execute([
            ':id' => $eyefiSerialId,
            ':consumed_at' => $this->nowDate,
            ':consumed_by' => $this->user_full_name,
            ':updated_at' => $this->nowDate,
            ':updated_by' => $this->user_full_name
        ]);
    }

    /**
     * Create a single assignment record
     * 
     * Note: IGT serial is stored in customer_asset_id and generated_asset_number
     * since serial_assignments table doesn't have specific IGT columns
     */
    private function createAssignment($assignment)
    {
        // Insert into serial_assignments table
        // customer_type_id = 1 for IGT (based on customer_types table)
        $query = "
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
                status,
                inspector_name,
                consumed_by,
                consumed_at,
                created_at,
                updated_at
            ) VALUES (
                :eyefi_serial_id,
                :eyefi_serial_number,
                :ul_label_id,
                :ul_number,
                1,
                :customer_asset_id,
                :generated_asset_number,
                :po_number,
                :part_number,
                'consumed',
                :inspector_name,
                :consumed_by,
                :consumed_at,
                :created_at,
                :updated_at
            )
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            ':eyefi_serial_id' => $assignment['eyefi_serial_id'] ?? null,
            ':eyefi_serial_number' => $assignment['eyefi_serial_number'] ?? null,
            ':ul_label_id' => $assignment['ul_label_id'] ?? null,
            ':ul_number' => $assignment['ulNumber'] ?? null,
            ':customer_asset_id' => $assignment['igt_asset_id'] ?? null, // IGT serial ID
            ':generated_asset_number' => $assignment['igt_serial_number'] ?? null, // IGT serial number
            ':po_number' => $assignment['poNumber'] ?? null,
            ':part_number' => $assignment['partNumber'] ?? null,
            ':inspector_name' => $this->user_full_name,
            ':consumed_by' => $this->user_full_name,
            ':consumed_at' => $this->nowDate,
            ':created_at' => $this->nowDate,
            ':updated_at' => $this->nowDate
        ]);
        
        return $this->db->lastInsertId();
    }

    /**
     * Bulk create IGT assignments
     * 
     * @param array $assignments Array of assignments
     * @return array Response with created assignments
     */
    public function bulkCreate($assignments)
    {
        try {
            $this->db->beginTransaction();
            
            $results = [];
            
            foreach ($assignments as $assignment) {
                // 1. Create assignment record
                $assignmentId = $this->createAssignment($assignment);
                
                // 2. Mark IGT serial as used
                if (!empty($assignment['igt_asset_id'])) {
                    $this->markIgtSerialAsUsed($assignment['igt_asset_id'], $assignmentId);
                }
                
                // 3. Mark EyeFi serial as consumed
                if (!empty($assignment['eyefi_serial_id'])) {
                    $this->markEyefiSerialAsConsumed($assignment['eyefi_serial_id'], $assignmentId);
                }
                
                // 4. Collect result
                $results[] = [
                    'assignment_id' => $assignmentId,
                    'generated_asset_number' => $assignment['igt_serial_number'],
                    'eyefi_serial_number' => $assignment['eyefi_serial_number'],
                    'ul_number' => $assignment['ulNumber'],
                    'igt_serial_number' => $assignment['igt_serial_number']
                ];
            }
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => 'Bulk IGT assignments created successfully',
                'count' => count($results),
                'data' => $results
            ];
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
