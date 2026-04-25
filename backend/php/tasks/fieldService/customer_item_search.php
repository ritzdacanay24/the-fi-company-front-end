<?php

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Api\item_search\ItemSearch;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new ItemSearch($dbQad, $db);

if(ISSET($_GET['q'])){
    $dataInfo = $data->customerItemSearchQ($_GET['q']);
}

echo $db_connect->json_encode($dataInfo);
