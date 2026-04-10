<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Api\drop_locations\DropLocations;

$domain = ISSET($_GET['domain']) ? $_GET['domain'] : 'EYE';

$db_connect = new DatabaseQad();
$dbQad = $db_connect->getConnection();

$data = new DropLocations($dbQad);
$data->domain = $domain;

$dataInfo = $data->getDropLocations();
$results = $dataInfo->fetchAll(PDO::FETCH_ASSOC);

echo $db_connect->json_encode($results);
