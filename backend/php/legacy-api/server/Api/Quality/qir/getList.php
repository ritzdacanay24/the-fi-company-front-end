<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/shared/jCode.php';

    $dateFrom = $_GET['dateFrom'];
    $dateTo = $_GET['dateTo'];
    $isAll =  $_GET['isAll'];

    $mainQry = "
        select a.*
            , case when b.id THEN 'Yes' END qir_response_id
            , case when createdBy <> 0 THEN CONCAT(c.first, ' ', c.last) ELSE a.email END createdBy
        from qa_capaRequest a 
        left join qir_response b on b.qir_number = a.id
        LEFT JOIN db.users c ON c.id = a.createdBy
    ";

    if($isAll == "true"){
        $mainQry .= " WHERE a.id != 0 ";
    }else{
        $mainQry .= " WHERE a.createdDate between '$dateFrom' AND '$dateTo' ";
    }

    if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Open'){
        $mainQry .= " AND a.active = 1 AND a.status IN  ('Open', 'In Process')";
    }else if(ISSET($_GET['selectedViewType']) && $_GET['selectedViewType'] == 'Closed'){
        $mainQry .= " AND a.active = 1 AND a.status IN ( 'Closed', 'Rejected')  ";
    }

    $mainQry .= " order by a.createdDate DESC";

    $data = $database->query($mainQry)->fetchAll();

    echo j_code($data);

