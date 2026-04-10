<?php
include_once '../comments/Comments.php';

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$data = new Shortages($db);

if(!ISSET($_GET['dateFrom']) && !ISSET($_GET['dateTo'])){
    die('Incorrect params');
}

$connect_shortages = $data->getShortagesByDate($_GET['dateFrom'], $_GET['dateTo']);
$shortage_details = $connect_shortages->fetchAll(PDO::FETCH_ASSOC);

$connect_comments = new Comments($db);
$comments_info = $connect_comments->readMaxComments('Shortage Request');

$nowDate = date("Y-m-d H:i:s", time());
$dateNow = date("Y-m-d", time());

foreach ($shortage_details as &$row) {
    $row['COMMENTSCLASS'] = false;
    $row['COMMENTSMAX'] = '';
    foreach ($comments_info as $row1) {
        if ($row['id'] == $row1['orderNum']) {
            
            if ($row1['byDate'] == $dateNow) {
                $row['COMMENTSCLASS'] = "text-success";
            } else {
                $row['COMMENTSCLASS'] = "text-info";
            }

            $row['COMMENTSMAX'] = $row1['comments'];
        }
    }
}

echo $db_connect->json_encode($shortage_details);
