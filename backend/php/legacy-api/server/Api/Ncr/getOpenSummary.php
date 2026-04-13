<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $mainQry = "
        SELECT case when ca_iss_to = '' THEN 'No Department Selected' ELSE ca_iss_to END department 
            , count(*) total_open
            , sum(case when ( ca_submitted_date = '' OR ca_submitted_date IS NULL) THEN 1 ELSE 0 END) total_open_corrective_action
            , sum(case when ca_submitted_date IS NOT NULL THEN 1 ELSE 0 END) total_open_verification
        FROM ncr 
        WHERE ca_action_req = 'Yes' AND ACTIVE = 1 AND (submitted_date IS NULL OR submitted_date = '')
        GROUP BY case when ca_iss_to = '' THEN 'No Department Selected' ELSE ca_iss_to END
    ";

    $data = $database->query($mainQry)->fetchAll();

    $totalOpen = 0;
    $totalOpenCA = 0;
    $totalOpenVerifiation = 0;
    foreach($data as $row){
        $totalOpen += $row['total_open'];
        $totalOpenCA += $row['total_open_corrective_action'];
        $totalOpenVerifiation += $row['total_open_verification'];
    };


    echo json_encode(array(
        "data"=>$data,
        "totalOpen"=>$totalOpen,
        "totalOpenCA"=>$totalOpenCA,
        "totalOpenVerifiation"=>$totalOpenVerifiation
    ));
