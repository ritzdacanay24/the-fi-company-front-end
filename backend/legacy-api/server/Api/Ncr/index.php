<?php

use EyefiDb\Api\Ncr\Ncr;
use EyefiDb\Databases\DatabaseEyefi;


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Ncr($db);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $post = json_decode(file_get_contents('php://input'), true);
    
    if (isset($_GET['validatePassword'])) {
        $results = $data->validatePassword($post);
    }else if (isset($_GET['validateToken'])) {
        $results = $data->validateToken($post);
    }else{
        $results = $data->insert($post);
    }
    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {

    $post = json_decode(file_get_contents('php://input'), true);

    $results = $data->update($_GET['id'], $post);
    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if(ISSET($_GET['deleteAttachment'])){
        $results = $data->deleteAttachment($_GET['deleteAttachment']);
    }else {
        $results = $data->deleteById($_GET['id']);
    }
    echo json_encode($results);
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    if(ISSET($_GET['getAttachment'])){
        $results = $data->getAttachment($_GET['getAttachment']);
    }else  if(ISSET($_GET['getFailureTypeChart'])){
        $results = $data->getFailureTypeChart();
    }else  if(ISSET($_GET['getFailureTypeCodes'])){
        $results = $data->getFailureTypeCodes();
    }else if (isset($_GET['id'])) {
        $results = $data->getById($_GET['id']);
    }else{
        $results = $data->getAll();
    }

    echo json_encode($results);
}else{
    http_response_code(500);
    die('Unauthorized');
}
