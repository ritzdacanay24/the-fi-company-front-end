<?php
include_once ROOT_PATH . '/library/upload.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$post = json_decode(file_get_contents('php://input'), true);

$uploader   =   new Uploader($db);
$uploader->path = DOCUMENT_ROOT . '/attachments/fieldService/';
$uploader->sessionId = $userInfo->id;
$uploader->fileBrowse = 'file';
$uploader->field = 'Field Service';
$uploader->uniqueId = $post['id'];
$uploader->mainId = 0;
$uploader->fileName = $uploader->path . $post['fileName'];

$dataInfo = $uploader->delete();
echo $db_connect->json_encode($dataInfo);
