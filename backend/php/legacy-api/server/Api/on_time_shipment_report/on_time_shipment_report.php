<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/on_time_shipment_report.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new OnTimeShipmentReport($dbQad, $db);

$dataInfo;
if (isset($_GET['ReadOverview'])) {
	$dataInfo = $data->ReadOverview($_GET);
}
if(ISSET($_GET['ReadDetails'])){
	$dataInfo = $data->ReadDetails($_GET['ReadDetails']);
}

if(ISSET($_GET['overall'])){
	$dataInfo = $data->overall($_GET['dateFrom'], $_GET['dateTo']);
}
if(ISSET($_GET['byCustomer'])){
	$dataInfo = $data->byCustomer($_GET['dateFrom'], $_GET['dateTo'], $_GET['customer']);
}
if(ISSET($_GET['byProduct'])){
	$dataInfo = $data->byProduct($_GET['dateFrom'], $_GET['dateTo'], $_GET['customer']);
}

echo $db_connect_qad->json_encode($dataInfo);
