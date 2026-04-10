<?php
include_once __DIR__ . '/rfq.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$data = new Rfq($db, $dbQad);
$data->userInfo = $userInfo;

$post = json_decode(file_get_contents('php://input'), true);

if(ISSET($post['SendFormEmail'])){
    $results = $data->SendFormEmail(
        $post['details']
        , ISSET($post['lineInfoEachShow']) ? $post['lineInfoEachShow'] : false
        , ISSET($post['palletSizeInformationSendInfo']) ? $post['palletSizeInformationSendInfo'] : array()
        , $post['salesOrder']
        , $post['customerSelected']
        , $post['details']['emailToSendTo']
    );
}

//var_dump($results);

echo $db_connect->json_encode($results);

