<?php

    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
        
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "user_permission_config";

    $data = $database->insert($table_name, $_POST);

    echo json_encode(array("insertId" => $database->id()));
