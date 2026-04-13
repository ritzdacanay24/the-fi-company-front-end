<?php

include_once __DIR__ . '/user_profile.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new UserAccount($db);
$data->sessionId = $userInfo->id;
$data->email = $userInfo->email;
$data->update($_POST);