<?php
use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Api\work_order_routing\WorkOrderRouting;

if (!isset($_GET['ReadSingle'])) {
    die();
    echo $data->ReadSingle($_GET['ReadSingle']);
}

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new WorkOrderRouting($dbQad, $db);

$data->nowDate = date("Y-m-d", time());
$data->todayDate = date("Y-m-d");

$partNumber = $_GET['ReadSingle'];
$dataInfo = $data->ReadSingle($partNumber);

echo $db_connect->json_encode($dataInfo);
