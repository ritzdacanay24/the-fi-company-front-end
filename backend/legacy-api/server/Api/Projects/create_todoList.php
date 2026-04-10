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

    if(ISSET($_POST['toDoListAdd'])){ 
        
        $results = $data->toDoListAdd(
            array(
                "board_id" => $_POST['board_id']
                , "todoText" => $_POST['todoText']
                , "done" => $_POST['done']
                , "item_id" => $_POST['item_id']
            )
        );

    } 

    if(ISSET($_POST['toDoListUpdate'])){ 
        
        $results = $data->toDoListUpdate(
            array(
                "board_id" => $_POST['board_id']
                , "todoText" => $_POST['todoText']
                , "done" => $_POST['done']
                , "item_id" => $_POST['item_id']
                , "id" => $_POST['id']
            )
        );

    }      
    
    echo $db_connect->json_encode($results);
    
} catch (PDOException $e) {
    die($e->getMessage());
}