<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/shortages_request.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new ShortageRequest($db, $dbQad);
$data->sessionId = $userInfo->id;

if (isset($_POST['detailsFound'])) {
    $results = $data->SaveMain($_POST, $_POST['detailsFound']);
}

if (isset($_POST['SupplyCompleted'])) {
    $results = $data->SupplyCompleted($_POST);
}

if (isset($_POST['DeliveredCompleted'])) {
    $results = $data->DeliveredCompleted($_POST);
}

if (isset($_POST['ReceivingCompleted'])) {
    $results = $data->ReceivingCompleted($_POST);
}

if (isset($_POST['SaveCellUpdate'])) {
    $results = $data->SaveCellUpdate($_POST['data'], $_POST['column']);
}

echo $db_connect->json_encode($results);
