<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\auth\Authorization;

$userInfo = ( new EyefiDb\Config\Protection() )->getProtected()->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Authorization($db);
$data->sessionId = $userInfo->id;

if(!ISSET($_GET['pin'])){
    die('Invalid params');
}

$dataInfo = $data->verifyPinNumber($_GET['pin']);
echo $db_connect->json_encode($dataInfo);
