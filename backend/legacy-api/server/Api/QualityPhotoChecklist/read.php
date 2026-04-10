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

if(ISSET($_GET['partNumber'])){
    $dataInfo = $data->read($_GET['woNumber'], $_GET['partNumber'], $_GET['serialNumber'], $_GET['typeOfView']);
}
if(ISSET($_GET['getOpenChecklists'])){
    $dataInfo = $data->getOpenChecklists();
}

echo $db_connect_qad->json_encode($dataInfo);
