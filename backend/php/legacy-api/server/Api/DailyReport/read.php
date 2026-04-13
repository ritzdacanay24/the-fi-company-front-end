<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\DailyReport\DailyReport;


$domain = ISSET($_GET['domain']) ? $_GET['domain'] : 'EYE';

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$data = new DailyReport($db, $dbQad);
$data->domain = $domain;

$results = $data->run();


if (isset($_GET['insert']) && $_GET['insert'] == 1) {
    $data->insert($results);
}

if (isset($_GET['scheduledJob'])) {
    $data->scheduledJob();
}

// $jsonText = json_encode($results);
// echo Foo::jsonToDebug($jsonText);

echo $db_connect->json_encode($results);
