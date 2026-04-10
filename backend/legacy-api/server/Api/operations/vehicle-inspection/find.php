<?php
    require '/var/www/html/server/Databases/DatabaseForm.php';
    require '/var/www/html/shared/getQueryParams.php';

    $mainQry = "
        select *
        from shipping_request
    ";

    $mainQry .= getQueryParams();

    $mainQry .= " Order by id desc";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);

    