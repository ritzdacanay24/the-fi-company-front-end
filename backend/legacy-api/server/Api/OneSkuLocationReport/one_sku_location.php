<?php
include_once __DIR__ . '/one_sku_location.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyeFi;

$domain = ISSET($_GET['domain']) ? $_GET['domain'] : 'EYE';

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$db_connect_eyefi = new DatabaseEyeFi();
$dbEyeFi = $db_connect_eyefi->getConnection();

$data = new OneSkuLocations($dbQad, $dbEyeFi);
$data->domain = $domain;
$data->nowDate = date("Y-m-d H:i:s", time());

$postData = json_decode(file_get_contents('php://input'), true);

if (isset($_GET['ReadAll'])) {
	$dataInfo = $data->Run();
}

if (isset($postData['save'])) {
	$dataInfo = $data->save($postData);
}

echo $db_connect_qad->json_encode($dataInfo);
