<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "qir_settings";

    $data = $database->delete($table_name, [
        "AND" => [
            "id" => $_GET['id']
        ]
    ]);

    echo json_encode(array("rowCount" => $data->rowCount()));

