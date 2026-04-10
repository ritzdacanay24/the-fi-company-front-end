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

    if(ISSET($post['addItem'])){ 
        $array = array();
        foreach($post['details'] as $row){
            $array[] = array(
                "name" => $row['name'] 
                , "board_id" => $row['board_id'] 
                , "group_id" => $row['group_id']
                , "seq" => 0
            );
        }

        $results = $data->createItems($array);
    }

    if(ISSET($post['duplicateItems'])){
        $results = $data->createItems($post['details']);
    }
    
    echo $db_connect->json_encode($results);
    
} catch (PDOException $e) {
    die($e->getMessage());
}
    