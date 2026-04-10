<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\LateReasonCodes\LateReasonCodes;


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new LateReasonCodes($db);

$results = $data->getData(ISSET($_GET['department'])?$_GET['department']:"");

echo $db_connect->json_encode($results);
