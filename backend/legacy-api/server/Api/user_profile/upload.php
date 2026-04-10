<?php

include_once ROOT_PATH . '/library/upload_image.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$uploader = new UploadImage($db);
$uploader->sessionId  = $userInfo->id;

$dataResults = $uploader->UploadImage();
echo $db_connect->json_encode($dataResults);
