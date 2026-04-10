<?php
include_once __DIR__ . '/revenue.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new RevenueReport($db);

if (isset($_GET['getFutureRevenueByCustomerByWeekly'])) {
    $dataInfo = $data->getFutureRevenueByCustomerByWeekly($_GET['start'], $_GET['end'], $_GET['weekStart'], $_GET['weekEnd'], ISSET($_GET['applyAgsDiscount']) ? true:false);
} else {
    $dataInfo = $data->getFutureRevenueByCustomer(ISSET($_GET['applyAgsDiscount']) ? true:false );
}


echo $db_connect_qad->json_encode($dataInfo);
