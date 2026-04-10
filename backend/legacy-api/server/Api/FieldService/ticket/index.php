<?php

use EyefiDb\Api\FieldService\Ticket\Ticket;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->exec("use eyefidb");

$data = new Ticket($db);

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') { 
    $post = json_decode(file_get_contents('php://input'), true);
}else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $post = json_decode(file_get_contents('php://input'), true);
    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $post = json_decode(file_get_contents('php://input'), true);
    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['getAll'])) $results = $data->getAssignments();
    echo json_encode($results);
} else {
    http_response_code(500);
    die('Unauthorized');
}
