<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/purchase_orders_by_supplier.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new PoBySupplier($dbQad);

if (isset($_GET['ReadOverview'])) {
    $dataInfo = $data->ReadOverview($_GET);
}
if (isset($_GET['ReadDetails'])) {
    $dataInfo = $data->ReadDetails($_GET);
}
if (isset($_GET['ReadWeekly'])) {
    $dataInfo = $data->ReadWeekly($_GET['ReadWeekly'], $_GET['dateFrom'], $_GET['dateTo'], $_GET['typeOfView']);
}

if (isset($_GET['ReadDetailsWeekly'])) {
    $dataInfo = $data->ReadDetailsWeekly($_GET);
}

if (isset($_GET['purchaseOrderLoadDate'])) {
    $dataInfo = $data->purchaseOrderLoadDate($_GET);
}

if (isset($_GET['weeklySupplier'])) {
    $dataInfo = $data->tacapp($_GET['supplierName']);
}



echo $db_connect_qad->json_encode($dataInfo);
