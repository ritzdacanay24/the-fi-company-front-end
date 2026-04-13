<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/getQueryParams.php';

    $mainQry = "
        select *
        from vehicleInformation
    ";

    $mainQry .= getQueryParams();

    $mainQry .= " Order by id desc";
    $mainQry .= " LIMIT 1";

    $data = $database->query($mainQry)->fetch();

    echo json_encode($data);

    