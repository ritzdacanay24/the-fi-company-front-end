<?php
include_once __DIR__ . '/graphics_search.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new GraphicsSearch($db);

if(ISSET($_GET['ReadAll'])){
	$dateFrom = isset($_GET['dateFrom']) ? $_GET['dateFrom'] : null;
	$dateTo = isset($_GET['dateTo']) ? $_GET['dateTo'] : null;
	$dataInfo = $data->ReadAll($dateFrom, $dateTo);
}

if(ISSET($_GET['coSearch'])){
	$dataInfo = $data->ReadSingle($_GET['coSearch']);
}

echo $db_connect->json_encode($dataInfo);
