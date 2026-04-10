<?php

$db_connect = new EyefiDb\Databases\DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new EyefiDb\Api\DailyMeeting\DailyMeeting($db);

if (isset($_GET['readOverview'])) {
    $dataInfo = $data->readOverview();
}

$sdcsdc;
echo $db_connect->json_encode($dataInfo);
