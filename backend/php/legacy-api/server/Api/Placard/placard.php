<?php
require_once __DIR__ . '/placard.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);




if (isset($_GET['ReadAll'])) {

	$data = new Placard($db, false);
	$data->order = $_GET['order'];
	$data->partNumber = $_GET['partNumber'];
	$data->line = $_GET['line'];

	$dataInfo = $data->ReadAll();
	echo $db_connect_qad->json_encode($dataInfo);
}
if (isset($_GET['searchSerialNumber'])) {

	$db_connect = new DatabaseEyefi();
	$dbEyeFi = $db_connect->getConnection();

	$data = new Placard($db, $dbEyeFi);

	$dataInfo = $data->searchSerialNumber($_GET['searchSerialNumber']);
	echo $db_connect_qad->json_encode($dataInfo);
}

if (isset($_GET['validateWo'])) {

	$db_connect = new DatabaseEyefi();
	$dbEyeFi = $db_connect->getConnection();

	$data = new Placard($db, $dbEyeFi);

	$dataInfo = $data->validateWo($_GET['validateWo']);
	echo $db_connect_qad->json_encode($dataInfo);
}


