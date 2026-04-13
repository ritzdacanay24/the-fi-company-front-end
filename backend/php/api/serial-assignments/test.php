<?php
/**
 * Test file to check if API is accessible
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

echo json_encode([
    'success' => true,
    'message' => 'Serial Assignments API is accessible',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>
