<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\supply_plan\SupplyPlan;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$dataInfo = array();

$data = new SupplyPlan($dbQad, $db);
$dataInfo = $data->run();

echo $db_connect->json_encode($dataInfo);
