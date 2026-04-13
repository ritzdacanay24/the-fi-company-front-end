<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\supply_plan\SupplyPlan;
use EyefiDb\Config\Protection as Protection;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$dataInfo = array();

$data = new SupplyPlan($dbQad, $db);
$data->user_full_name = $userInfo->full_name;
$dataInfo = $data->save($_POST['details']);

echo $db_connect->json_encode($dataInfo);
