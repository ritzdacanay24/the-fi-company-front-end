<?php

use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;
use EyefiDb\Api\qad_tables\QadTables;
use EyefiDb\Api\qad_tables\QadTableSql;

$protected = new Protection();
$userInfo = ( $protected->getProtected() )->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);



if (isset($_GET['test'])) {
    $data = new QadTables($dbQad);
    $results =  $data->Test($_GET['test']);
}

if (isset($_GET['test1'])) {
    $data = new QadTableSql($db);
    $data->sessionId = $userInfo->id;
    $results =  $data->Read();
}

$_POST = json_decode(file_get_contents("php://input"), true);

if (isset($_POST)) {
    $data = new QadTables($dbQad);
    $results =  $data->Query($_POST);
}

echo json_encode($results);