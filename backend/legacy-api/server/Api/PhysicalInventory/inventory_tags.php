<?php
include_once __DIR__ . '/InventoryTags.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();

$db_connect_eyefi = new DatabaseEyefi();
$dbEyefi = $db_connect_eyefi->getConnection();

$data = new InventoryTags($db, $dbEyefi);
$data->nowDate = date("Y-m-d H:i:s", time());

$dataInfo = $data->read();

echo json_encode($dataInfo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_ERROR_UTF8 | JSON_INVALID_UTF8_SUBSTITUTE);

