<?php

$db_connect = new EyefiDb\Databases\DatabaseEyefi();
$db = $db_connect->getConnection();
$db_connect_qad = new EyefiDb\Databases\DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new EyefiDb\Api\DataScrub\DataScrub($db, $dbQad);

if(ISSET($_GET['getCategory'])){
    $dataInfo = $data->getCategory();
}else{
    $dataInfo = $data->Query($_GET['type']);
}

echo $db_connect->json_encode($dataInfo);
