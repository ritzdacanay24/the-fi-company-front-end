<?php

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Api\item_search\ItemSearch;


$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new ItemSearch($dbQad, $db);

$typeOfItemSearch = 'partNumber';
if(ISSET($_GET['typeOfItemSearch'])){
    $typeOfItemSearch = $_GET['typeOfItemSearch'];
}

if(ISSET($_GET['readSingleRef'])){
    $dataInfo = $data->readSingleRef($_GET['readSingleRef']);
}else{
    $dataInfo = $data->readByItem($_GET['readSingle'], $typeOfItemSearch);
}

echo $db_connect->json_encode($dataInfo);
