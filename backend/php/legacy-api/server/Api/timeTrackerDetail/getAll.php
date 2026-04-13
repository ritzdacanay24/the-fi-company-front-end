<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $mainQry = "
        select *
        from time_tracker_detail
    ";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);
