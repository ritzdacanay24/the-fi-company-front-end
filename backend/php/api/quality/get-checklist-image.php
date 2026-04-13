<?php
/**
 * Serve Checklist Images
 * Serves images from the protected uploads directory
 */

// Get the requested file path
$requestUri = $_SERVER['REQUEST_URI'];
$baseUrl = '/backend/uploads/checklist-images/';

// Extract filename from URL
if (strpos($requestUri, $baseUrl) === false) {
    http_response_code(404);
    exit('Not found');
}

$filename = basename($requestUri);
$filePath = __DIR__ . '/../../uploads/checklist-images/' . $filename;

// Security: Validate filename (no directory traversal)
if (!preg_match('/^checklist_img_[a-f0-9]+\.[a-z]+$/i', $filename)) {
    http_response_code(400);
    exit('Invalid filename');
}

// Check if file exists
if (!file_exists($filePath)) {
    http_response_code(404);
    exit('Image not found');
}

// Get file info
$fileInfo = getimagesize($filePath);
if (!$fileInfo) {
    http_response_code(400);
    exit('Invalid image file');
}

$mimeType = $fileInfo['mime'];

// Set caching headers (cache for 1 year since images are immutable)
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=31536000, immutable');
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');

// Output the file
readfile($filePath);
