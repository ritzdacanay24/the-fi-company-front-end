<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table = 'customer_visit_log_details';

    $data = $database->update($table, $_POST, [
        "id" => $_GET['id']
    ]);

    echo json_encode($data);