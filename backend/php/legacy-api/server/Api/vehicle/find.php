<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/getQueryParams.php';

    $mainQry = "
        select *
        from vehicleInformation
    ";

    $mainQry .= getQueryParams();

    $mainQry .= " Order by id desc";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);

    