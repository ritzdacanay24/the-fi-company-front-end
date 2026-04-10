<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/getQueryParams.php';

    $mainQry = "
        select a.*, b.id shortage_id
        from mrf_det a 
        left join shortageRequest b on b.mrf_line = a.id
    ";

    $mainQry .= getQueryParams();

    $mainQry .= " Order by id asc";

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);

    