<?php

require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
require_once 'igt.php';

// Database connection
$db = $database;

$igt = new Igt($db);

// Simple routing
$method = $_SERVER['REQUEST_METHOD'];
switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            echo json_encode($igt->read($_GET['id']));
        } else {
            echo json_encode($igt->readAll());
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        echo json_encode(['success' => $igt->create($data)]);
        break;
    case 'PUT':
        parse_str(file_get_contents("php://input"), $data);
        $id = $data['id'];
        echo json_encode(['success' => $igt->update($id, $data)]);
        break;
    case 'DELETE':
        parse_str(file_get_contents("php://input"), $data);
        $id = $data['id'];
        echo json_encode(['success' => $igt->delete($id)]);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
}
?>
