<?php

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Api\userTrans\UserTrans;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$userTransData = new UserTrans($db);
$data = $userTransData->getUserTransactionsByFieldName('Updated Owner', $_GET['so']);
$dataInfo = $data->fetchAll(PDO::FETCH_ASSOC);
echo $db_connect->json_encode($dataInfo);