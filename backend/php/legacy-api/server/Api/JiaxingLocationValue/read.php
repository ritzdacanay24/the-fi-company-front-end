<?php
include_once __DIR__ . '/JiaxingLocationValue.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new JiaxingLocationValue($db);
$name = 'JX01';

if(ISSET($_GET['name'])){
    $name = $_GET['name'];
}

$dataInfo = $data->getData($name);

echo $db_connect_qad->json_encode($dataInfo);
