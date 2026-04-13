<?php
/**
 * EyeFi Asset Number Generator
 * Generates asset numbers in format: YYYYMMDDXXX
 * Where XXX is a sequential number for the day (001-999)
 * 
 * Example: 20251105001, 20251105002, etc.
 */

class AssetNumberGenerator {
    private $db;
    private $user_full_name;

    public function __construct($db, $user_full_name = 'System') {
        $this->db = $db;
        $this->user_full_name = $user_full_name;
    }

    /**
     * Generate next available asset number for today
     * Format: YYYYMMDDXXX (e.g., 20251105001)
     * 
     * @param string $category 'New' or 'Used'
     * @return array ['asset_number' => '20251105001', 'id' => 123]
     */
    public function generateAssetNumber($category = 'New') {
        try {
            $this->db->beginTransaction();

            $today = date('Y-m-d');
            $datePrefix = date('Ymd'); // YYYYMMDD format

            // Get the last sequence number for today
            $query = "SELECT MAX(daily_sequence) as last_sequence 
                      FROM eyefi_asset_numbers 
                      WHERE generation_date = ?
                      FOR UPDATE"; // Lock for concurrent safety
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$today]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            // Calculate next sequence (starts at 1 each day)
            $nextSequence = ($result && $result['last_sequence']) ? (int)$result['last_sequence'] + 1 : 1;

            // Format sequence as 3-digit number (001, 002, etc.)
            $sequenceStr = str_pad($nextSequence, 3, '0', STR_PAD_LEFT);

            // Create asset number: YYYYMMDDXXX
            $assetNumber = $datePrefix . $sequenceStr;

            // Insert into database
            $insertQuery = "INSERT INTO eyefi_asset_numbers (
                asset_number,
                generation_date,
                daily_sequence,
                status,
                category,
                created_by,
                updated_by
            ) VALUES (?, ?, ?, 'available', ?, ?, ?)";

            $insertStmt = $this->db->prepare($insertQuery);
            $insertStmt->execute([
                $assetNumber,
                $today,
                $nextSequence,
                $category,
                $this->user_full_name,
                $this->user_full_name
            ]);

            $insertId = $this->db->lastInsertId();

            $this->db->commit();

            return [
                'success' => true,
                'asset_number' => $assetNumber,
                'id' => $insertId,
                'generation_date' => $today,
                'daily_sequence' => $nextSequence
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
     * Generate multiple asset numbers at once
     * 
     * @param int $quantity Number of asset numbers to generate
     * @param string $category 'New' or 'Used'
     * @return array Array of generated asset numbers
     */
    public function bulkGenerate($quantity, $category = 'New') {
        $generatedAssets = [];
        $errors = [];

        for ($i = 0; $i < $quantity; $i++) {
            $result = $this->generateAssetNumber($category);
            
            if ($result['success']) {
                $generatedAssets[] = $result;
            } else {
                $errors[] = $result['error'];
            }
        }

        return [
            'success' => count($errors) === 0,
            'data' => $generatedAssets,
            'errors' => $errors,
            'generated_count' => count($generatedAssets)
        ];
    }

    /**
     * Get available asset numbers
     * 
     * @param array $filters Filter options (status, category, limit, etc.)
     * @return array List of available asset numbers
     */
    public function getAvailableAssetNumbers($filters = []) {
        try {
            $query = "SELECT * FROM eyefi_asset_numbers WHERE 1=1";
            $params = [];

            // Apply filters
            if (!empty($filters['status'])) {
                $query .= " AND status = ?";
                $params[] = $filters['status'];
            } else {
                // Default to available only
                $query .= " AND status = 'available'";
            }

            if (!empty($filters['category'])) {
                $query .= " AND category = ?";
                $params[] = $filters['category'];
            }

            if (!empty($filters['generation_date'])) {
                $query .= " AND generation_date = ?";
                $params[] = $filters['generation_date'];
            }

            // Order by most recent first
            $query .= " ORDER BY generation_date DESC, daily_sequence DESC";

            // Apply limit
            if (!empty($filters['limit'])) {
                $limit = (int)$filters['limit'];
                $query .= " LIMIT $limit";
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
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Mark asset number as consumed
     * 
     * @param int $assetNumberId Asset number ID
     * @param string $workOrder Work order number
     * @return bool Success status
     */
    public function markAsConsumed($assetNumberId, $workOrder = null) {
        try {
            $query = "UPDATE eyefi_asset_numbers 
                      SET status = 'consumed',
                          consumed_at = NOW(),
                          consumed_by = ?,
                          assigned_to_wo = ?,
                          updated_by = ?
                      WHERE id = ?";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $this->user_full_name,
                $workOrder,
                $this->user_full_name,
                $assetNumberId
            ]);

            return ['success' => true];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Create asset assignment record using existing serial_assignments table
     * Uses generated_asset_number column to store EYEFI Asset Number
     * 
     * @param array $assignmentData Assignment details
     * @return array Assignment result
     */
    public function createAssignment($assignmentData) {
        try {
            $this->db->beginTransaction();

            // Insert into serial_assignments table (reusing existing structure)
            $query = "INSERT INTO serial_assignments (
                eyefi_asset_number_id,
                generated_asset_number,
                eyefi_serial_id,
                eyefi_serial_number,
                ul_label_id,
                ul_number,
                work_order_number,
                wo_part,
                wo_description,
                customer_name,
                eyefi_part_number,
                volts,
                hz,
                amps,
                assigned_by,
                created_by,
                updated_by,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $assignmentData['asset_number_id'],
                $assignmentData['asset_number'], // Stores in generated_asset_number
                $assignmentData['eyefi_serial_id'] ?? null,
                $assignmentData['eyefi_serial_number'] ?? null,
                $assignmentData['ul_label_id'] ?? null,
                $assignmentData['ul_number'] ?? null,
                $assignmentData['work_order_number'],
                $assignmentData['wo_part'] ?? null,
                $assignmentData['wo_description'] ?? null,
                $assignmentData['customer_name'] ?? null,
                $assignmentData['eyefi_part_number'] ?? null,
                $assignmentData['volts'] ?? null,
                $assignmentData['hz'] ?? null,
                $assignmentData['amps'] ?? null,
                $this->user_full_name,
                $this->user_full_name,
                $this->user_full_name
            ]);

            $assignmentId = $this->db->lastInsertId();

            // Mark asset number as consumed
            $this->markAsConsumed(
                $assignmentData['asset_number_id'],
                $assignmentData['work_order_number']
            );

            // Mark serial as consumed if provided
            if (!empty($assignmentData['eyefi_serial_id'])) {
                $updateSerial = "UPDATE eyefi_serial_numbers 
                                 SET status = 'consumed', 
                                     consumed_at = NOW(),
                                     consumed_by = ?
                                 WHERE id = ?";
                $serialStmt = $this->db->prepare($updateSerial);
                $serialStmt->execute([$this->user_full_name, $assignmentData['eyefi_serial_id']]);
            }

            // Mark UL label as consumed if provided
            if (!empty($assignmentData['ul_label_id'])) {
                $updateUL = "UPDATE ul_labels 
                             SET status = 'consumed',
                                 consumed_at = NOW(),
                                 consumed_by = ?
                             WHERE id = ?";
                $ulStmt = $this->db->prepare($updateUL);
                $ulStmt->execute([$this->user_full_name, $assignmentData['ul_label_id']]);
            }

            $this->db->commit();

            return [
                'success' => true,
                'assignment_id' => $assignmentId,
                'asset_number' => $assignmentData['asset_number']
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
     * Bulk create assignments
     * 
     * @param array $assignments Array of assignment data
     * @return array Results
     */
    public function bulkCreateAssignments($assignments) {
        $results = [];
        $errors = [];
        $successCount = 0;

        foreach ($assignments as $assignment) {
            $result = $this->createAssignment($assignment);
            
            if ($result['success']) {
                $results[] = $result;
                $successCount++;
            } else {
                $errors[] = $result['error'];
            }
        }

        return [
            'success' => count($errors) === 0,
            'data' => $results,
            'errors' => $errors,
            'success_count' => $successCount,
            'total_count' => count($assignments)
        ];
    }
}
