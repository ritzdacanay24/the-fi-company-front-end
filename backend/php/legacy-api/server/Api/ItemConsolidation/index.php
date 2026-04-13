<?php
use EyefiDb\Api\ItemConsolidation\ItemConsolidation;

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyeFi;

$domain = ISSET($_GET['domain']) ? $_GET['domain'] : 'EYE';


$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$db_connect = new DatabaseEyeFi();
$db = $db_connect->getConnection();

$data = new ItemConsolidation($dbQad, $db);
$data->domain = $domain;
$data->nowDate = date("Y-m-d H:i:s", time());

$dataInfo = $data->Run();

echo $db_connect_qad->json_encode($dataInfo);
