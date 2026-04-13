<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Config\Protection;
use EyefiDb\Api\Graphics\GraphicsWorkOrderSearch\GraphicsWorkOrderSearch;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new GraphicsWorkOrderSearch($db, $dbQad);

$data->nowDate = date("Y-m-d H:i:s", time());
$data->nowDateToday = date("Y-m-d", time());
$data->sessionId = $userInfo->id;

if (isset($_GET['graphicsWoNumber'])) {
    $graphicsWoNumber = $_GET['graphicsWoNumber'];
    $dataInfo = $data->GetWorkOrderInformation($graphicsWoNumber);
    echo $db_connect->json_encode($dataInfo);
}
