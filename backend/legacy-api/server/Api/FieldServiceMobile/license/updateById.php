<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'fs_license_property';

    $_POST['property_phone'] = ISSET($_POST['property_phone']) ? implode(',', $_POST['property_phone']) : null;

    $qry = dynamicUpdateV1($table, $_POST, $_GET['id']);
    
    $query = $db->prepare($qry);
    $query->execute();

    echo $db_connect->json_encode($qry);