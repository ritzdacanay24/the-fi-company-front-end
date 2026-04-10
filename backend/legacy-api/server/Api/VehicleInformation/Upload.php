<?php

include_once ROOT_PATH . '/library/upload.class.php';

$post = json_decode(file_get_contents('php://input'), true);

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as protection;

$protected = new protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$uploader = new Uploader($db);
$uploader->sessionId  = $userInfo->id;
$uploadFile = array(
    "field" => 'Vehicle Information',
    "uniqueId" => $_POST['uniqueData'],
    "location" => DOCUMENT_ROOT . '/attachments/vehicleInformation/',
    "mainId" => isset($_POST['mainId']) ? $_POST['mainId'] : null,
    "partNumber" => "",
    "fileBrowse" => "file"
);


$dataResults = $uploader->uploadFile($uploadFile);
echo $db_connect->json_encode($dataResults);
