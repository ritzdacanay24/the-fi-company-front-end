<?php
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;
use EyefiDb\Api\Tables\GridTables;

$protected = new Protection();
$userInfo = ( $protected->getProtected() )->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new GridTables($db);
$data->sessionId = $userInfo->id;
$data->path = $_GET['path'];

$dataInfo = $data->Read();

echo $db_connect->json_encode($dataInfo);
