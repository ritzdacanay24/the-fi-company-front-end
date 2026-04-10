<?php
include_once __DIR__ . '/InventoryTags.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new InventoryTags(false, $db);
$data->nowDate = date("Y-m-d H:i:s", time());

$post = json_decode(file_get_contents('php://input'), true);

$dataInfo = $data->save($post['data'], $post['type']);

echo $db_connect->json_encode($dataInfo);
