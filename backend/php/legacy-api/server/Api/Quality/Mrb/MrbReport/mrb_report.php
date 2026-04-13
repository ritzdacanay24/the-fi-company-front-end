<?php
include_once __DIR__ . '/mrb_report.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new MrbReport($db);

if (isset($_GET['readAll'])) {
	$dataInfo = $data->Read($_GET['startDate'], $_GET['endDate']);
}

if (isset($_GET['mrbId'])) {
	$dataInfo = $data->ReadId($_GET['mrbId']);
}

if (isset($_GET['getComments'])) {
	$dataInfo = $data->GetComments($_GET['getComments']);
}

echo $db_connect->json_encode($dataInfo);
