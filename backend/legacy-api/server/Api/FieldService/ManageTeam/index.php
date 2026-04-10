<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: *');

use EyefiDb\Api\FieldService\ManageTeam\ManageTeam;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->exec("use db");

$data = new ManageTeam($db);

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') { 
    $post = json_decode(file_get_contents('php://input'), true);
    $results = $data->delete($post['id']);

}else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $post = json_decode(file_get_contents('php://input'), true);
    $results = $data->create($post);

    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    
    $post = json_decode(file_get_contents('php://input'), true);
    if (isset($_GET['id'])) $results = $data->update($_GET['id'], $post);

    echo json_encode($results);

} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    if (isset($_GET['getAll'])) $results = $data->getAll();
    if (isset($_GET['id'])) $results = $data->getById($_GET['id']);
    
    echo $db_connect->json_encode($results);

} else {
    http_response_code(500);
    die('Unauthorized');
}
