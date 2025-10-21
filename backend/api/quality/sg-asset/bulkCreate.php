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

$sgAsset = new SgAssetGenerator($db);
$sgAsset->user_full_name = $data->user_full_name ?? $_POST['user_full_name'] ?? 'System';

if (!empty($data->assignments) && is_array($data->assignments)) {
    try {
        $result = $sgAsset->bulkCreate($data->assignments);
        
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
