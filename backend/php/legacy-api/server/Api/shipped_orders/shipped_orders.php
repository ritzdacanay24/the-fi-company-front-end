<?php
include_once __DIR__ . '/shipped_orders.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new ShippedOrders($dbQad, $db);

$dataInfo = array();
if (isset($_GET['getGroupedOrders'])) {
	$dataInfo = $data->ReadOrderInfo($_GET['dateFrom'], $_GET['dateTo']);
}
if (isset($_GET['getNotInvoiced'])) {
	$dataInfo = $data->getNotInvoiced();
}


// if (isset($_GET['ReadItemDetailsWo'])) {
// 	$dataInfo = $data->ReadItemDetailsWo($_GET['ReadItemDetailsWo']);
// }

echo $db_connect_qad->json_encode($dataInfo);
