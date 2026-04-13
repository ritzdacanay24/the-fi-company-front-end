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

try {

    if(ISSET($_POST['createComments'])){ 
        
        $results = $data->createComments(
            array(
                "board_id" => $_POST['board_id']
                , "unique_id" => $_POST['unique_id']
                , "comments" => $_POST['comments']
                , "type" => 'Projects'
            )
        );

        echo $db_connect->json_encode($results);

    }      
    
} catch (PDOException $e) {
    die($e->getMessage());
}
