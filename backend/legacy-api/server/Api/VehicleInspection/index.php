<?php

use EyefiDb\Api\VehicleInspection\VehicleInspection;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new VehicleInspection($db);
$data->nowDate = date("Y-m-d H:i:s", time());

if (isset($_GET['getAll'])) {
    $results = $data->getAll();
}

if (isset($_GET['searchById'])) {
    $results = $data->searchById($_GET['searchById']);
    echo $db_connect->json_encode($results);
}else if (isset($_GET['getDetaliById'])) {
    $results = $data->getDetaliById($_GET['getDetaliById']);
    echo $db_connect->json_encode($results);
}else if (isset($_GET['saveDetailById'])) {
    $post = json_decode(file_get_contents('php://input'), true);
    
    $results = $data->saveDetailById($_GET['saveDetailById'], $post);
        echo $db_connect->json_encode($results);

}else{
    $post = json_decode(file_get_contents('php://input'), true);
    
        if (isset($post['create'])) {
            $results = $data->create($post);
        }
        echo $db_connect->json_encode($results);

}