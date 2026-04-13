<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';

    $mainQry = "
        SELECT *, ca_submitted_on_time/total_ncrs*100 on_time_percentage
        FROM ( select case when ca_iss_to IS NULL THEN 'No Department Selected' ELSE ca_iss_to END department 
        , count(*) total_ncrs
        , sum(case when submitted_date IS NULL THEN 1 ELSE 0 END) total_open
        , sum(case when ca_submitted_date IS NULL AND submitted_date IS NULL THEN 1 ELSE 0 END) total_open_corrective_action
        , SUM(case when date(ca_submitted_date) <= ca_due_dt THEN 1 ELSE 0 END) ca_submitted_on_time
        , SUM(case when date(ca_submitted_date) >= ca_due_dt THEN 1 ELSE 0 END) ca_submitted_late
        , sum(case when ca_submitted_date IS NOT NULL AND submitted_date IS NULL THEN 1 ELSE 0 END) total_open_verification
        , sum(case when ca_submitted_date IS NULL AND date(ca_due_dt) <= curDate() AND submitted_date IS NULL THEN 1 ELSE 0 END) ca_open_past_due
    FROM ncr 
    WHERE ca_action_req = 'Yes' AND ACTIVE = 1 AND ca_iss_to != ''
    GROUP BY case when ca_iss_to IS NULL THEN 'No Department Selected' ELSE ca_iss_to END
    ) a
    ";

    $data = $database->query($mainQry)->fetchAll();

    $totalOpen = 0;
    $totalOpenCA = 0;
    $totalOpenVerifiation = 0;
    $totalNCR = 0;
    $ca_open_past_due = 0;
    $on_time = 0;
    foreach($data as $row){
        $totalNCR += $row['total_ncrs'];
        $totalOpen += $row['total_open'];
        $totalOpenCA += $row['total_open_corrective_action'];
        $totalOpenVerifiation += $row['total_open_verification'];
        $ca_open_past_due += $row['ca_open_past_due'];
        $on_time += $row['ca_submitted_on_time'];
    };


    echo json_encode(array(
        "data"=>$data,
        "totalOpen"=>$totalOpen,
        "totalOpenCA"=>$totalOpenCA,
        "totalOpenVerifiation"=>$totalOpenVerifiation,
        "totalNCR"=>$totalNCR,
        "ca_open_past_due"=>$ca_open_past_due,
        "otd"=>$on_time/$totalNCR*100
    ));
