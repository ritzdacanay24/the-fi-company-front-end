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

    if(ISSET($post['updateBoard'])){ 
        
        $array[] = array(
            "id" => $post['id']
            , "board_kind" => $post['board_kind'] 
            , "name" => $post['name'] 
            , "description" => $post['description'] 
            , "permission" => $post['permission'] 
            , "owner" => $post['owner'] 
            , "state" => $post['state'] 
            , "position" => $post['position'] 
            , "created_by" => $post['created_by'] 
            , "created_at" => $post['created_at'] 
            , "deleted" => $post['deleted'] 
            , "board_id" => $post['board_id'] 
            , "include_report" => $post['include_report'] 
            , "shareable" => $post['shareable'] 
            , "shareable_token" => $post['shareable_token']  
            , "todo_update_progress" => $post['todo_update_progress'] 
            
        );

        $results = $data->updateBoard($array);
    }
    
    echo $db_connect->json_encode($results);
    
} catch (PDOException $e) {
    die($e->getMessage());
}