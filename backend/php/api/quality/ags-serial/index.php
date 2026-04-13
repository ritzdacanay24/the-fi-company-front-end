<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/database.php';
include_once 'AgsSerialGenerator.php';

$database = new Database();
$db = $database->getConnection();

$agsSerial = new AgsSerialGenerator($db);
$agsSerial->user_full_name = $_POST['user_full_name'] ?? 'System';

// Get the request method and route
$method = $_SERVER['REQUEST_METHOD'];
$request = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));

// Handle different HTTP methods
switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data)) {
            try {
                $result = $agsSerial->addNew((array)$data);
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'AGS serial created successfully.',
                    'data' => $result
                ]);
            } catch (Exception $e) {
                http_response_code(503);
                echo json_encode([
                    'success' => false,
                    'message' => 'Unable to create AGS serial. ' . $e->getMessage()
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Unable to create AGS serial. Data is incomplete.'
            ]);
        }
        break;
        
    case 'GET':
        if (isset($_GET['id'])) {
            $result = $agsSerial->getById($_GET['id']);
            http_response_code(200);
            echo json_encode($result);
        } else {
            $result = $agsSerial->readAll();
            http_response_code(200);
            echo json_encode($result);
        }
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data->id)) {
            try {
                $agsSerial->edit((array)$data);
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'AGS serial updated successfully.'
                ]);
            } catch (Exception $e) {
                http_response_code(503);
                echo json_encode([
                    'success' => false,
                    'message' => 'Unable to update AGS serial. ' . $e->getMessage()
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Unable to update AGS serial. Data is incomplete.'
            ]);
        }
        break;
        
    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data->id)) {
            try {
                $agsSerial->delete((array)$data);
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'AGS serial deleted successfully.'
                ]);
            } catch (Exception $e) {
                http_response_code(503);
                echo json_encode([
                    'success' => false,
                    'message' => 'Unable to delete AGS serial. ' . $e->getMessage()
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Unable to delete AGS serial. Data is incomplete.'
            ]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed.'
        ]);
        break;
}
