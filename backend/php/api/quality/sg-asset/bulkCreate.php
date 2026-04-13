<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once 'SgAssetGenerator.php';

$database = new Database();
$db = $database->getConnection();

// Get POST data (JSON)
$data = json_decode(file_get_contents("php://input"));

// Debug: Log received data
error_log("SG Bulk Create - Received user_full_name: " . ($data->user_full_name ?? 'NOT SET'));
error_log("SG Bulk Create - Assignments count: " . (is_array($data->assignments) ? count($data->assignments) : 0));
if (!empty($data->assignments) && is_array($data->assignments) && count($data->assignments) > 0) {
    error_log("SG Bulk Create - First assignment type: " . gettype($data->assignments[0]));
    error_log("SG Bulk Create - First assignment inspector_name: " . ($data->assignments[0]->inspector_name ?? 'NOT SET'));
    error_log("SG Bulk Create - First assignment consumed_by: " . ($data->assignments[0]->consumed_by ?? 'NOT SET'));
}

$sgAsset = new SgAssetGenerator($db);
$sgAsset->user_full_name = $data->user_full_name ?? $_POST['user_full_name'] ?? 'System';

error_log("SG Bulk Create - Set user_full_name to: " . $sgAsset->user_full_name);

if (!empty($data->assignments) && is_array($data->assignments)) {
    try {
        // Convert objects to associative arrays
        $assignmentsArray = array_map(function($item) {
            return (array) $item;
        }, $data->assignments);
        
        error_log("SG Bulk Create - After array conversion, first assignment inspector_name: " . ($assignmentsArray[0]['inspector_name'] ?? 'NOT SET'));
        
        $result = $sgAsset->bulkCreate($assignmentsArray);
        
        http_response_code(200);
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to bulk create SG assets. ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid data. assignments array is required.'
    ]);
}
