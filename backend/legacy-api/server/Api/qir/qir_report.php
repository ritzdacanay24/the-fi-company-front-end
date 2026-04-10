<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/qir_report.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new QirReport($db);

$dataInfo = $data->getQirReport($_GET['dateFrom'], $_GET['dateTo']);


echo $db_connect->json_encode($dataInfo);
