<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/qir_overall.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new QirOverall($db);

$dataInfo = $data->ReadAll($_GET['customerName'], $_GET['type'], $_GET['dateFrom'], $_GET['dateTo'], $_GET['partNumber']);

echo $db_connect->json_encode($dataInfo);
