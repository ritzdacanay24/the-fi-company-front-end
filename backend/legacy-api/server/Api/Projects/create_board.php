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

    if(ISSET($post['createBoard'])){ 
        
        $results = $data->createBoard(
            array(
                "board_kind" => $post['board_kind']
                , "name" => $post['name']
            )
        );

        echo $db_connect->json_encode($results);

    }      
    
} catch (PDOException $e) {
    die($e->getMessage());
}
