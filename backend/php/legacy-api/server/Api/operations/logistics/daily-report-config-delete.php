<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);

    $table_name = "daily_report_config";

    $data = $database->delete($table_name, [
        "AND" => [
            "user_id" => $_GET['user_id']
        ]
    ]);

    echo json_encode(array("rowCount" => $data->rowCount()));

