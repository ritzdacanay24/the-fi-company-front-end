<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';

try {
    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['image_url'])) {
        throw new Exception('Image URL is required');
    }
    
    $image_url = $input['image_url'];
    
    // Extract filename from URL
    $url_parts = parse_url($image_url);
    $path_parts = pathinfo($url_parts['path']);
    $filename = $path_parts['basename'];
    
    // Determine if it's a temp file or permanent file
    $is_temp = strpos($filename, 'temp_') === 0;
    
    if ($is_temp) {
        // Handle temporary file deletion
        $file_path = '../../../attachments/photoChecklist/temp/' . $filename;
    } else {
        // Handle permanent file deletion
        $file_path = '../../../attachments/photoChecklist/' . $filename;
        
        // Also remove from database if it's a permanent file
        $pdo = getConnection();
        
        // First, try to delete from photo_submissions table (user uploaded photos)
        $stmt = $pdo->prepare("DELETE FROM photo_submissions WHERE file_url = ?");
        $deleted_rows = $stmt->execute([$image_url]);
        $submissions_deleted = $stmt->rowCount();
        
        // Also update checklist_items table (sample images)
        $stmt = $pdo->prepare("UPDATE checklist_items SET sample_image_url = NULL WHERE sample_image_url = ?");
        $stmt->execute([$image_url]);
        $items_updated = $stmt->rowCount();
        
        // Log the deletion
        $log_stmt = $pdo->prepare("
            INSERT INTO checklist_upload_log (template_id, item_id, filename, file_url, uploaded_at, action)
            VALUES (0, 0, ?, ?, NOW(), 'DELETED')
        ");
        $log_stmt->execute(["DELETED_" . $filename, $image_url]);
    }
    
    // Delete the physical file
    if (file_exists($file_path)) {
        if (unlink($file_path)) {
            $response = [
                'success' => true,
                'message' => 'Image deleted successfully',
                'filename' => $filename
            ];
            
            // Add database deletion info for permanent files
            if (!$is_temp) {
                $response['database_changes'] = [
                    'photo_submissions_deleted' => $submissions_deleted ?? 0,
                    'sample_images_updated' => $items_updated ?? 0
                ];
            }
            
            echo json_encode($response);
        } else {
            throw new Exception('Failed to delete file from disk');
        }
    } else {
        // File doesn't exist, but we can still clean up database
        $response = [
            'success' => true,
            'message' => 'Image reference removed (file not found on disk)',
            'filename' => $filename
        ];
        
        // Add database deletion info for permanent files
        if (!$is_temp) {
            $response['database_changes'] = [
                'photo_submissions_deleted' => $submissions_deleted ?? 0,
                'sample_images_updated' => $items_updated ?? 0
            ];
        }
        
        echo json_encode($response);
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        'success' => false
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage(),
        'success' => false
    ]);
}
?>
