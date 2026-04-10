<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;
use EyefiDb\Api\qad_tables\QadTableSql;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new QadTableSql($db);
$data->sessionId = $userInfo->id;

if (isset($_POST['saveTable'])) {
    $results = $data->SaveTable($_POST['id'], $_POST['status1'], $_POST['status2']);
}
if (isset($_POST['SaveQuery'])) {
    $results = $data->SaveQuery($_POST['SaveQuery']);
}

echo $db_connect->json_encode($results);
