	
<?php
include_once __DIR__ . '/mrb_report.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new MrbReport($db);
$data->sessionId = $userInfo->id;

if (isset($_POST['saveComments'])) {
	$dataInfo = $data->Save($_POST);
}

echo $db_connect->json_encode($dataInfo);
