<?php

use EyefiDb\Databases\DatabaseEyefi as db;
use EyefiDb\Api\Receiving\Receiving;

$db_connect_qad = new db();
$dbQad = $db_connect_qad->getConnection();

$data = new Receiving($dbQad);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {


    $results = $data->insert($_POST);
    echo json_encode($results);
}else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {

    $post = json_decode(file_get_contents('php://input'), true);

    $results = $data->update($_GET['id'], $post);
    
    echo json_encode($results);
}else if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {


    if(ISSET($_GET['deleteAttachment'])){
        $results = $data->deleteAttachment($_GET['deleteAttachment']);
    }else{
        $results = $data->delete($_GET['id']);

        echo json_encode($results);
    }
    
}else if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    if(ISSET($_GET['getAttachment'])){
        $results = $data->getAttachment($_GET['getAttachment']);
    
        echo $db_connect_qad->json_encode($results);

    }else if(ISSET($_GET['id'])){
        $results = $data->getById($_GET['id']);
    
        echo $db_connect_qad->json_encode($results);

    }else{
        
    $results = $data->getOpenPo();

    echo $db_connect_qad->json_encode($results);
    }
    
}else{
    http_response_code(500);
    die('Unauthorized');
}

