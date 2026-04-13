<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once 'AgsSerialGenerator.php';
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;


$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$database = new DatabaseEyefi();
$db = $database->getConnection();

// Get POST data (JSON) - decode as associative array
$data = json_decode(file_get_contents("php://input"), true);

$agsSerial = new AgsSerialGenerator($db);
$agsSerial->user_full_name = $data['user_full_name'] ?? $_POST['user_full_name'] ?? 'System';

// Debug logging
error_log("=== AGS Bulk Create Debug ===");
error_log("Class: " . get_class($agsSerial));
error_log("Parent Class: " . get_parent_class($agsSerial));
error_log("File: " . (new ReflectionClass($agsSerial))->getFileName());

if (!empty($data['assignments']) && is_array($data['assignments'])) {
    try {
        $result = $agsSerial->bulkCreate($data['assignments']);
        
        http_response_code(200);
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to bulk create AGS serials. ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid data. assignments array is required.'
    ]);
}
