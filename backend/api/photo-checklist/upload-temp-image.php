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
    
    // Determine file type and validate
    $file_type = mime_content_type($file['tmp_name']);

    // Default allowed MIME types for images and videos
    $allowed_image_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $allowed_video_types = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-matroska'];

    $is_image = in_array($file_type, $allowed_image_types);
    $is_video = in_array($file_type, $allowed_video_types);

    if (!($is_image || $is_video)) {
        throw new Exception('Invalid file type. Allowed image types: JPEG, PNG, GIF, WebP; allowed video types: MP4, WebM, QuickTime, Ogg, MKV');
    }

    // Max upload size logic: defaults can be overridden by POST param `max_upload_size_mb`
    $disable_max_check = false;
    if (isset($_POST['disable_max_upload_limit'])) {
        $v = $_POST['disable_max_upload_limit'];
        if ($v === '1' || strtolower($v) === 'true') {
            $disable_max_check = true;
        }
    }

    // Default size limits
    $default_image_max = 5 * 1024 * 1024; // 5MB
    $default_video_max = 50 * 1024 * 1024; // 50MB

    // If caller provided a max_upload_size_mb, use it (applies to both images/videos)
    // $override_max_bytes = null;
    // if (isset($_POST['max_upload_size_mb']) && is_numeric($_POST['max_upload_size_mb'])) {
    //     $override_max_bytes = (int)$_POST['max_upload_size_mb'] * 1024 * 1024;
    // }

    // if (!$disable_max_check) {
    //     $max_size = $override_max_bytes ?? ($is_image ? $default_image_max : $default_video_max);
    //     if ($file['size'] > $max_size) {
    //         throw new Exception('File size too large. Maximum size is ' . round($max_size / (1024 * 1024), 2) . ' MB');
    //     }
    // }
    
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
    
    // Prepare success payload
    $response = [
        'success' => true,
        'url' => $file_url,
        'filename' => $unique_filename,
        'temp_id' => $temp_id,
        'file_size' => $file['size'],
        'file_type' => $file_type,
        'message' => 'Temporary file uploaded successfully'
    ];

    // If this is a video and a max duration was supplied, try to validate duration using ffprobe (optional)
    if ($is_video && isset($_POST['max_video_duration_seconds']) && is_numeric($_POST['max_video_duration_seconds'])) {
        $max_duration = (float)$_POST['max_video_duration_seconds'];
        // Try to run ffprobe if available to get the actual duration
        $ffprobe_path = trim(shell_exec('which ffprobe'));
        if ($ffprobe_path) {
            // Build ffprobe command to extract duration in seconds
            $cmd = escapeshellcmd($ffprobe_path) . " -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($upload_path);
            $duration_out = trim(shell_exec($cmd));
            if (is_numeric($duration_out)) {
                $duration_seconds = (float)$duration_out;
                $response['duration_seconds'] = $duration_seconds;
                if ($duration_seconds > $max_duration) {
                    // Cleanup uploaded file
                    @unlink($upload_path);
                    throw new Exception('Video duration exceeds maximum allowed duration of ' . $max_duration . ' seconds');
                }
            } else {
                // ffprobe couldn't determine duration - include a notice but don't fail
                $response['duration_checked'] = false;
                $response['duration_message'] = 'Could not determine video duration (ffprobe output empty)';
            }
        } else {
            // ffprobe not available - indicate that duration couldn't be validated server-side
            $response['duration_checked'] = false;
            $response['duration_message'] = 'ffprobe not available on server; cannot validate video duration';
        }
    }

    // Return success response
    echo json_encode($response);
    
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
