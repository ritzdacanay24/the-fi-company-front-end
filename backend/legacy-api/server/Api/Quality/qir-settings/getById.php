<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $table_name = "qir_settings";

    $data = $database->get($table_name, '*', [
        "id" => $_GET['id']
    ]);

    echo json_encode($data);