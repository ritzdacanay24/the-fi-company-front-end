# Hard Delete Implementation Guide

## Overview
This document outlines the implementation of hard delete functionality for the Serial Number Manager system, complementing the existing soft delete system.

## Frontend Implementation ✅ COMPLETED

### Service Updates
- Added `hardDelete(id: number)` method to `SerialNumberService`
- Added `bulkHardDelete(ids: number[])` method for bulk operations
- Both methods include `hard=true` parameter to distinguish from soft delete

### Component Updates
- Added `hardDeleteSerial(id: string)` method with safety restrictions
- Added `bulkHardDelete()` method for bulk operations
- Implemented double confirmation for hard delete operations
- Added restrictions to prevent hard delete of used/reserved serial numbers

### UI Updates
- Replaced single delete buttons with dropdown menus
- Added distinct options for "Soft Delete" and "Permanent Delete"
- Added bulk delete dropdown with same options
- Added informational panel explaining deletion types
- Visual indicators to distinguish between deletion types

### Safety Features
1. **Double Confirmation**: Users must confirm twice for hard delete operations
2. **Status Restrictions**: Cannot hard delete used or reserved serial numbers
3. **Clear Warnings**: UI clearly indicates permanent nature of hard delete
4. **Fallback Protection**: If bulk operations fail, falls back to individual operations

## Backend Implementation 🚧 REQUIRED

### PHP API Updates Required

#### 1. Update Delete Endpoint
```php
// In backend/api/IgtAssets/igt_serial_numbers_crud.php

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = $_GET['id'] ?? null;
    $isHardDelete = isset($_GET['hard']) && $_GET['hard'] === 'true';
    
    if ($id) {
        if ($isHardDelete) {
            // Check if serial number can be hard deleted
            $stmt = $pdo->prepare("SELECT status FROM igt_serial_numbers WHERE id = ?");
            $stmt->execute([$id]);
            $serial = $stmt->fetch();
            
            if (!$serial) {
                http_response_code(404);
                echo json_encode(['error' => 'Serial number not found']);
                exit;
            }
            
            if ($serial['status'] === 'used' || $serial['status'] === 'reserved') {
                http_response_code(400);
                echo json_encode(['error' => 'Cannot hard delete used or reserved serial numbers']);
                exit;
            }
            
            // Perform hard delete
            $stmt = $pdo->prepare("DELETE FROM igt_serial_numbers WHERE id = ?");
            $success = $stmt->execute([$id]);
            
            if ($success) {
                echo json_encode(['message' => 'Serial number permanently deleted']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to delete serial number']);
            }
        } else {
            // Soft delete (existing functionality)
            $stmt = $pdo->prepare("UPDATE igt_serial_numbers SET is_active = '0' WHERE id = ?");
            $success = $stmt->execute([$id]);
            
            if ($success) {
                echo json_encode(['message' => 'Serial number soft deleted']);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to soft delete serial number']);
            }
        }
    }
}
```

#### 2. Update Bulk Delete Endpoint
```php
// Handle bulk operations
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && !isset($_GET['id'])) {
    $input = json_decode(file_get_contents('php://input'), true);
    $ids = $input['ids'] ?? [];
    $isHardDelete = isset($input['hard']) && $input['hard'] === true;
    
    if (empty($ids)) {
        http_response_code(400);
        echo json_encode(['error' => 'No IDs provided']);
        exit;
    }
    
    if ($isHardDelete) {
        // Check restrictions for all IDs
        $placeholders = str_repeat('?,', count($ids) - 1) . '?';
        $stmt = $pdo->prepare("SELECT id, status, serial_number FROM igt_serial_numbers WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        $serials = $stmt->fetchAll();
        
        $restricted = array_filter($serials, function($s) {
            return $s['status'] === 'used' || $s['status'] === 'reserved';
        });
        
        if (!empty($restricted)) {
            $restrictedNumbers = array_map(function($s) { return $s['serial_number']; }, $restricted);
            http_response_code(400);
            echo json_encode([
                'error' => 'Cannot hard delete used or reserved serial numbers',
                'restricted' => $restrictedNumbers
            ]);
            exit;
        }
        
        // Perform bulk hard delete
        $stmt = $pdo->prepare("DELETE FROM igt_serial_numbers WHERE id IN ($placeholders)");
        $success = $stmt->execute($ids);
        
        if ($success) {
            echo json_encode(['message' => count($ids) . ' serial numbers permanently deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete serial numbers']);
        }
    } else {
        // Bulk soft delete (existing functionality)
        $placeholders = str_repeat('?,', count($ids) - 1) . '?';
        $stmt = $pdo->prepare("UPDATE igt_serial_numbers SET is_active = '0' WHERE id IN ($placeholders)");
        $success = $stmt->execute($ids);
        
        if ($success) {
            echo json_encode(['message' => count($ids) . ' serial numbers soft deleted']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to soft delete serial numbers']);
        }
    }
}
```

## Business Rules

### When to Use Soft Delete (Recommended)
- Default option for all deletions
- Maintains audit trail
- Allows recovery if needed
- Preserves data relationships

### When to Use Hard Delete (Use with Caution)
- Removing test data during development
- Cleaning up truly invalid entries
- Compliance requirements for data removal
- Performance optimization (after careful analysis)

### Restrictions
- Cannot hard delete serial numbers with status 'used' or 'reserved'
- Requires double confirmation from user
- Should be logged for audit purposes
- Consider adding administrative approval requirement

## Testing Checklist

### Frontend Testing
- [ ] Soft delete individual serial numbers
- [ ] Hard delete individual serial numbers (available status only)
- [ ] Verify restrictions prevent hard delete of used/reserved serials
- [ ] Test bulk soft delete
- [ ] Test bulk hard delete
- [ ] Verify double confirmation dialogs
- [ ] Test dropdown UI functionality

### Backend Testing
- [ ] Test hard delete API endpoint
- [ ] Test bulk hard delete API endpoint
- [ ] Verify status restrictions are enforced
- [ ] Test error handling for invalid operations
- [ ] Verify database records are actually removed (hard delete)
- [ ] Verify database records are marked inactive (soft delete)

## Security Considerations
1. **Access Control**: Ensure only authorized users can perform hard deletes
2. **Audit Logging**: Log all hard delete operations for compliance
3. **Backup Strategy**: Ensure backups exist before allowing hard deletes
4. **Rate Limiting**: Consider implementing rate limits for bulk operations

## Performance Considerations
1. **Batch Operations**: Use transactions for bulk operations
2. **Index Impact**: Hard deletes may affect database indexes
3. **Foreign Key Constraints**: Ensure no orphaned references

## Rollback Strategy
If issues arise with hard delete functionality:
1. Disable hard delete options in UI (comment out dropdown options)
2. Keep soft delete functionality intact
3. Review any permanently deleted data that may need restoration from backups
