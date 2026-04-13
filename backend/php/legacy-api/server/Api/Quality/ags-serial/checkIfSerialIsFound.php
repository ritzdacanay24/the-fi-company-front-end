<?php
    use EyefiDb\Databases\DatabaseEyefi;

    $db_connect = new DatabaseEyefi();
    $db = $db_connect->getConnection();
    $db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);
    $db->setAttribute(PDO::ATTR_ORACLE_NULLS, PDO::NULL_EMPTY_STRING);

    require "/var/www/html/server/Api/FieldServiceMobile/functions/index.php";

    $_POST = json_decode(file_get_contents("php://input"), true);

    $mainQry = "
        select generated_SG_asset
        from eyefidb.agsSerialGenerator
        where generated_SG_asset = :assetNumber
        LIMIT 1
    ";
    $query = $db->prepare($mainQry);
    $query->bindParam(':assetNumber', $_GET['assetNumber'], PDO::PARAM_STR);
    $query->execute();
    $isFound = $query->fetch();

    echo json_encode($isFound);
