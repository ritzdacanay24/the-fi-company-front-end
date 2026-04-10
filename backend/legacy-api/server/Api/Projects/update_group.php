<?php

use EyefiDb\Databases\DatabaseEyefi as Database;
use EyefiDb\Config\Protection as Protection;

include_once  '../boards.class.php';

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new Database();
$db = $db_connect->getConnection();

$data = new Boards($db);
$data->sessionId = $userInfo->id;
$post = json_decode(file_get_contents('php://input'), true);

try {

    if (isset($post['updateGroup'])) {

        $array[] = array(
            "board_id" => $post['board_id'], "title" => $post['group_title'], "position" => $post['group_position'], "deleted" => $post['group_deleted'], "color" => $post['group_color'], "archived" => $post['group_archived'], "group_id" => $post['group_id'], "id" => $post['group_id']
        );

        $results = $data->updateGroup($array);
    }

    echo $db_connect->json_encode($results);
} catch (PDOException $e) {
    die($e->getMessage());
}
