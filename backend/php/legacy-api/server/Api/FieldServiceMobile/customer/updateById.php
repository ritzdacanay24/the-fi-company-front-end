<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'fs_company_det';

    $qry = dynamicUpdateV1($table, $_POST, $_GET['id']);
    
    $query = $db->prepare($qry);
    $query->execute();

    echo $db_connect->json_encode($qry);