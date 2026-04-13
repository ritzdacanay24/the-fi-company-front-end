<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $mainQry = "
        select *
        from qa_capaRequest
    ";

    if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Active'){
        $mainQry .= " Where active = 1";
    }else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Inactive'){
        $mainQry .= " Where active = 0 || active IS NULL";
    }

    $data = $database->query($mainQry)->fetchAll();

    echo json_encode($data);
