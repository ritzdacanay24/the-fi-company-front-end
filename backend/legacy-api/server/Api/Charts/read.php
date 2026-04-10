<?php


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

use EyefiDb\Api\Charts\Charts;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new Charts($db, $dbQad);


if(ISSET($_GET['getDynamicData'])){
    $r = $data->getDynamicData($_GET['dateFrom'], $_GET['dateTo'],$_GET['typeOfView'],$_GET['showCustomers']);
}else{
    $r = $data->run();
}

echo json_encode($r);
