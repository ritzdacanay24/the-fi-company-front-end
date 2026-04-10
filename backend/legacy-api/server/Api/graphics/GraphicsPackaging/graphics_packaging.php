<?php
include_once __DIR__ . '/graphics_packaging.class.php';

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

$data = new GraphicsPackaging($db, $dbQad);
$data->sessionId = $userInfo->id;

if(isset($_GET['readAll'])){
	$results = $data->ReadAll();
}

echo $db_connect->json_encode($results);
