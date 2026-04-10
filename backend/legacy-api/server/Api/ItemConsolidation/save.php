<?php
use EyefiDb\Api\ItemConsolidation\ItemConsolidation;

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyeFi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$db_connect = new DatabaseEyeFi();
$db = $db_connect->getConnection();

$data = new ItemConsolidation($dbQad, $db);
$data->nowDate = date("Y-m-d H:i:s", time());
$post = json_decode(file_get_contents('php://input'), true);

if (isset($post['save'])) {
	$dataInfo = $data->save($post);
}

echo $db_connect_qad->json_encode($dataInfo);
