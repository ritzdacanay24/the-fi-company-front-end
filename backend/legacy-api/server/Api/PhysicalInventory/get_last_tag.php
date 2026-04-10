<?php
include_once __DIR__ . '/InventoryTags.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();

$data = new InventoryTags($db, false);
$data->nowDate = date("Y-m-d H:i:s", time());

$dataInfo = $data->printBlankTags();

echo $db_connect->json_encode($dataInfo);
