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

try {
    // Validate required fields
    if (!isset($_POST['temp_id'])) {
        throw new Exception('Temporary ID is required');
    }

    $temp_id = sanitize_filename($_POST['temp_id']);
    
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
    
    // Create temporary upload directory if it doesn't exist
    $upload_dir = '../../../attachments/photoChecklist/temp/';
    if (!is_dir($upload_dir)) {
        if (!mkdir($upload_dir, 0755, true)) {
            throw new Exception('Failed to create upload directory');
        }
    }
    
    // Generate unique filename for temporary storage
    $file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $unique_filename = 'temp_' . $temp_id . '_' . uniqid() . '.' . $file_extension;
    $upload_path = $upload_dir . $unique_filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
        throw new Exception('Failed to move uploaded file');
    }
    
    // Generate the URL for the uploaded file
    $file_url = 'https://dashboard.eye-fi.com/attachments/photoChecklist/temp/' . $unique_filename;
    
    // Return success response
    echo json_encode([
        'success' => true,
        'url' => $file_url,
        'filename' => $unique_filename,
        'temp_id' => $temp_id,
        'file_size' => $file['size'],
        'message' => 'Temporary image uploaded successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage(),
        'success' => false
    ]);
}

/**
 * Sanitize filename to prevent directory traversal
 */
function sanitize_filename($filename) {
    // Remove any path separators and dangerous characters
    $filename = basename($filename);
    $filename = preg_replace('/[^a-zA-Z0-9_-]/', '', $filename);
    return $filename;
}
?>
