<?php
include_once __DIR__ . '/order_tracker.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new OrderTracker($dbQad, $db);
if (isset($_GET['Read'])) {
    $dataInfo = $data->getOrderInfo($_GET['order']);
}
if (isset($_GET['getCustomerOrderNumbers'])) {
    $dataInfo = $data->getCustomerOrderNumbers($_GET['getCustomerOrderNumbers']);
}

echo $db_connect_qad->json_encode($dataInfo);
