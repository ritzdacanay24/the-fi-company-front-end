<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;
use EyefiDb\Api\VehicleInformation\VehicleInformation;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new VehicleInformation($db);
$data->nowDate = date("Y-m-d H:i:s", time());

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new VehicleInformation($db);
$data->nowDate = date("Y-m-d H:i:s", time());

if ($_SERVER['REQUEST_METHOD'] === "DELETE") {
    $dataInfo = $data->delete($_GET['id']);
    echo $db_connect->json_encode($dataInfo);
} else {
    http_response_code(500);
    echo 'Invalid Request';
    die();
}
