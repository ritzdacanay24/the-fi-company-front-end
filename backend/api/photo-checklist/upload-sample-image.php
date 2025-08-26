<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';

try {
    // Validate required fields
    if (!isset($_POST['template_id']) || !isset($_POST['item_id'])) {
        throw new Exception('Template ID and Item ID are required');
    }

    $template_id = (int)$_POST['template_id'];
    $item_id = (int)$_POST['item_id'];
    
    // Validate file upload
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No file uploaded or upload error occurred');
    }

    $file = $_FILES['file'];
    
    // Validate file type
    $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $file_type = mime_content_type($file['tmp_name']);
    
    if (!in_array($file_type, $allowed_types)) {
        throw new Exception('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
    }
    
    // Validate file size (5MB max)
    $max_size = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $max_size) {
        throw new Exception('File size too large. Maximum size is 5MB');
    }
    
    // Create upload directory if it doesn't exist
    $upload_dir = '../../../attachments/photoChecklist/';
    if (!is_dir($upload_dir)) {
        if (!mkdir($upload_dir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }
    
    // Generate unique filename
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $unique_filename = 'template_' . $template_id . '_item_' . $item_id . '_' . uniqid() . '.' . $file_extension;
    $upload_path = $upload_dir . $unique_filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
        throw new Exception('Failed to move uploaded file');
    }
    
    // Generate the URL for the uploaded file
    $file_url = 'https://dashboard.eye-fi.com/attachments/photoChecklist/' . $unique_filename;
    
    // Update the database
    $pdo = getConnection();
    
    // First, verify the template and item exist
    $stmt = $pdo->prepare("
        SELECT ci.id, ct.name as template_name, ci.title as item_title
        FROM checklist_templates ct 
        JOIN checklist_items ci ON ct.id = ci.template_id 
        WHERE ct.id = ? AND ci.id = ?
    ");
    $stmt->execute([$template_id, $item_id]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$item) {
        // Clean up uploaded file if item doesn't exist
        unlink($upload_path);
        throw new Exception('Invalid template or item ID');
    }
    
    // Update the checklist item with the new sample image URL
    $stmt = $pdo->prepare("
        UPDATE checklist_items 
        SET sample_image_url = ?, updated_at = NOW() 
        WHERE id = ? AND template_id = ?
    ");
    $result = $stmt->execute([$file_url, $item_id, $template_id]);
    
    if (!$result) {
        // Clean up uploaded file if database update fails
        unlink($upload_path);
        throw new Exception('Failed to update database');
    }
    
    // Log the upload activity (optional)
    $log_stmt = $pdo->prepare("
        INSERT INTO checklist_upload_log (template_id, item_id, filename, file_url, uploaded_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $log_stmt->execute([$template_id, $item_id, $unique_filename, $file_url]);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'url' => $file_url,
        'filename' => $unique_filename,
        'template_id' => $template_id,
        'item_id' => $item_id,
        'item_title' => $item['item_title'],
        'template_name' => $item['template_name'],
        'message' => 'Image uploaded successfully'
    ]);
    
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
