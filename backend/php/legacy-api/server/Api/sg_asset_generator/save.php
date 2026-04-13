<?php
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

$post = json_decode(file_get_contents('php://input'), true);

$allowedUsersToEdit = array(
    'Michael Saquilayan', 'Khaled Alafeef'
);

if (isset($_POST['type']) && $_POST['type'] == 'Add') {
    $results = $data->AddNew($_POST);
}

if (isset($_POST['type']) && $_POST['type'] == 'Edit') {

    if (!in_array($data->user_full_name, $allowedUsersToEdit)) {
        trigger_error("Not allowed to modify.", E_USER_ERROR);
    }

    $results = $data->Edit($_POST);
}

if ($post['delete']) {
    $results = $data->delete($post);
}

echo $db_connect->json_encode($results);
