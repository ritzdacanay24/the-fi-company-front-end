<?php
/**
 * Test Input Reading
 * Simple test to verify JSON input is being read correctly
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Read raw input
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

// Return detailed debug info
echo json_encode([
    'success' => true,
    'debug' => [
        'raw_input' => $rawInput,
        'decoded_data' => $data,
        'json_error' => json_last_error_msg(),
        'post_data' => $_POST,
        'request_method' => $_SERVER['REQUEST_METHOD'],
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
        'file_modified_time' => date('Y-m-d H:i:s', filemtime(__FILE__)),
        'timestamp' => date('Y-m-d H:i:s')
    ]
]);
