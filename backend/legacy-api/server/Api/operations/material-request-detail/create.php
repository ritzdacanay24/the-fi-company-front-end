<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $_POST = json_decode(file_get_contents("php://input"), true);
    
    $database->insert("mrf", $_POST['main']);

    $insertId = $database->id();

    foreach ($_POST['details'] as $row) {
        $row['mrf_id'] = $insertId;
        $data = $database->insert("mrf_det", $row);
    }

    echo json_encode(array("insertId" => $insertId));
