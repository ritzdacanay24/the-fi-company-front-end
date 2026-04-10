<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\sales_order_search\SalesOrder;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new SalesOrder($dbQad, $db);

$data->nowDate = date(" Y-m-d H:i:s", time());


if (isset($_GET['order'])) {
    $dataInfo = $data->Read($_GET['order']);
}

if (isset($_GET['getCustomerOrderNumbers'])) {
    $dataInfo = $data->getCustomerOrderNumbers($_GET['getCustomerOrderNumbers']);
}

if (isset($_GET['getTransactions'])) {
    $dataInfo = $data->getTransactions($_GET['getTransactions']);
}

echo $db_connect->json_encode($dataInfo);
