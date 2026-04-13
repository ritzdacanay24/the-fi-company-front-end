<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/getQueryParams.php';

    $mainQry = "
        select *
        from qir_settings
    ";

    $mainQry .= getQueryParams();

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);

    