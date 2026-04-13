<?php
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;
include_once __DIR__ . '/boards.class.php';

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Boards($db);
$data->sessionId = $userInfo->id;

if(ISSET($_GET['Projects'])){ 
	$results = $data->getBoards();
}

if(ISSET($_GET['GetBoardById'])){ 
	$results = $data->getBoardById($_GET['GetBoardById']);
}

if(ISSET($_GET['getGroups'])){ 
	$results = $data->getGroups($_GET['getGroups']);
}

if(ISSET($_GET['subscribers'])){ 
	$results = $data->subscribers($_GET['subscribers']);
}

if(ISSET($_GET['getActivity'])){ 
	$results = $data->getActivity($_GET['getActivity'], ISSET($_GET['id']) ? $_GET['id'] : null);
}

if(ISSET($_GET['getComments'])){ 
	$results = $data->getComments($_GET['board_id'], $_GET['id']);
}

if(ISSET($_GET['shareable'])){ 
	$results = $data->shareable($_GET['token']);
}

if(ISSET($_GET['getToDoList'])){ 
	$results = $data->getTodoList($_GET['board_id'], $_GET['item_id']);
}

echo $db_connect->json_encode($results);