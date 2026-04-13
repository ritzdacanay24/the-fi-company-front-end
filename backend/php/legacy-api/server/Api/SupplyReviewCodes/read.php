<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\SupplyReviewCodes\SupplyReviewCodes;


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new SupplyReviewCodes($db);

$results = $data->getData();

echo $db_connect->json_encode($results);
