<?php

/**
 * Template Change Tracker
 * Intelligently detects and logs changes between template versions
 */
class TemplateChangeTracker {
    private $conn;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Compare two templates and detect changes
     * 
     * @param array $oldTemplate Original template data (from database)
     * @param array $newTemplate New template data (from form submission)
     * @return array Detailed change information
     */
    public function detectChanges($oldTemplate, $newTemplate) {
        $changes = [
            'fields_changed' => [],
            'field_changes' => [],
            'items_added' => [],
            'items_removed' => [],
            'items_modified' => [],
            'has_changes' => false
        ];
        
        // Fields to track
        $trackedFields = [
            'name',
            'description',
            'part_number',
            'customer_part_number',
            'revision',
            'review_date',
            'revision_number',
            'revision_details',
            'revised_by',
            'product_type',
            'category'
        ];
        
        // Check field changes
        foreach ($trackedFields as $field) {
            $oldValue = $oldTemplate[$field] ?? '';
            $newValue = $newTemplate[$field] ?? '';
            
            if ($oldValue != $newValue) {
                $changes['fields_changed'][] = $field;
                $changes['field_changes'][$field] = [
                    'old' => $oldValue,
                    'new' => $newValue
                ];
                $changes['has_changes'] = true;
            }
        }
        
        // Check item changes
        $oldItems = $oldTemplate['items'] ?? [];
        $newItems = $newTemplate['items'] ?? [];
        
        // Create maps for comparison (by title + order_index for matching)
        $oldItemsMap = [];
        foreach ($oldItems as $item) {
            $key = $this->generateItemKey($item);
            $oldItemsMap[$key] = $item;
        }
        
        $newItemsMap = [];
        foreach ($newItems as $item) {
            $key = $this->generateItemKey($item);
            $newItemsMap[$key] = $item;
        }
        
        // Find added items
        foreach ($newItemsMap as $key => $newItem) {
            if (!isset($oldItemsMap[$key])) {
                $changes['items_added'][] = [
                    'title' => $newItem['title'],
                    'order_index' => $newItem['order_index'] ?? 0,
                    'description' => substr($newItem['description'] ?? '', 0, 100)
                ];
                $changes['has_changes'] = true;
            }
        }
        
        // Find removed items
        foreach ($oldItemsMap as $key => $oldItem) {
            if (!isset($newItemsMap[$key])) {
                $changes['items_removed'][] = [
                    'title' => $oldItem['title'],
                    'order_index' => $oldItem['order_index'] ?? 0
                ];
                $changes['has_changes'] = true;
            }
        }
        
        // Find modified items
        foreach ($newItemsMap as $key => $newItem) {
            if (isset($oldItemsMap[$key])) {
                $oldItem = $oldItemsMap[$key];
                $itemChanges = $this->compareItems($oldItem, $newItem);
                
                if (!empty($itemChanges)) {
                    $changes['items_modified'][] = [
                        'title' => $newItem['title'],
                        'order_index' => $newItem['order_index'] ?? 0,
                        'changes' => $itemChanges
                    ];
                    $changes['has_changes'] = true;
                }
            }
        }
        
        return $changes;
    }
    
    /**
     * Generate a unique key for item matching
     */
    private function generateItemKey($item) {
        // Use title + order_index as key (allows detecting position changes)
        $title = strtolower(trim($item['title'] ?? ''));
        $order = $item['order_index'] ?? 0;
        return "{$title}_{$order}";
    }
    
    /**
     * Compare two items and find differences
     */
    private function compareItems($oldItem, $newItem) {
        $itemChanges = [];
        
        $fieldsToCompare = ['title', 'description', 'is_required', 'sample_image_url'];
        
        foreach ($fieldsToCompare as $field) {
            $oldValue = $oldItem[$field] ?? '';
            $newValue = $newItem[$field] ?? '';
            
            if ($oldValue != $newValue) {
                $itemChanges[$field] = [
                    'old' => is_string($oldValue) ? substr($oldValue, 0, 100) : $oldValue,
                    'new' => is_string($newValue) ? substr($newValue, 0, 100) : $newValue
                ];
            }
        }
        
        return $itemChanges;
    }
    
    /**
     * Generate a human-readable change summary
     */
    public function generateSummary($changes) {
        $parts = [];
        
        if (!empty($changes['fields_changed'])) {
            $fieldCount = count($changes['fields_changed']);
            $fieldNames = implode(', ', array_slice($changes['fields_changed'], 0, 3));
            if ($fieldCount > 3) {
                $fieldNames .= ', +' . ($fieldCount - 3) . ' more';
            }
            $parts[] = "Updated fields: {$fieldNames}";
        }
        
        if (!empty($changes['items_added'])) {
            $count = count($changes['items_added']);
            $parts[] = "Added {$count} item(s)";
        }
        
        if (!empty($changes['items_removed'])) {
            $count = count($changes['items_removed']);
            $parts[] = "Removed {$count} item(s)";
        }
        
        if (!empty($changes['items_modified'])) {
            $count = count($changes['items_modified']);
            $parts[] = "Modified {$count} item(s)";
        }
        
        if (empty($parts)) {
            return "No changes detected";
        }
        
        return implode('; ', $parts);
    }
    
    /**
     * Log changes to database
     */
    public function logChange($templateId, $version, $changeType, $changes, $userId = null) {
        $summary = $this->generateSummary($changes);
        $changesJson = json_encode($changes);
        
        $sql = "INSERT INTO checklist_template_changes 
                (template_id, version, change_type, changed_by, change_summary, changes_json) 
                VALUES (?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            $templateId,
            $version,
            $changeType,
            $userId,
            $summary,
            $changesJson
        ]);
        
        return $this->conn->lastInsertId();
    }
    
    /**
     * Get change history for a template group
     */
    public function getChangeHistory($templateGroupId, $limit = 50) {
        $sql = "SELECT ctc.*, ct.name as template_name, ct.version
                FROM checklist_template_changes ctc
                INNER JOIN checklist_templates ct ON ctc.template_id = ct.id
                WHERE ct.template_group_id = ?
                ORDER BY ctc.created_at DESC
                LIMIT ?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$templateGroupId, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get changes for a specific version
     */
    public function getVersionChanges($templateId) {
        $sql = "SELECT * FROM checklist_template_changes 
                WHERE template_id = ?
                ORDER BY created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$templateId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
