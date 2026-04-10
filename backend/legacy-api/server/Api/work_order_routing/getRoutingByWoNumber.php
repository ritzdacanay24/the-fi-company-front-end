<?php
use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Api\work_order_routing\WorkOrderRouting;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new WorkOrderRouting($dbQad, $db);

$data->nowDate = date("Y-m-d", time());
$data->todayDate = date("Y-m-d");

$dataInfo = $data->getRoutingByWoNumber($_GET['wo_nbr']);

echo $db_connect->json_encode($dataInfo);
