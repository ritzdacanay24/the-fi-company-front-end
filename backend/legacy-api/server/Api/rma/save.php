
<?php
include_once __DIR__ . '/rma.class.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Rma($db);
$data->sessionId = $userInfo->id;

$post = json_decode(file_get_contents('php://input'), true);


if (isset($_POST['typeOf']) && $_POST['typeOf'] == 1) {
    $dataInfo = $data->Edit($_POST);
}

if (isset($_POST['typeOf']) && $_POST['typeOf'] == 0) {
    $dataInfo = $data->Add($_POST);
}

if (isset($post['delete'])) {
    $dataInfo = $data->delete($post);
}

echo $db_connect->json_encode($dataInfo);
