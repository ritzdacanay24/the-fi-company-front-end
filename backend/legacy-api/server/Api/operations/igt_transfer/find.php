<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/getQueryParams.php';

    $mainQry = "
        select *
        from igt_transfer_details
    ";

    $mainQry .= getQueryParams();

    $mainQry .= " Order by id asc";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);

    