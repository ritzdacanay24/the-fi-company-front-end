<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\LateReasonCodes\LateReasonCodes;


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new LateReasonCodes($db);

$results = $data->getDynamicData($_GET['dateFrom'],$_GET['dateTo'], $_GET['typeOfView'], ISSET($_GET['displayCustomers']), $_GET['queue']);

echo $db_connect->json_encode($results);
