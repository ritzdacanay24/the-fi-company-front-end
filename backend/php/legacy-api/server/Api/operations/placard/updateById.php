<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "placard";

    $data = $database->update($table_name, $_POST, [
        "id" => $_GET['id']
    ]);

    echo json_encode(array("rowCount" => $data->rowCount()));