<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $mainQry = "
        select *
        from igt_transfer_details
    ";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);
