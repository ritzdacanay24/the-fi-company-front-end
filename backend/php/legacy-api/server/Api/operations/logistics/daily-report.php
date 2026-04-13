<?php
    require '/var/www/html/server/Databases/DatabaseEyefiV1.php';
    require '/var/www/html/server/Databases/DatabaseQadV1.php';

    //Start openLinesForCurrentWeek
    $dateFrom11 = date('Y-m-01');
    $dateTo11 =  date("Y-m-t", strtotime($dateFrom11));

    $sth = $databaseQad->pdo->prepare("
        SELECT sum(a.sod_price*(a.sod_qty_ord-a.sod_qty_ship)) value
            , a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) so_line
        FROM sod_det a
        WHERE a.sod_per_date between :dateFrom and :dateTo 
            AND sod_domain = 'EYE'
            AND a.sod_qty_ord-a.sod_qty_ship <> 0
            AND sod_project = ''
        group by a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line)))
    ");
    $sth->bindParam(':dateFrom', $dateFrom11, PDO::PARAM_STR);
    $sth->bindParam(':dateTo', $dateTo11, PDO::PARAM_STR);
    $sth->execute();
    $openBalanceCurrentMonth = $sth->fetchAll(PDO::FETCH_ASSOC);

    $in_array = array();
    foreach ($openBalanceCurrentMonth as $row) {
        $in_array[] = $row['SO_LINE'];
    }

    $in = "'" . implode("','", $in_array) . "'";

    $sth = $database->pdo->prepare("
        SELECT userName, a.so
        FROM eyefidb.workOrderOwner a
        WHERE a.so IN ($in)
        and userName IN ('SHIPPING', 'PACKING')
    ");
    $sth->execute();
    $openBalanceByOwner = $sth->fetchAll(PDO::FETCH_ASSOC);

    $openLinesForCurrentWeek_total = 0;
    foreach($openBalanceByOwner as $row){
        foreach($openBalanceCurrentMonth as $row1){
            if($row['so'] == $row1['SO_LINE']){
                $openLinesForCurrentWeek_total += $row1['VALUE'];
            }
        }
    }

    //End openLinesForCurrentWeek

    
    //Start openLinesForCurrentWeek

    $day = date('w');
$startCurrentWeek = date('Y-m-d', strtotime('-'.($day-1).' days'));
$endCurrentWeek = date('Y-m-d', strtotime('+'.(5-$day).' days'));


    $sth = $databaseQad->pdo->prepare("
        SELECT count(*) value
        FROM sod_det a
        WHERE a.sod_per_date between :startCurrentWeek and :endCurrentWeek 
            AND sod_domain = 'EYE'
            AND a.sod_qty_ord-a.sod_qty_ship <> 0
            AND sod_project = ''
    ");
    $sth->bindParam(':startCurrentWeek', $startCurrentWeek, PDO::PARAM_STR);
    $sth->bindParam(':endCurrentWeek', $endCurrentWeek, PDO::PARAM_STR);
    $sth->execute();
    $openLinesForCurrentWeek = $sth->fetch(PDO::FETCH_ASSOC);
    //End openLinesForCurrentWeek

    //Start Late Reason Codes
    $today =  date("Y-m-d");
    
    $sth = $databaseQad->pdo->prepare("
        SELECT a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) so_line
        FROM sod_det a
        WHERE a.sod_per_date = :today
            AND sod_domain = 'EYE'
            AND a.sod_qty_ord-a.sod_qty_ship <> 0
            AND sod_project = ''
    ");
    $sth->bindParam(':today', $today, PDO::PARAM_STR);
    $sth->execute();
    $lateReasonCodesDueToday = $sth->fetchAll(PDO::FETCH_ASSOC);

    $in_array = array();
    foreach ($lateReasonCodesDueToday as $row) {
        $in_array[] = $row['SO_LINE'];
    }

    $in = "'" . implode("','", $in_array) . "'";

    $sth = $database->pdo->prepare("
        SELECT lateReasonCode, count(lateReasonCode) value
        FROM eyefidb.workOrderOwner a
        WHERE a.so IN ($in)
        and lateReasonCode <> '' 
        group by lateReasonCode
    ");
    $sth->bindParam(':today', $today, PDO::PARAM_STR);
    $sth->execute();
    $lateReasonCodes = $sth->fetchAll(PDO::FETCH_ASSOC);
    //End Late Reason Codes

    //Start ops 10 routing completed tasks
    $operation = 10;
    $dateFrom = date('Y-m-d');
    $dateTo = date('Y-m-d');
    $sth = $databaseQad->pdo->prepare("
        select  count(op_wo_nbr) value
        from op_hist
        left join wo_mstr c on c.wo_nbr = op_hist.op_wo_nbr and c.wo_domain = 'EYE'  
        where op_tran_date between :dateFrom and :dateTo 
            and op_wo_op = :operation and op_domain = 'EYE'  
            and op_type = 'BACKFLSH'
        WITH (NOLOCK)
    ");
    $sth->bindParam(':dateFrom', $dateFrom, PDO::PARAM_STR);
    $sth->bindParam(':dateTo', $dateTo, PDO::PARAM_STR);
    $sth->bindParam(':operation', $operation, PDO::PARAM_STR);
    $sth->execute();
    $ops10RoutingCompleted = $sth->fetch(PDO::FETCH_ASSOC);
    //End ops 10 routing completed tasks


    //Start OPEN LINES FOR TODAY
    $today =  date("Y-m-d");

    $sth = $databaseQad->pdo->prepare("
        SELECT count(*) value
        FROM sod_det a
        WHERE a.sod_per_date = :today
            AND sod_domain = 'EYE'
            AND a.sod_qty_ord-a.sod_qty_ship <> 0
            AND sod_project = ''
    ");
    $sth->bindParam(':today', $today, PDO::PARAM_STR);
    $sth->execute();
    $openLinesToday = $sth->fetch(PDO::FETCH_ASSOC);
    //End OPEN LINES FOR TODAY


    //Open Revenue
    //$dateFrom111 = date('Y-m-01');
    //$dateTo111 =  date("Y-m-t", strtotime($dateFrom111));

    $date = new DateTime(date('Y-m-d', time()));

    $date->modify('+1 day');

    $dateFrom111 = $date->format('Y-m-d');


    $dateTo111 = date('Y-m-d', strtotime('last day of this month'));


    $sth = $databaseQad->pdo->prepare("
        select sum((sod_qty_ord-sod_qty_ship)*sod_price) value
        from sod_det a
        WHERE sod_domain = 'EYE'
            AND sod_qty_ord != sod_qty_ship	
            AND a.sod_per_date between :dateFrom111 and :dateTo111
            AND sod_project = ''
    ");
    $sth->bindParam(':dateFrom111', $dateFrom111, PDO::PARAM_STR);
    $sth->bindParam(':dateTo111', $dateTo111, PDO::PARAM_STR);
    $sth->execute();
    $openRevenue = $sth->fetch(PDO::FETCH_ASSOC);
    //End OPEN LINES FOR TODAY

    echo json_encode(array(
        "startCurrentWeek" => $startCurrentWeek,
        "endCurrentWeek" => $endCurrentWeek,
        "dateFrom11" => $dateFrom11,
        "dateTo11" => $dateTo11,
        "openBalanceCurrentMonthDetails" => $openBalanceCurrentMonth,
        "openBalanceCurrentMonth" => $openLinesForCurrentWeek_total,
        "openLinesForCurrentWeek" => $openLinesForCurrentWeek,
        "lateReasonCodes" => $lateReasonCodes,
        "ops10RoutingCompleted" => $ops10RoutingCompleted,
        "openLinesToday" => $openLinesToday,
        "openRevenue" => $openRevenue,
        "dateFrom111" => $dateFrom111,
        "vdateTo111" => $dateTo111,
        "futuerOpenRevenueCurrentMonth" => array(
            "dateFrom" => $dateFrom111,
            "dateTo" => $dateTo111,
            "value" => $openRevenue['VALUE']
        ),
        "in" => $in_array
    ));
