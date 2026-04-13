<?php

use EyefiDb\Api\SafetyStock\SafetyStock;

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new SafetyStock($db, $dbQad);

if (isset($_GET['ReadAll'])) {
    $dataInfo =  $data->ReadAll();
}
echo $db_connect_qad->json_encode($dataInfo);
