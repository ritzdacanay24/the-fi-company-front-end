<?php
include_once __DIR__ . '/AgsSerialGenerator.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new AgsSerialGenerator($db);
$data->user_full_name = $userInfo->full_name;

$post = json_decode(file_get_contents('php://input'), true);

$allowedUsersToEdit = array(
    'Michael Saquilayan', 'Khaled Alafeef'
);

if (isset($post['type']) && $post['type'] == 'Add') {
    $results = $data->AddNew($post);
}

if (isset($post['type']) && $post['type'] == 'Edit') {

    if (!in_array($data->user_full_name, $allowedUsersToEdit)) {
        trigger_error("Not allowed to modify.", E_USER_ERROR);
    }

    $results = $data->Edit($post);
}

if ($post['delete']) {
    $results = $data->delete($post);
}

echo $db_connect->json_encode($results);
