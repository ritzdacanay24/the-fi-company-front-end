<?php
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;
include_once  '../boards.class.php';

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Boards($db);
$data->sessionId = $userInfo->id;
$post = json_decode(file_get_contents('php://input'), true);

try {

    if(ISSET($post['createGroup'])){ 

        $grouparray = array(
            "board_id" => $post['board_id']
            , "title" => $post['group_title']
        );

        $createGroupData =  $data->createGroup($grouparray);

        $array = array();
        foreach($post['items_details'] as $row){
            $array[] = array(
                "name" => $row['name'] 
                , "board_id" => $post['board_id']
                , "group_id" => isset($row['group_id']) ?: $createGroupData['id']
            );
        }

        $results = $data->createItems($array);
        echo $db_connect->json_encode($results);
        
    }    
    
} catch (PDOException $e) {
    die($e->getMessage());
}
