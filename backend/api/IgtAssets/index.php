<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['REQUEST_URI'];

// Check if this is a request for igt_serial_numbers_crud
if (strpos($path, 'igt_serial_numbers_crud') !== false) {
    require_once 'igt_serial_numbers_crud.php';
    exit;
}

// Default response for unknown endpoints
http_response_code(404);
echo json_encode(['error' => 'API endpoint not found']);
?>
