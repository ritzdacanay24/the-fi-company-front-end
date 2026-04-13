<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\auth\Authorization;

$userInfo = ( new EyefiDb\Config\Protection() )->getProtected()->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Authorization($db);
$data->sessionId = $userInfo->id;

if(!ISSET($_GET['pathName'])){
    die('Invalid params');
}

$dataInfo = $data->log($_GET['pathName']);
echo $db_connect->json_encode($dataInfo);
