<?php

require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

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
        $pdo = $database->pdo;
        
        // Update checklist items table
        $stmt = $pdo->prepare("UPDATE checklist_items SET sample_image_url = NULL WHERE sample_image_url = ?");
        $stmt->execute([$image_url]);
        
        // Log the deletion
        $log_stmt = $pdo->prepare("
            INSERT INTO checklist_upload_log (template_id, item_id, filename, file_url, uploaded_at)
            SELECT template_id, id, ?, ?, NOW()
            FROM checklist_items 
            WHERE sample_image_url = ?
            LIMIT 1
        ");
        $log_stmt->execute(["DELETED_" . $filename, $image_url, $image_url]);
    }
    
    // Delete the physical file
    if (file_exists($file_path)) {
        if (unlink($file_path)) {
            echo json_encode([
                'success' => true,
                'message' => 'Image deleted successfully',
                'filename' => $filename
            ]);
        } else {
            throw new Exception('Failed to delete file from disk');
        }
    } else {
        // File doesn't exist, but we can still clean up database
        echo json_encode([
            'success' => true,
            'message' => 'Image reference removed (file not found on disk)',
            'filename' => $filename
        ]);
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
