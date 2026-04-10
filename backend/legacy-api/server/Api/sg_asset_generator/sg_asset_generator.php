
<?php
require_once ROOT_DIR . 'config/functions.php';
require_once ROOT_DIR . 'config/error_handling.php';
include_once __DIR__ . '/sg_asset_generator.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new SgAssetGenerator($db);
$data->user_full_name = $userInfo->full_name;

if (isset($_GET['ReadAll'])) {
    $results = $data->ReadAll();
}else if (isset($_GET['getById'])) {
    $results = $data->getById($_GET['getById']);
}

echo $db_connect->json_encode($results);
