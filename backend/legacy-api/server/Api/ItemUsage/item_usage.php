<?php
include_once __DIR__ . '/item_usage.class.php';

use EyefiDb\Databases\DatabaseQad as DatabaseQad;
use EyefiDb\Config\Protection as Protection;

$protected = new Protection();
$protectedResults = $protected->getProtected();
$userInfo = $protectedResults->data;

$db_connect_qad = new DatabaseQad();
$db = $db_connect_qad->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

if(ISSET($_GET['getInventoryValuation'])){

    $data = new ItemUsage($db);
    $dataInfo =  $data->getInventoryValuationNoIntAndNoJaxing($_GET['showAll']);
    //
}else{
    $data = new ItemUsage($db);
    $dataInfo =  $data->Read();

}
echo $db_connect_qad->json_encode($dataInfo);
