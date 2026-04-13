<?php

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;
use EyefiDb\Api\qir\Qir;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Qir($db);
$data->sessionId = $userInfo->id;

$dataInfo = $data->ReadSingle($_GET['id']);

echo $db_connect->json_encode($dataInfo);
