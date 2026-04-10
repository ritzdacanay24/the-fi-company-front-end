<?php

namespace EyefiDb\Api\IgtAssets;

use PDO;
use PDOException;

class IgtSerialNumbers
{
    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * Create a new serial number record
     */
    public function create($data)
    {

        $data['category'] = $data['category'] ?? 'gaming';
        $data['status'] = $data['status'] ?? 'available';
        $data['active'] = $data['active'] ?? 1;
        try {
            $query = "
                INSERT INTO igt_serial_numbers (
                    serial_number, category, status, manufacturer, model, 
                    notes, created_by, is_active
                ) VALUES (
                    :serial_number, :category, :status, :manufacturer, :model,
                    :notes, :created_by, :is_active
                )
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':serial_number', $data['serial_number'], PDO::PARAM_STR);
            $stmt->bindParam(':category', $data['category'], PDO::PARAM_STR);
            $stmt->bindParam(':status', $data['status'], PDO::PARAM_STR);
            $stmt->bindParam(':manufacturer', $data['manufacturer'], PDO::PARAM_STR);
            $stmt->bindParam(':model', $data['model'], PDO::PARAM_STR);
            $stmt->bindParam(':notes', $data['notes'], PDO::PARAM_STR);
            $stmt->bindParam(':created_by', $data['created_by'], PDO::PARAM_STR);
            $stmt->bindParam(':is_active', $data['active'], PDO::PARAM_INT);

            $stmt->execute();
            return $this->db->lastInsertId();

        } catch (PDOException $e) {
            throw new \Exception('Error creating serial number: ' . $e->getMessage());
        }
    }

    /**
     * Get serial number by ID
     */
    public function getById($id)
    {
        try {
            $query = "
                SELECT * FROM igt_serial_numbers 
                WHERE id = :id AND is_active = 1
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching serial number: ' . $e->getMessage());
        }
    }

    /**
     * Get serial number by serial number string
     */
    public function getBySerialNumber($serialNumber)
    {
        try {
            $query = "
                SELECT * FROM igt_serial_numbers 
                WHERE serial_number = :serial_number AND is_active = 1
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':serial_number', $serialNumber, PDO::PARAM_STR);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching serial number: ' . $e->getMessage());
        }
    }

    /**
     * Get all serial numbers with filtering and pagination
     */
    public function getAll($filters = [], $page = 1, $limit = 5000, $includeInactive = false)
    {
        try {
            if ($includeInactive) {
                // Return ALL records (no is_active filter)
                $whereConditions = []; // Remove is_active filter entirely
            } else {
                // Return only active records (current default behavior)
                $whereConditions = ['is_active = 1'];
            }

            $params = [];

            // Add filters
            if (!empty($filters['status'])) {
                $whereConditions[] = 'status = :status';
                $params[':status'] = $filters['status'];
            }

            if (!empty($filters['category'])) {
                $whereConditions[] = 'category = :category';
                $params[':category'] = $filters['category'];
            }

            if (!empty($filters['manufacturer'])) {
                $whereConditions[] = 'manufacturer LIKE :manufacturer';
                $params[':manufacturer'] = '%' . $filters['manufacturer'] . '%';
            }

            if (!empty($filters['serial_number'])) {
                $whereConditions[] = 'serial_number LIKE :serial_number';
                $params[':serial_number'] = '%' . $filters['serial_number'] . '%';
            }

            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            $offset = ($page - 1) * $limit;

            $query = "
                SELECT * FROM igt_serial_numbers 
                {$whereClause}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $this->db->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value, PDO::PARAM_STR);
            }
            
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM igt_serial_numbers {$whereClause}";
            $countStmt = $this->db->prepare($countQuery);
            
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value, PDO::PARAM_STR);
            }
            
            $countStmt->execute();
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            return [
                'data' => $results,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => ceil($total / $limit)
            ];

        } catch (PDOException $e) {
            throw new \Exception('Error fetching serial numbers: ' . $e->getMessage());
        }
    }

    /**
     * Update a serial number record
     */
    public function update($id, $data)
    {
        try {
            $query = "
                UPDATE igt_serial_numbers 
                SET serial_number = :serial_number,
                    category = :category,
                    status = :status,
                    manufacturer = :manufacturer,
                    model = :model,
                    notes = :notes,
                    updated_by = :updated_by,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND is_active = 1
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':serial_number', $data['serial_number'], PDO::PARAM_STR);
            $stmt->bindParam(':category', $data['category'], PDO::PARAM_STR);
            $stmt->bindParam(':status', $data['status'], PDO::PARAM_STR);
            $stmt->bindParam(':manufacturer', $data['manufacturer'], PDO::PARAM_STR);
            $stmt->bindParam(':model', $data['model'], PDO::PARAM_STR);
            $stmt->bindParam(':notes', $data['notes'], PDO::PARAM_STR);
            $stmt->bindParam(':updated_by', $data['updated_by'], PDO::PARAM_STR);

            return $stmt->execute();

        } catch (PDOException $e) {
            throw new \Exception('Error updating serial number: ' . $e->getMessage());
        }
    }

    /**
     * Mark a serial number as used
     */
    public function markAsUsed($id, $assetId, $assetNumber, $usedBy)
    {
        try {
            $query = "
                UPDATE igt_serial_numbers 
                SET status = 'used',
                    used_at = CURRENT_TIMESTAMP,
                    used_by = :used_by,
                    used_in_asset_id = :asset_id,
                    used_in_asset_number = :asset_number,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :used_by
                WHERE id = :id AND status = 'available' AND is_active = 1
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':used_by', $usedBy, PDO::PARAM_STR);
            $stmt->bindParam(':asset_id', $assetId, PDO::PARAM_INT);
            $stmt->bindParam(':asset_number', $assetNumber, PDO::PARAM_STR);

            return $stmt->execute() && $stmt->rowCount() > 0;

        } catch (PDOException $e) {
            throw new \Exception('Error marking serial number as used: ' . $e->getMessage());
        }
    }

    /**
     * Get available serial numbers by category
     */
    public function getAvailableByCategory($category, $limit = 50)
    {
        try {
            $query = "
                SELECT * FROM igt_serial_numbers 
                WHERE category = :category 
                    AND status = 'available' 
                    AND is_active = 1
                ORDER BY created_at ASC
                LIMIT :limit
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':category', $category, PDO::PARAM_STR);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching available serial numbers: ' . $e->getMessage());
        }
    }

    /**
     * Soft delete a serial number
     */
    public function delete($id, $deletedBy)
    {
        try {
            $query = "
                UPDATE igt_serial_numbers 
                SET is_active = 0,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :deleted_by
                WHERE id = :id
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':deleted_by', $deletedBy, PDO::PARAM_STR);

            return $stmt->execute();

        } catch (PDOException $e) {
            throw new \Exception('Error deleting serial number: ' . $e->getMessage());
        }
    }

    /**
     * Bulk import serial numbers
     */
    public function bulkImport($serialNumbers, $createdBy, $category = 'gaming', $manufacturer = null)
    {
        try {
            $this->db->beginTransaction();

            $query = "
                INSERT INTO igt_serial_numbers (
                    serial_number, category, status, manufacturer, created_by
                ) VALUES (
                    :serial_number, :category, 'available', :manufacturer, :created_by
                )
            ";

            $stmt = $this->db->prepare($query);
            $successCount = 0;
            $errors = [];

            foreach ($serialNumbers as $serialNumber) {
                try {
                    $stmt->bindParam(':serial_number', $serialNumber, PDO::PARAM_STR);
                    $stmt->bindParam(':category', $category, PDO::PARAM_STR);
                    $stmt->bindParam(':manufacturer', $manufacturer, PDO::PARAM_STR);
                    $stmt->bindParam(':created_by', $createdBy, PDO::PARAM_STR);
                    
                    if ($stmt->execute()) {
                        $successCount++;
                    }
                } catch (PDOException $e) {
                    $errors[] = "Serial number '{$serialNumber}': " . $e->getMessage();
                }
            }

            $this->db->commit();

            return [
                'success_count' => $successCount,
                'total_count' => count($serialNumbers),
                'errors' => $errors
            ];

        } catch (PDOException $e) {
            $this->db->rollback();
            throw new \Exception('Error during bulk import: ' . $e->getMessage());
        }
    }

    /**
     * Get usage statistics
     */
    public function getUsageStats()
    {
        try {
            $query = "
                SELECT 
                    category,
                    status,
                    COUNT(*) as count
                FROM igt_serial_numbers 
                WHERE is_active = 1
                GROUP BY category, status
                ORDER BY category, status
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching usage statistics: ' . $e->getMessage());
        }
    }
}
