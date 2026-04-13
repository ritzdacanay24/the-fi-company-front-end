
<?php
include_once __DIR__ . '/graphics_item_master.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new GraphicsItemMaster($db);

if (isset($_GET['searchPartNumber'])) {
    $dataInfo = $data->searchPartNumber($_GET['searchPartNumber']);
}

echo $db_connect->json_encode($dataInfo);
