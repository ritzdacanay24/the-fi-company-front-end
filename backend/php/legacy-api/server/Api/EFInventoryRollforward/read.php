<?php

$db_connect_qad = new EyefiDb\Databases\DatabaseQad();
use EyefiDb\Api\EFInventoryRollforward\EFInventoryRollforward;

$dbQad = $db_connect_qad->getConnection();

$data = new EFInventoryRollforward($dbQad);

$dataInfo = $data->run();
echo json_encode($dataInfo);
