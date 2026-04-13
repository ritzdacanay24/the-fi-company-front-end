<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'qir_response';

    $data = $database->update($table, $_POST, [
        "id" => $_GET['id']
    ]);

    echo json_encode($data);