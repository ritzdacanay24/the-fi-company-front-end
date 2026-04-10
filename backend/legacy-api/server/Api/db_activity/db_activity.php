<?php

$db_connect = new EyefiDb\Databases\DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connect_qad = new EyefiDb\Databases\DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$data = new EyefiDb\Api\db_activity\DbActivity($db, $dbQad);

if (isset($_GET['ReadOverview'])) {
    $dataInfo = $data->ReadOverview();
}
if (isset($_GET['Type'])) {
    $dataInfo = $data->Type($_GET['Type'], $_GET['dateFrom1'], $_GET['dateTo1']);
}
if (isset($_GET['dboverview'])) {
    $dataInfo = $data->dboverview();
}

$sdcsdc;
echo $db_connect->json_encode($dataInfo);
