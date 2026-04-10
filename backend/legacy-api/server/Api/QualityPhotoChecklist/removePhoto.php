<?php
include_once __DIR__ . '/QualityPhotoChecklist.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new QualityPhotoChecklist($db, $dbQad);

$dataInfo = array();
$post = json_decode(file_get_contents('php://input'), true);

try {

    $post['fileName'] = DOCUMENT_ROOT.$post['fileName'];
    $dataResults = $data->removePhoto($post);
    echo json_encode($dataResults);
}

catch(Exception $e) {
    echo 'Message: ' .$e->getMessage();
}


