<?php

/**
 * Checklist Template Transformer
 * Transforms between database flat format and clean enterprise API format
 * PHP equivalent of TypeScript ChecklistTemplateTransformer
 */
class ChecklistTemplateTransformer {
    
    /**
     * Transform database format to clean API response format
     * Returns nested structure for easy display/traversal
     * @param array $dbTemplate Raw database template with flat items
     * @return array Clean API response with nested items
     */

    /**
     * Transform database format to clean API response format. 
     * Return nested sturcture for the api to the cusomer. at the rate of the response frontend to the backend. 
     */
    public static function toApiResponse($dbTemplate) {
        if (empty($dbTemplate)) {
            return null;
        }

        $items = $dbTemplate['items'] ?? [];
        
        // Transform items to clean nested format for display
        $transformedItems = self::transformItemsToNested($items);

        // Build response maintaining compatible structure with improvements
        return [
            'id' => (int)$dbTemplate['id'],
            'name' => $dbTemplate['name'],
            'description' => $dbTemplate['description'] ?? '',
            'part_number' => $dbTemplate['part_number'] ?? '',
            'customer_part_number' => $dbTemplate['customer_part_number'] ?? '',
            'revision' => $dbTemplate['revision'] ?? '',
            'original_filename' => $dbTemplate['original_filename'] ?? '',
            'review_date' => $dbTemplate['review_date'] ?? null,
            'revision_number' => $dbTemplate['revision_number'] ?? null,
            'revision_details' => $dbTemplate['revision_details'] ?? null,
            'revised_by' => $dbTemplate['revised_by'] ?? null,
            'product_type' => $dbTemplate['product_type'] ?? '',
            'category' => $dbTemplate['category'] ?? '',
            'version' => (int)($dbTemplate['version'] ?? 1),
            'template_group_id' => isset($dbTemplate['template_group_id']) ? (int)$dbTemplate['template_group_id'] : null,
            'parent_template_id' => isset($dbTemplate['parent_template_id']) ? (int)$dbTemplate['parent_template_id'] : null,
            'is_active' => self::toBoolean($dbTemplate['is_active'] ?? true),
            'created_at' => $dbTemplate['created_at'] ?? null,
            'updated_at' => $dbTemplate['updated_at'] ?? null,
            'created_by' => $dbTemplate['created_by'] ?? null,
            
            // Quality document (kept as metadata for compatibility)
            'quality_document_metadata' => $dbTemplate['quality_document_metadata'] ?? null,
            
            // Nested items structure (children inside parents)
            'items' => $transformedItems
        ];
    }

    /**
     * Transform quality document metadata to nested object
     * @param array $dbTemplate Database template
     * @return array|null Quality document object or null
     */
    private static function transformQualityDocument($dbTemplate) {
        $metadata = $dbTemplate['quality_document_metadata'] ?? null;
        
        if (empty($metadata)) {
            return null;
        }

        return [
            'document_id' => (int)$metadata['document_id'],
            'revision_id' => (int)$metadata['revision_id'],
            'document_number' => $metadata['document_number'] ?? '',
            'revision_number' => (int)$metadata['revision_number'],
            'title' => $metadata['title'] ?? '',
            'version_string' => $metadata['version_string'] ?? ''
        ];
    }

    /**
     * Transform flat items array to nested hierarchy
     * @param array $items Flat array of items from database
     * @return array Nested array with children
     */
    private static function transformItemsToNested($items) {
        if (empty($items) || !is_array($items)) {
            return [];
        }

        $itemsById = [];
        $rootItems = [];

        // First pass: transform and index all items
        foreach ($items as $item) {
            $transformedItem = self::transformItem($item);
            $itemsById[$transformedItem['id']] = $transformedItem;
        }

        // Second pass: build hierarchy
        foreach ($itemsById as $id => $item) {
            $parentId = $item['parent_id'];
            $level = $item['level'];
            
            // Root item (level 0 or no parent)
            if ($level === 0 || $parentId === null || $parentId === 0) {
                $rootItems[] = $id;
            }
            // Child item - nest under parent
            elseif (isset($itemsById[$parentId])) {
                if (!isset($itemsById[$parentId]['children'])) {
                    $itemsById[$parentId]['children'] = [];
                }
                $itemsById[$parentId]['children'][] = &$itemsById[$id];
            }
            // Orphaned item - treat as root
            else {
                $rootItems[] = $id;
            }
        }

        // Third pass: clean up and build final result
        $result = [];
        foreach ($rootItems as $rootId) {
            $item = $itemsById[$rootId];
            
            // Recursively sort and clean children
            self::cleanItemRecursive($item);
            
            // Remove redundant parent_id and level from root items
            unset($item['parent_id']);
            unset($item['level']);
            
            $result[] = $item;
        }

        // Sort root items by order_index
        usort($result, function($a, $b) {
            return $a['order_index'] <=> $b['order_index'];
        });

        return $result;
    }

    /**
     * Transform flat items array and keep them FLAT
     * Used by template editor which expects level/parent_id fields
     * @param array $items Flat array of items from database
     * @return array Flat array with transformed items
     */
    private static function transformItemsFlat($items) {
        if (empty($items) || !is_array($items)) {
            return [];
        }

        $result = [];
        foreach ($items as $item) {
            $result[] = self::transformItem($item);
        }

        // Sort by order_index (maintains parent-child sequential order)
        usort($result, function($a, $b) {
            return $a['order_index'] <=> $b['order_index'];
        });

        return $result;
    }

    /**
     * Recursively clean and sort items
     * Removes parent_id and level from children (redundant in nested structure)
     * @param array &$item Item to clean (passed by reference)
     */
    private static function cleanItemRecursive(&$item) {
        if (!isset($item['children']) || empty($item['children'])) {
            // Remove empty children array
            if (isset($item['children'])) {
                unset($item['children']);
            }
            return;
        }

        // Sort children by order_index
        usort($item['children'], function($a, $b) {
            return $a['order_index'] <=> $b['order_index'];
        });

        // Clean each child
        foreach ($item['children'] as &$child) {
            // Remove redundant fields from nested children
            unset($child['parent_id']);
            unset($child['level']);
            
            // Recursively clean grandchildren
            self::cleanItemRecursive($child);
        }
    }

    /**
     * Transform media array to sample images format
     * @param array $mediaArray Database media array
     * @return array Clean sample images array
     */
    private static function transformMediaToSampleImages($mediaArray) {
        if (empty($mediaArray) || !is_array($mediaArray)) {
            return [];
        }

        $result = [];
        foreach ($mediaArray as $index => $media) {
            $result[] = [
                'url' => $media['url'] ?? '',
                'label' => $media['label'] ?? $media['caption'] ?? '',
                'description' => $media['description'] ?? '',
                'type' => $media['type'] ?? 'photo',
                'image_type' => $media['image_type'] ?? 'reference',
                'is_primary' => self::toBoolean($media['is_primary'] ?? false),
                'order_index' => isset($media['order_index']) ? (int)$media['order_index'] : $index
            ];
        }

        return $result;
    }

    /**
     * Transform media array to sample videos format
     * @param array $mediaArray Database media array
     * @return array Clean sample videos array
     */
    private static function transformMediaToSampleVideos($mediaArray) {
        if (empty($mediaArray) || !is_array($mediaArray)) {
            return [];
        }

        $result = [];
        foreach ($mediaArray as $index => $media) {
            $result[] = [
                'url' => $media['url'] ?? '',
                'label' => $media['label'] ?? $media['caption'] ?? '',
                'description' => $media['description'] ?? '',
                'type' => $media['type'] ?? 'video',
                'is_primary' => self::toBoolean($media['is_primary'] ?? false),
                'order_index' => isset($media['order_index']) ? (int)$media['order_index'] : $index,
                'duration_seconds' => isset($media['duration_seconds']) ? (int)$media['duration_seconds'] : null
            ];
        }

        return $result;
    }

    /**
     * Transform single item to clean API format
     * Returns hybrid format compatible with frontend while removing redundancies
     * @param array $dbItem Database item
     * @return array Clean API item
     */
    private static function transformItem($dbItem) {
        $photoReq = $dbItem['photo_requirements'] ?? [];
        $videoReq = $dbItem['video_requirements'] ?? [];
        $links = $dbItem['links'] ?? [];

        if (is_string($links)) {
            $decodedLinks = json_decode($links, true);
            $links = is_array($decodedLinks) ? $decodedLinks : [];
        }
        
        // Build clean photo_requirements (no duplication)
        $cleanPhotoReq = [
            'min_photos' => (int)($photoReq['min_photos'] ?? 0),
            'max_photos' => (int)($photoReq['max_photos'] ?? 10),
            'picture_required' => isset($photoReq['picture_required']) ? self::toBoolean($photoReq['picture_required']) : true
        ];

        // Add optional photo requirements only if present
        if (!empty($photoReq['angle'])) $cleanPhotoReq['angle'] = $photoReq['angle'];
        if (!empty($photoReq['distance'])) $cleanPhotoReq['distance'] = $photoReq['distance'];
        if (!empty($photoReq['lighting'])) $cleanPhotoReq['lighting'] = $photoReq['lighting'];
        if (!empty($photoReq['focus'])) $cleanPhotoReq['focus'] = $photoReq['focus'];
        
        // Build clean video_requirements (only if video is allowed)
        $cleanVideoReq = null;
        if (!empty($videoReq)) {
            $cleanVideoReq = [
                'max_duration_seconds' => (int)($videoReq['max_duration_seconds'] ?? 30),
                'submission_time_seconds' => (int)($videoReq['submission_time_seconds'] ?? 0)
            ];
            if (isset($videoReq['min_duration'])) {
                $cleanVideoReq['min_duration'] = (int)$videoReq['min_duration'];
            }
        }

        return [
            'id' => (int)$dbItem['id'],
            'title' => $dbItem['title'] ?? '',
            'description' => $dbItem['description'] ?? '',
            'order_index' => (float)$dbItem['order_index'],
            'is_required' => self::toBoolean($dbItem['is_required'] ?? true),
            'submission_type' => $dbItem['submission_type'] ?? 'photo',
            'links' => is_array($links) ? $links : [],
            
            // Clean requirements (no duplication at root level)
            'photo_requirements' => $cleanPhotoReq,
            'video_requirements' => $cleanVideoReq,
            
            // Media arrays (cleaned format)
            'sample_images' => self::transformMediaToSampleImages($dbItem['sample_images'] ?? []),
            'sample_image_url' => $dbItem['sample_image_url'] ?? null,
            'sample_videos' => self::transformMediaToSampleVideos($dbItem['sample_videos'] ?? []),
            
            // Hierarchical metadata (parent_id will be removed in nested structure)
            'level' => isset($dbItem['level']) ? (int)$dbItem['level'] : 0,
            'parent_id' => isset($dbItem['parent_id']) ? (int)$dbItem['parent_id'] : null
        ];
    }

    /**
     * Convert database value to boolean
     * @param mixed $value Database value (1, "1", true, etc.)
     * @return bool Boolean value
     */
    private static function toBoolean($value) {
        if (is_bool($value)) {
            return $value;
        }
        return in_array($value, [1, '1', 'true', 'yes'], true);
    }
}
