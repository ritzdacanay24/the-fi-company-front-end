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

if (isset($_GET['readById'])) {
    $dataInfo = $data->readById($_GET['readById']);
} else if (isset($_GET['readAll'])) {
    $dataInfo = $data->readAll();
}

echo $db_connect->json_encode($dataInfo);
