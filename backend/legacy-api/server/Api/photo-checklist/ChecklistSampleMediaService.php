<?php

/**
 * Service for managing checklist item sample media (images and videos)
 * Handles CRUD operations for the checklist_item_sample_media table
 */
class ChecklistSampleMediaService {
    private $conn;
    private $hasSampleMediaTable = null;

    public function __construct($pdo) {
        $this->conn = $pdo;
    }

    private function ensureSampleMediaTable(): bool {
        if ($this->hasSampleMediaTable !== null) {
            return $this->hasSampleMediaTable;
        }

        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'checklist_item_sample_media'");
            $stmt->execute();
            $this->hasSampleMediaTable = $stmt->rowCount() > 0;
        } catch (Exception $e) {
            $this->hasSampleMediaTable = false;
        }

        return $this->hasSampleMediaTable;
    }

    /**
     * Get all sample media for a specific checklist item
     * 
     * @param int $itemId The checklist item ID
     * @return array Array of media objects
     */
    public function getMediaForItem($itemId) {
                if (!$this->ensureSampleMediaTable()) {
                        return [];
                }

        $sql = "SELECT * FROM checklist_item_sample_media 
                WHERE checklist_item_id = :item_id 
                  AND is_active = 1 
                ORDER BY media_category DESC, order_index ASC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute(['item_id' => $itemId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get sample media grouped by type for multiple items
     * 
     * @param array $itemIds Array of checklist item IDs
     * @return array Associative array [item_id => [media objects]]
     */
    public function getMediaForItems($itemIds) {
        if (!$this->ensureSampleMediaTable()) {
            return [];
        }

        if (empty($itemIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($itemIds) - 1) . '?';
        $sql = "SELECT * FROM checklist_item_sample_media 
                WHERE checklist_item_id IN ($placeholders) 
                  AND is_active = 1 
                ORDER BY checklist_item_id, media_category DESC, order_index ASC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($itemIds);
        $allMedia = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group by item_id
        $grouped = [];
        foreach ($allMedia as $media) {
            $itemId = $media['checklist_item_id'];
            if (!isset($grouped[$itemId])) {
                $grouped[$itemId] = [];
            }
            $grouped[$itemId][] = $media;
        }

        return $grouped;
    }

    /**
     * Save sample media for an item (replaces all existing media)
     * 
     * @param int $itemId The checklist item ID
     * @param array $mediaArray Array of media objects from frontend
     * @return bool Success status
     */
    public function saveMediaForItem($itemId, $mediaArray) {
        if (!$this->ensureSampleMediaTable()) {
            return true;
        }

        try {
            $startedTransaction = false;
            if (!$this->conn->inTransaction()) {
                $this->conn->beginTransaction();
                $startedTransaction = true;
            }

            // Soft delete existing media (set is_active = 0)
            $deleteSql = "UPDATE checklist_item_sample_media 
                         SET is_active = 0, updated_at = NOW() 
                         WHERE checklist_item_id = :item_id";
            $deleteStmt = $this->conn->prepare($deleteSql);
            $deleteStmt->execute(['item_id' => $itemId]);

            // Insert new media
            if (!empty($mediaArray)) {
                foreach ($mediaArray as $media) {
                    $this->insertMedia($itemId, $media);
                }
            }

            if ($startedTransaction) {
                $this->conn->commit();
            }
            return true;
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            error_log("Error saving sample media: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Insert a single media item
     * 
     * @param int $itemId The checklist item ID
     * @param array $media Media object with url, label, etc.
     * @return int|false The inserted media ID or false on failure
     */
    private function insertMedia($itemId, $media) {
        // Determine media type from URL extension or explicit field
        $mediaType = $this->determineMediaType($media);
        
        // Determine media category
        $mediaCategory = $this->determineMediaCategory($media);

        $sql = "INSERT INTO checklist_item_sample_media (
                    checklist_item_id, media_type, media_category, url, label, description, 
                    order_index, required_for_submission, angle, distance, lighting, focus, 
                    max_duration_seconds, is_active
                ) VALUES (
                    :item_id, :media_type, :media_category, :url, :label, :description,
                    :order_index, :required_for_submission, :angle, :distance, :lighting, :focus,
                    :max_duration_seconds, 1
                )";

        $stmt = $this->conn->prepare($sql);
        $result = $stmt->execute([
            'item_id' => $itemId,
            'media_type' => $mediaType,
            'media_category' => $mediaCategory,
            'url' => $media['url'] ?? '',
            'label' => $media['label'] ?? null,
            'description' => $media['description'] ?? null,
            'order_index' => $media['order_index'] ?? 0,
            'required_for_submission' => isset($media['required_for_submission']) ? (int)$media['required_for_submission'] : 0,
            'angle' => $media['angle'] ?? null,
            'distance' => $media['distance'] ?? null,
            'lighting' => $media['lighting'] ?? null,
            'focus' => $media['focus'] ?? null,
            'max_duration_seconds' => $media['max_duration_seconds'] ?? null
        ]);

        return $result ? $this->conn->lastInsertId() : false;
    }

    /**
     * Determine media type from URL or explicit field
     */
    private function determineMediaType($media) {
        // Check explicit type first
        if (isset($media['media_type'])) {
            return $media['media_type'];
        }

        // Check if it's a video (from sample_videos array)
        if (isset($media['is_video']) && $media['is_video']) {
            return 'video';
        }

        // Check URL extension
        $url = $media['url'] ?? '';
        $extension = strtolower(pathinfo($url, PATHINFO_EXTENSION));
        
        $videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
        if (in_array($extension, $videoExtensions)) {
            return 'video';
        }

        return 'image'; // Default to image
    }

    /**
     * Determine media category based on frontend fields
     */
    private function determineMediaCategory($media) {
        // Check explicit category
        if (isset($media['media_category'])) {
            return $media['media_category'];
        }

        // Check image_type field (from frontend)
        if (isset($media['image_type'])) {
            $typeMapping = [
                'sample' => 'primary_sample',
                'reference' => 'reference',
                'diagram' => 'diagram',
                'defect_example' => 'defect_example'
            ];
            if (isset($typeMapping[$media['image_type']])) {
                return $typeMapping[$media['image_type']];
            }
        }

        // Check is_primary flag
        if (isset($media['is_primary']) && $media['is_primary']) {
            return 'primary_sample';
        }

        // Default to reference
        return 'reference';
    }

    /**
     * Convert new table format back to legacy format for backward compatibility
     * This allows existing frontend code to work without changes
     * 
     * @param int $itemId The checklist item ID
     * @return array Legacy format: ['sample_images' => [...], 'sample_videos' => [...]]
     */
    public function getMediaInLegacyFormat($itemId) {
        $media = $this->getMediaForItem($itemId);
        
        $sampleImages = [];
        $sampleVideos = [];

        foreach ($media as $item) {
            $legacyItem = [
                'url' => $item['url'],
                'label' => $item['label'],
                'description' => $item['description'],
                'order_index' => $item['order_index'],
                'is_primary' => $item['media_category'] === 'primary_sample',
                'image_type' => $this->mapCategoryToImageType($item['media_category'])
            ];

            if ($item['media_type'] === 'video') {
                $sampleVideos[] = $legacyItem;
            } else {
                $sampleImages[] = $legacyItem;
            }
        }

        return [
            'sample_images' => $sampleImages,
            'sample_videos' => $sampleVideos
        ];
    }

    /**
     * Map database media_category to legacy image_type
     */
    private function mapCategoryToImageType($category) {
        $mapping = [
            'primary_sample' => 'sample',
            'reference' => 'reference',
            'diagram' => 'diagram',
            'defect_example' => 'defect_example'
        ];
        return $mapping[$category] ?? 'reference';
    }

    /**
     * Delete all media for an item (hard delete)
     * 
     * @param int $itemId The checklist item ID
     * @return bool Success status
     */
    public function deleteMediaForItem($itemId) {
        $sql = "DELETE FROM checklist_item_sample_media WHERE checklist_item_id = :item_id";
        $stmt = $this->conn->prepare($sql);
        return $stmt->execute(['item_id' => $itemId]);
    }

    /**
     * Get primary sample image/video for an item
     * 
     * @param int $itemId The checklist item ID
     * @param string $mediaType 'image' or 'video'
     * @return array|null The primary sample media or null if not found
     */
    public function getPrimarySample($itemId, $mediaType = 'image') {
        $sql = "SELECT * FROM checklist_item_sample_media 
                WHERE checklist_item_id = :item_id 
                  AND media_type = :media_type
                  AND media_category = 'primary_sample'
                  AND is_active = 1 
                LIMIT 1";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            'item_id' => $itemId,
            'media_type' => $mediaType
        ]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get reference media for an item
     * 
     * @param int $itemId The checklist item ID
     * @param string $mediaType 'image' or 'video' (optional, null = all)
     * @return array Array of reference media
     */
    public function getReferenceMedia($itemId, $mediaType = null) {
        $sql = "SELECT * FROM checklist_item_sample_media 
                WHERE checklist_item_id = :item_id 
                  AND media_category IN ('reference', 'diagram', 'defect_example')
                  AND is_active = 1";
        
        $params = ['item_id' => $itemId];
        
        if ($mediaType !== null) {
            $sql .= " AND media_type = :media_type";
            $params['media_type'] = $mediaType;
        }
        
        $sql .= " ORDER BY order_index ASC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
