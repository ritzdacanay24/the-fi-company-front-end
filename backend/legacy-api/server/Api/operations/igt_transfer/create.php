<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);
    
    $database->insert("igt_transfer", $_POST['main']);

    $insertId = $database->id();

    foreach ($_POST['details'] as $row) {
        $row['igt_transfer_ID'] = $insertId;
        $data = $database->insert("igt_transfer_details", $row);
    }

    echo json_encode(array("insertId" => $insertId));
