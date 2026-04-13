<?php
include_once __DIR__ . '/mrb_request.class.php';

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

$data = new MrbRequest($db, $dbQad);
$data->sessionId = $userInfo->id;

if (isset($_GET['QirNumberSearch'])) {
	$dataInfo = $data->QirNumberSearch($_GET['QirNumberSearch']);
}else if (isset($_GET['id'])) {
	$dataInfo = $data->getMrbById($_GET['id']);
}

echo $db_connect_qad->json_encode($dataInfo);
