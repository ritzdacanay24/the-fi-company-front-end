<?php
include_once ROOT_PATH . '/library/upload.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$uploader = new Uploader($db);
$uploader->sessionId  = $userInfo->id;
$mainId = isset($_POST['mainId']) ? $_POST['mainId'] : 0;
$uploadFile = array(
    "field" => 'Field Service',
    "uniqueId" => $_POST['uniqueData'],
    "location" => DOCUMENT_ROOT . '/attachments/fieldService/',
    "mainId" => $mainId,
    "partNumber" => "",
    "fileBrowse" => "file"
);

$dataResults = $uploader->uploadFile($uploadFile);
echo $db_connect->json_encode($dataResults);
