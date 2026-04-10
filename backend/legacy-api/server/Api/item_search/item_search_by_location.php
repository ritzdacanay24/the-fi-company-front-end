<?php

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Api\item_search\ItemSearch;


$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();

$data = new ItemSearch($db, false);

$dataInfo = $data->getLocationByItem($_GET['location']);

echo $db_connect->json_encode($dataInfo);
