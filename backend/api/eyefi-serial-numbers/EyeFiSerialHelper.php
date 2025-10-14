<?php

/**
 * EyeFi Serial Number Helper Class
 * 
 * Handles marking EyeFi serial numbers as used/available with proper
 * transaction handling and error management.
 */
class EyeFiSerialHelper {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * Mark an EyeFi serial as used/assigned
     * 
     * @param string $serialNumber The EyeFi serial number
     * @param string $sourceTable The table using the serial ('ags_serial', 'ul_label_usages', etc.)
     * @param int $sourceId The ID of the record using this serial
     * @param string|null $assignedBy Username of person assigning (optional)
     * @return array ['success' => bool, 'message' => string]
     */
    public function markUsed($serialNumber, $sourceTable, $sourceId, $assignedBy = null) {
        try {
            $stmt = $this->pdo->prepare("CALL mark_eyefi_serial_used(?, ?, ?, ?)");
            $stmt->execute([$serialNumber, $sourceTable, $sourceId, $assignedBy]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result['success']) {
                error_log("Failed to mark EyeFi serial '{$serialNumber}': {$result['message']}");
            }
            
            return $result;
        } catch (Exception $e) {
            error_log("Error marking EyeFi serial '{$serialNumber}': " . $e->getMessage());
            return ['success' => 0, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
    
    /**
     * Mark an EyeFi serial as available/released
     * 
     * @param string $serialNumber The EyeFi serial number
     * @param string $sourceTable The table releasing the serial
     * @param int $sourceId The ID of the record releasing this serial
     * @param string|null $updatedBy Username of person releasing (optional)
     * @return array ['success' => bool, 'message' => string]
     */
    public function markAvailable($serialNumber, $sourceTable, $sourceId, $updatedBy = null) {
        try {
            $stmt = $this->pdo->prepare("CALL mark_eyefi_serial_available(?, ?, ?, ?)");
            $stmt->execute([$serialNumber, $sourceTable, $sourceId, $updatedBy]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result['success']) {
                error_log("Failed to release EyeFi serial '{$serialNumber}': {$result['message']}");
            }
            
            return $result;
        } catch (Exception $e) {
            error_log("Error releasing EyeFi serial '{$serialNumber}': " . $e->getMessage());
            return ['success' => 0, 'message' => 'Database error: ' . $e->getMessage()];
        }
    }
    
    /**
     * Check where a serial is being used across all tables
     * 
     * @param string $serialNumber The EyeFi serial number
     * @return array List of usage records
     */
    public function checkUsage($serialNumber) {
        try {
            $stmt = $this->pdo->prepare("CALL check_eyefi_serial_usage(?)");
            $stmt->execute([$serialNumber]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            error_log("Error checking EyeFi usage for '{$serialNumber}': " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Handle serial update (change from old to new)
     * Releases old serial and assigns new serial
     * 
     * @param string|null $oldSerial The old serial number (can be null)
     * @param string|null $newSerial The new serial number (can be null)
     * @param string $sourceTable The table name
     * @param int $sourceId The record ID
     * @return array ['old' => result, 'new' => result]
     */
    public function handleSerialChange($oldSerial, $newSerial, $sourceTable, $sourceId) {
        $results = ['old' => null, 'new' => null];
        
        // Release old serial (if different from new)
        if (!empty($oldSerial) && $oldSerial !== $newSerial) {
            $results['old'] = $this->markAvailable($oldSerial, $sourceTable, $sourceId);
        }
        
        // Assign new serial (if different from old)
        if (!empty($newSerial) && $oldSerial !== $newSerial) {
            $results['new'] = $this->markUsed($newSerial, $sourceTable, $sourceId);
        }
        
        return $results;
    }
}
