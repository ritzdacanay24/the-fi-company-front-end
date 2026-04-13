<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    
    $data = $database->get("qa_capaRequest", '*', [
        "id" => $_GET['id']
    ]);


    echo json_encode($data);