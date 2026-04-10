<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $mainQry = "
        select *
        from qir_settings
    ";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);
