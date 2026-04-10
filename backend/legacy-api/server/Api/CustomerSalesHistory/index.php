<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\CustomerSalesHistory\CustomerSalesHistory;

$db_connect = new DatabaseQad();
$dbQad = $db_connect->getConnection();

$data = new CustomerSalesHistory($dbQad);
$dataInfo = $data->getData();

echo $db_connect->json_encode($dataInfo);
