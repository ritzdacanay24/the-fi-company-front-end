<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\work_order_view\WorkOrderInfo;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new WorkOrderInfo($db);
$dataInfo = $data->read($_GET['Details']);

echo $db_connect_qad->json_encode($dataInfo);
