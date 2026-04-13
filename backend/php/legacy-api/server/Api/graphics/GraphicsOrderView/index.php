<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Config\Protection;
use EyefiDb\Api\Graphics\GraphicsOrderView\GraphicsOrderView;

$protected = new protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new GraphicsOrderView($db);
$data->sessionId = $userInfo->id;
$data->nowDate = date(" Y-m-d H:i:s", time());

if (isset($_GET['ReadAll'])) {
	$dataInfo =  $data->ReadAll();
	echo $db_connect->json_encode($dataInfo);
}

if (isset($_GET['coSearch'])) {
	$dataInfo = $data->ReadSingle($_GET['coSearch']);
	echo $db_connect->json_encode($dataInfo);
}
