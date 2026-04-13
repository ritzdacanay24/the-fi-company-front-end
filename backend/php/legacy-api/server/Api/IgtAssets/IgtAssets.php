<?php

namespace EyefiDb\Api\IgtAssets;

use PDO;
use PDOException;

class IgtAssets
{
    protected $db;
    protected $serialNumbersService;

    public function __construct($db)
    {
        $this->db = $db;
        $this->serialNumbersService = new IgtSerialNumbers($db);
    }

    /**
     * Create a new IGT asset record
     */
    public function create($data)
    {
        try {
            $this->db->beginTransaction();

            // Use last unused serial number if not provided
            $serialNumberId = null;
            $serialNumberRecord = $this->getLastUnusedSerialNumber();
            if ($serialNumberRecord) {
                $serialNumberId = $serialNumberRecord['serial_number'];
            } else {
                throw new \Exception('No available serial numbers found');  
            }

            if(!$serialNumberId){
                throw new \Exception('Serial number is required');
            }

            $query = "
                INSERT INTO igt_assets (
                    generated_IGT_asset, serial_number, wo_number, wo_part, wo_description, property_site,
                    igt_part_number, eyefi_part_number, eyefi_serial_number, inspector_name, 
                    notes, created_by, serial_number_id
                ) VALUES (
                    :generated_IGT_asset, :serial_number, :wo_number, :wo_part, :wo_description, :property_site,
                    :igt_part_number, :eyefi_part_number, :eyefi_serial_number, :inspector_name,
                    :notes, :created_by, :serial_number_id
                )
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindValue(':generated_IGT_asset', $data['generated_IGT_asset'], PDO::PARAM_STR);
            $stmt->bindValue(':serial_number', $data['serial_number'], PDO::PARAM_STR);
            $stmt->bindValue(':wo_number', $data['wo_number'], PDO::PARAM_STR);
            $stmt->bindValue(':wo_part', $data['wo_part'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':wo_description', $data['wo_description'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':property_site', $data['property_site'], PDO::PARAM_STR);
            $stmt->bindValue(':igt_part_number', $data['igt_part_number'], PDO::PARAM_STR);
            $stmt->bindValue(':eyefi_part_number', $data['eyefi_part_number'], PDO::PARAM_STR);
            $stmt->bindValue(':eyefi_serial_number', $data['eyefi_serial_number'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':inspector_name', $data['inspector_name'], PDO::PARAM_STR);
            $stmt->bindValue(':notes', $data['notes'], PDO::PARAM_STR);
            $stmt->bindValue(':created_by', $data['created_by'], PDO::PARAM_STR);
            $stmt->bindValue(':serial_number_id', $serialNumberRecord['id'], PDO::PARAM_INT);

            $stmt->execute();
            $assetId = $this->db->lastInsertId();

            // Mark serial number as used if it was from preloaded list
            if ($serialNumberRecord) {
                $this->serialNumbersService->markAsUsed(
                    $serialNumberRecord['id'],
                    $assetId,
                    $data['generated_IGT_asset'],
                    $data['created_by']
                );
            }

            $this->db->commit();
            
            // Return asset details including the assigned serial number
            return [
                'id' => $assetId,
                'serial_number' => $serialNumberRecord['serial_number'],
                'generated_IGT_asset' => $data['generated_IGT_asset']
            ];

        } catch (PDOException $e) {
            $this->db->rollback();
            throw new \Exception('Error creating IGT asset: ' . $e->getMessage());
        }
    }

    /**
     * Get IGT asset by ID
     */
    public function getById($id)
    {
        try {
            $query = "
                SELECT a.*, s.category as serial_category, s.manufacturer as serial_manufacturer,
                       s.model as serial_model, s.status as serial_status
                FROM igt_assets a
                LEFT JOIN igt_serial_numbers s ON a.serial_number_id = s.id
                WHERE a.id = :id AND a.active = 1
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching IGT asset: ' . $e->getMessage());
        }
    }

    /**
     * Get IGT asset by asset number
     */
    public function getByAssetNumber($assetNumber)
    {
        try {
            $query = "
                SELECT a.*, s.category as serial_category, s.manufacturer as serial_manufacturer,
                       s.model as serial_model, s.status as serial_status
                FROM igt_assets a
                LEFT JOIN igt_serial_numbers s ON a.serial_number_id = s.id
                WHERE a.generated_IGT_asset = :asset_number AND a.active = 1
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindValue(':asset_number', $assetNumber, PDO::PARAM_STR);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching IGT asset: ' . $e->getMessage());
        }
    }

    /**
     * Get all IGT assets with filtering and pagination
     */
    public function getAll($filters = [], $page = 1, $limit = 5000, $includeInactive)
    {
        try {
            if ($includeInactive) {
                $whereConditions = []; // Remove is_active filter entirely
        } else {
                // Return only active records (current default behavior)
                $whereConditions = ['active = 1'];
            }
            $params = [];

            // Add filters
            if (!empty($filters['serial_number'])) {
                $whereConditions[] = 'a.serial_number LIKE :serial_number';
                $params[':serial_number'] = '%' . $filters['serial_number'] . '%';
            }

            if (!empty($filters['generated_IGT_asset'])) {
                $whereConditions[] = 'a.generated_IGT_asset LIKE :generated_IGT_asset';
                $params[':generated_IGT_asset'] = '%' . $filters['generated_IGT_asset'] . '%';
            }

            if (!empty($filters['wo_number'])) {
                $whereConditions[] = 'a.wo_number LIKE :wo_number';
                $params[':wo_number'] = '%' . $filters['wo_number'] . '%';
            }

            if (!empty($filters['wo_part'])) {
                $whereConditions[] = 'a.wo_part LIKE :wo_part';
                $params[':wo_part'] = '%' . $filters['wo_part'] . '%';
            }

            if (!empty($filters['property_site'])) {
                $whereConditions[] = 'a.property_site LIKE :property_site';
                $params[':property_site'] = '%' . $filters['property_site'] . '%';
            }

            if (!empty($filters['inspector_name'])) {
                $whereConditions[] = 'a.inspector_name LIKE :inspector_name';
                $params[':inspector_name'] = '%' . $filters['inspector_name'] . '%';
            }

            if (!empty($filters['date_from'])) {
                $whereConditions[] = 'DATE(a.created_at) >= :date_from';
                $params[':date_from'] = $filters['date_from'];
            }

            if (!empty($filters['date_to'])) {
                $whereConditions[] = 'DATE(a.created_at) <= :date_to';
                $params[':date_to'] = $filters['date_to'];
            }

            $whereClause = implode(' AND ', $whereConditions);
            $offset = ($page - 1) * $limit;

            $query = "
                SELECT a.*, s.category as serial_category, s.manufacturer as serial_manufacturer,
                       s.model as serial_model, s.status as serial_status,
                       s.serial_number igt_serial_number
                FROM igt_assets a
                LEFT JOIN igt_serial_numbers s ON a.serial_number_id = s.id
                WHERE {$whereClause}
                ORDER BY a.created_at DESC
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
            $countQuery = "
                SELECT COUNT(*) as total 
                FROM igt_assets a
                LEFT JOIN igt_serial_numbers s ON a.serial_number_id = s.id
                WHERE {$whereClause}
            ";
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
            throw new \Exception('Error fetching IGT assets: ' . $e->getMessage());
        }
    }

    /**
     * Update an IGT asset record
     */
    public function update($id, $data)
    {
        try {
            $query = "
                UPDATE igt_assets 
                SET generated_IGT_asset = :generated_IGT_asset,
                    serial_number = :serial_number,
                    wo_number = :wo_number,
                    wo_part = :wo_part,
                    wo_description = :wo_description,
                    property_site = :property_site,
                    igt_part_number = :igt_part_number,
                    eyefi_part_number = :eyefi_part_number,
                    eyefi_serial_number = :eyefi_serial_number,
                    inspector_name = :inspector_name,
                    notes = :notes,
                    updated_by = :updated_by,
                    updated_at = CURRENT_TIMESTAMP,
                    last_update = CURRENT_TIMESTAMP
                WHERE id = :id AND active = 1
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':generated_IGT_asset', $data['generated_IGT_asset'], PDO::PARAM_STR);
            $stmt->bindValue(':serial_number', $data['serial_number'], PDO::PARAM_STR);
            $stmt->bindValue(':wo_number', $data['wo_number'], PDO::PARAM_STR);
            $stmt->bindValue(':wo_part', $data['wo_part'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':wo_description', $data['wo_description'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':property_site', $data['property_site'], PDO::PARAM_STR);
            $stmt->bindValue(':igt_part_number', $data['igt_part_number'], PDO::PARAM_STR);
            $stmt->bindValue(':eyefi_part_number', $data['eyefi_part_number'], PDO::PARAM_STR);
            $stmt->bindValue(':eyefi_serial_number', $data['eyefi_serial_number'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':inspector_name', $data['inspector_name'], PDO::PARAM_STR);
            $stmt->bindValue(':notes', $data['notes'], PDO::PARAM_STR);
            $stmt->bindValue(':updated_by', $data['updated_by'], PDO::PARAM_STR);

            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                throw new \Exception('No asset updated. Asset may not exist or is not active.');
            }
            return true;

        } catch (PDOException $e) {
            throw new \Exception('Error updating IGT asset: ' . $e->getMessage());
        }
    }

    /**
     * Soft delete an IGT asset
     */
    public function delete($id, $deletedBy)
    {
        try {
            $query = "
                UPDATE igt_assets 
                SET active = 0,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :deleted_by
                WHERE id = :id
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->bindValue(':deleted_by', $deletedBy, PDO::PARAM_STR);

            return $stmt->execute();

        } catch (PDOException $e) {
            throw new \Exception('Error deleting IGT asset: ' . $e->getMessage());
        }
    }

    /**
     * Generate a unique IGT asset number
     */
    private function generateAssetNumber()
    {
        $prefix = 'IGT';
        $year = date('Y');
        
        // Get the next sequence number for this year
        $query = "
            SELECT COUNT(*) + 1 as next_seq
            FROM igt_assets 
            WHERE YEAR(created_at) = :year
        ";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(':year', $year, PDO::PARAM_INT);
        $stmt->execute();
        
        $nextSeq = $stmt->fetch(PDO::FETCH_ASSOC)['next_seq'];
        
        return $prefix . $year . str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get assets by work order number
     */
    public function getByWorkOrder($woNumber)
    {
        try {
            $query = "
                SELECT a.*, s.category as serial_category, s.manufacturer as serial_manufacturer,
                       s.model as serial_model, s.status as serial_status
                FROM igt_assets a
                LEFT JOIN igt_serial_numbers s ON a.serial_number_id = s.id
                WHERE a.wo_number = :wo_number AND a.active = 1
                ORDER BY a.created_at DESC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->bindValue(':wo_number', $woNumber, PDO::PARAM_STR);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching assets by work order: ' . $e->getMessage());
        }
    }

    /**
     * Get asset creation statistics
     */
    public function getCreationStats($dateFrom = null, $dateTo = null)
    {
        try {
            $whereConditions = ['active = 1'];
            $params = [];

            if ($dateFrom) {
                $whereConditions[] = 'DATE(created_at) >= :date_from';
                $params[':date_from'] = $dateFrom;
            }

            if ($dateTo) {
                $whereConditions[] = 'DATE(created_at) <= :date_to';
                $params[':date_to'] = $dateTo;
            }

            $whereClause = implode(' AND ', $whereConditions);

            $query = "
                SELECT 
                    DATE(created_at) as creation_date,
                    inspector_name,
                    property_site,
                    COUNT(*) as asset_count
                FROM igt_assets 
                WHERE {$whereClause}
                GROUP BY DATE(created_at), inspector_name, property_site
                ORDER BY creation_date DESC, inspector_name, property_site
            ";

            $stmt = $this->db->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value, PDO::PARAM_STR);
            }
            
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            throw new \Exception('Error fetching creation statistics: ' . $e->getMessage());
        }
    }

    /**
     * Get the first (oldest) unused serial number from igt_serial_numbers
     */
    public function getLastUnusedSerialNumber()
    {
        try {
            $query = "
                SELECT *
                FROM igt_serial_numbers
                WHERE status = 'available' and is_active = 1
                ORDER BY created_at ASC, id ASC
                LIMIT 1
            ";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            throw new \Exception('Error fetching last unused serial number: ' . $e->getMessage());
        }
    }
}