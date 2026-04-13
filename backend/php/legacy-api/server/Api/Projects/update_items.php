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

    if(ISSET($post['updateItems'])){ 
        $array = array();

        foreach($post['details'] as $row){
            $array[] = array(
                "id" => $row['id']
                , "board_id" => $row['board_id']
                , "group_id" => $row['group_id']
                , "name" => $row['name'] 
                , "state" => $row['state'] 
                , "owner" => $row['owner'] 
                , "priority" => $row['priority'] 
                , "due_date" => $row['due_date'] 
                , "status" => $row['status']  
                , "deleted" => $row['deleted'] 
                , "start_date" => $row['start_date'] 
                , "percent_complete" => $row['percent_complete'] 
                , "to_do_auto_progress" => $row['to_do_auto_progress']
                , "linked_board_id" => $row['linked_board_id'] 
                , "seq" => $row['seq']
                , "requestor" => $row['requestor']
                , "comments" => $row['comments']
            );
        }

        $results = $data->updateItems($array);
        
    }
    
    echo $db_connect->json_encode($results);
    
} catch (PDOException $e) {
    die($e->getMessage());
}
