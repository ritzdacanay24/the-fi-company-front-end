<?php

include_once '/var/www/config/.core.php';

$servername = getenv('DB_HOST_NAME');
$username = getenv('DB_USER_NAME');
$password = getenv('DB_PASSWORD');
$dbname =  getenv('DB_NAME');

$rateChangeEffectiveDate = '2021-05-01'; //Effective date of tech salary change 
$nowDate = date("Y-m-d");

try {

    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    // set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $date = isset($_GET['date']) && $_GET['date'] != 'undefined' ? $_GET['date'] : '2020-11-16';
    $searchWo = isset($_GET['searchWo']) && $_GET['searchWo'] != 'undefined'  ? $_GET['searchWo'] : '';
    $searchCustomer = isset($_GET['searchCustomer']) && $_GET['searchCustomer'] != 'undefined' ? trim($_GET['searchCustomer']) : '';


    $qry = "
        SELECT a.*
            , b.id workOrderId
            , b.*
            , eyeFiAsset
            , DATE_FORMAT(dateSubmitted, '%a %b %d, %Y %H:%m') dateSubmitted
            , DATE_FORMAT(RequestDate, '%m/%d/%Y') RequestDate
            , customerAsset
            , team
            , total_on_team
        FROM eyefidb.fs_scheduler a
        JOIN eyefidb.fs_workOrder b ON fs_scheduler_id = a.id

        LEFT JOIN (
            select fs_det_id, group_concat(user SEPARATOR ', ') team
                , count(user) total_on_team
            from eyefidb.fs_team
            group by fs_det_id
        ) e ON e.fs_det_id = a.id

        left join (
            SELECT workOrderId, 
            GROUP_CONCAT(DISTINCT eyefiAsset ORDER BY eyefiAsset ASC SEPARATOR ',') eyeFiAsset,
            GROUP_CONCAT(DISTINCT customerAsset ORDER BY customerAsset ASC SEPARATOR ',') customerAsset
            FROM eyefidb.fs_workOrderMisc a
            group by workOrderId
        ) c ON c.workOrderId = b.id
        
        
	";

    if ($searchCustomer) {
        $qry .= " where a.Customer LIKE '%IGT%' ";
        $query = $conn->prepare($qry);
        $query->execute();
        $mainInfo = $query->fetchAll(PDO::FETCH_ASSOC);
    } else if ($searchWo) {
        $qry .= " where b.id = :id";
        $query = $conn->prepare($qry);
        $query->bindParam(":id", $searchWo, PDO::PARAM_STR);
        $query->execute();
        $mainInfo = $query->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $qry .= " where RequestDate = :dateFrom ";
        $query = $conn->prepare($qry);
        $query->bindParam(":dateFrom", $date, PDO::PARAM_STR);
        $query->execute();
        $mainInfo = $query->fetchAll(PDO::FETCH_ASSOC);
    }

    $in_array = array();
    foreach ($mainInfo as $row) {
        $in_array[] = $row['workOrderId'];
    }

    $in = "'" . implode("','", $in_array) . "'";

    $qry = "
        SELECT *
        FROM eyefidb.fs_workOrderTrip 
        where workOrderId IN ($in)
	";
    $query = $conn->prepare($qry);
    $query->execute();
    $tripInfo = $query->fetchAll(PDO::FETCH_ASSOC);

    $qry = "
        select fs_det_id, sum(user_rate) sum_rate
        from eyefidb.fs_team
        group by fs_det_id
	";
    $query = $conn->prepare($qry);
    $query->execute();
    $userRates = $query->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SET @maxHrs := 8;";
    $sth = $conn->prepare($sql);
    $sth->execute();
    $sth->closeCursor();

    $qry = "
    
    select sum(case when isTravel = 1 AND totalHrs > @maxHrs THEN 8 when isTravel = 1 AND totalHrs <= @maxHrs THEN totalHrs ELSE 0 END ) travelTimeHrs
                , sum(case when isTravel = 1 AND totalHrs > @maxHrs THEN totalHrs-@maxHrs ELSE 0 END ) travel_over_time_hrs
                , sum(case when isTravel = 0 THEN actualHrs ELSE 0 END ) installTimes
                , sum(case when isTravel = 0 AND totalHrs > @maxHrs THEN totalHrs-@maxHrs  ELSE 0 END ) install_overtime_hrs
                , (case when sum(totalHrs) > @maxHrs THEN sum(totalHrs)-@maxHrs ELSE 0 END)  total_overtime_from_total_hrs
                , sum(totalHrs) totalHrs
                , workOrderId
                , start
                , startFormate
                , sum(brkhrs) totalBrkHrs
    from (select *
                    , (case when totalHrs > @maxHrs then totalHrs-@maxHrs ELSE 0 END) overtime
                    , (case when totalHrs <= @maxHrs then totalHrs ELSE (totalHrs-case when totalHrs > @maxHrs then totalHrs-@maxHrs ELSE 0 END) END) actualHrs
    from (select  workOrderId 
                    , DATE_FORMAT(date(start), '%m/%d/%Y')  start
                    , DATE_FORMAT(date(start), '%a %m/%d/%Y')  startFormate
                    , DATE_FORMAT(date(end), '%m/%d/%Y')  end
                    , truncate(sum(totalHours)/60,2) totalHrs
                    , case when type = 'travel' THEN 1 ELSE 0 END  isTravel
                      , truncate(sum(total_break)/60,2) brkhrs 
              from (SELECT workOrderId
              , projectStart start 
              , projectFinish end
              , totalHours
              , TIMESTAMPDIFF(MINUTE,break_start,break_end) total_break 
              , proj_type
              , case when proj_type LIKE '%travel%' THEN 'travel' ELSE 'workorder' END type
              FROM eyefidb.fs_workOrderProject_copy  
              where workOrderId IN ($in)
              order by projectStart ASC) a
    
                group by workOrderId, DATE_FORMAT(date(start), '%m/%d/%Y'), DATE_FORMAT(date(end), '%m/%d/%Y'), DATE_FORMAT(date(start), '%a %m/%d/%Y'), type
                order by  DATE_FORMAT(date(start), '%m/%d/%Y'), DATE_FORMAT(date(end), '%m/%d/%Y')
                  ) a
                   ) a
                   where start IS NOT NULL
            group by workOrderId, start, startFormate
                  
                  
            
    ";
    $query = $conn->prepare($qry);
    $query->execute();
    $results = $query->fetchAll(PDO::FETCH_ASSOC);

    $markUpPercent = 30;


    function isWeekend($date)
    {
        return (date('N', strtotime($date)) >= 6);
    }

    $applyovertime_default = 'true';
    $turn_on_weekend_overtime = isset($_GET['applyovertime']) && $_GET['applyovertime'] != 'null' && $_GET['applyovertime'] != 'undefined' ? $_GET['applyovertime'] : $applyovertime_default;

    foreach ($mainInfo as &$row) {

        $RequestDate = date_create($row['RequestDate']);
        $RequestDate = date_format($RequestDate, "Y-m-d");

        /**
         * Based on effect date changes
         */
        $row['rates'] = (object) array(
            "cost_hourly_rate" => 0,
            "cost_overtime_rate" => 1.50,

            "billing_hourly_rate" => 95,
            "billing_overtime_rate" => 142.50,
        );

        $row['testDate'] = $RequestDate;
        $row['details'] = array();
        $row['totalInstallers'] = $row['total_on_team'];

        $row['travel_install_hrs'] = (object) array(
            "travelTimeHrs" => 0,
            "installTimes" => 0,
            "total_overtime_from_total_hrs" => 0
        );


        $row['installerRates'] = array();

        foreach ($userRates as &$row1) {


            if($row1['fs_det_id'] == $row['fs_scheduler_id']){
                $row['rates']->cost_hourly_rate = $row['rates']->cost_hourly_rate + $row1['sum_rate'];

                $row['installerRates'][] = $row1;
            }   
        }

        $row['rates']->cost_overtime_rate = $row['rates']->cost_overtime_rate * $row['rates']->cost_hourly_rate;

        $datesToCheck = array();
        $totalDays = 0;
        $row['travel_install_hrs']->regularTimeHrs = 0;
        $row['travel_install_hrs']->regularTimeHrs = 0;


        foreach ($results as &$row1) {
            if ($row['workOrderId'] == $row1['workOrderId']) {

                $row1['isWeekend'] = isWeekend($row1['start']);
                $totalDays++;
                $datesToCheck[] = $row1['start'];

                //calculate week overtime
                if ($row1['isWeekend'] && $turn_on_weekend_overtime == 'true') {

                    //add travel time to overtime
                    $row1['travel_over_time_hrs'] = $row1['travelTimeHrs'] + $row1['travel_over_time_hrs'];

                    //add install time to overtime
                    $row1['install_overtime_hrs'] = $row1['installTimes'] + $row1['install_overtime_hrs'];

                    //add total overtime
                    $row1['total_overtime_from_total_hrs'] = $row1['travel_over_time_hrs'] + $row1['install_overtime_hrs'];

                    //clear regular time to be applied as overtime
                    $row1['installTimes'] = 0;
                    $row1['travelTimeHrs'] = 0;
                } else {
                    //total minus overtime to calcualte rates
                    $row['travel_install_hrs']->travelTimeHrs = $row['travel_install_hrs']->travelTimeHrs + ($row1['travelTimeHrs']);
                    $row['travel_install_hrs']->installTimes = $row['travel_install_hrs']->installTimes + ($row1['installTimes']);
                }
                $row['travel_install_hrs']->total_overtime_from_total_hrs = $row['travel_install_hrs']->total_overtime_from_total_hrs + $row1['total_overtime_from_total_hrs'];

                $row['travel_install_hrs']->regularTimeHrs += $row1['totalHrs'] - $row1['total_overtime_from_total_hrs'];

                $row['details'][] = $row1;
            }
        }

        //calculate cost payroll
        $row['travel_install_hrs']->cost_regular_total = $row['travel_install_hrs']->regularTimeHrs * $row['rates']->cost_hourly_rate;
        $row['travel_install_hrs']->cost_overtime_total = $row['travel_install_hrs']->total_overtime_from_total_hrs * $row['rates']->cost_overtime_rate;

        /**
         * Based on effect date changes
         */
        if ($RequestDate >= $rateChangeEffectiveDate) {
            $row['travel_install_hrs']->billing_regular_total = $row['travel_install_hrs']->regularTimeHrs * $row['rates']->billing_hourly_rate;
            $row['travel_install_hrs']->billing_overtime_total = $row['travel_install_hrs']->total_overtime_from_total_hrs * $row['rates']->billing_overtime_rate;
        } else {
            $row['travel_install_hrs']->billing_regular_total = $row['travel_install_hrs']->regularTimeHrs * $row['rates']->billing_hourly_rate * $row['totalInstallers'];
            $row['travel_install_hrs']->billing_overtime_total = $row['travel_install_hrs']->total_overtime_from_total_hrs * $row['rates']->billing_overtime_rate * $row['totalInstallers'];
        }

        //calculate summary 
        $row['travel_install_hrs']->cost_total_payroll = $row['travel_install_hrs']->cost_regular_total +  $row['travel_install_hrs']->cost_overtime_total;
        $row['travel_install_hrs']->billing_total_payroll = $row['travel_install_hrs']->billing_regular_total + $row['travel_install_hrs']->billing_overtime_total;

        $row['finishedDate'] = ($datesToCheck) ? max($datesToCheck) : "";
        $row['startDate'] = ($datesToCheck) ? min($datesToCheck) : "";

        $row['tripExpenseOverall'] = (object) array(
            "cost_total" => 0,
            "markup_total" => 0,
            "billing_total" => 0
        );
        $PERDIEM = 75;
        $per_diem = 'Per Deim';

        $row['tripInfo'] = array(
            "Airfare" => 0,
            "Bag Fees" => 0,
            "Rental Car" => 0,
            "Hotel" => 0,
            "Gas" => 0,
            "Parking/Taxi" => 0,
            "Per Diem" => 0,
            "Equipment Rental" => 0,
            "Supplies" => 0,
            "Others" => 0
        );

        foreach ($tripInfo as $key => $value) {
            if ($row['workOrderId'] == $value['workOrderId']) {
                $cost = (float) $value['cost'];
                $value['markUp'] = ($cost * $markUpPercent) / 100;
                $value['billing'] = (($cost * $markUpPercent) / 100) + $cost;

                if (trim($value['name']) == $per_diem) {
                    $row['tripInfo'][trim($value['name'])] = (object) array('cost' => $PERDIEM * $row['totalInstallers'] * $totalDays, 'markUp' => $value['markUp']);
                } else {
                    $row['tripInfo'][trim($value['name'])] = $value;
                }

                //sum total
                $row['tripExpenseOverall']->cost_total = $cost + $row['tripExpenseOverall']->cost_total;
                $row['tripExpenseOverall']->markup_total = $value['markUp'] + $row['tripExpenseOverall']->markup_total;
                $row['tripExpenseOverall']->billing_total = $value['billing'] + $row['tripExpenseOverall']->billing_total;
            }
        }

        //calculate cost payroll
        // $row['travel_install_hrs']->cost_travel_total = $row['travel_install_hrs']->travelTimeHrs * $row['rates']->cost_hourly_rate;
        // $row['travel_install_hrs']->cost_install_total = $row['travel_install_hrs']->installTimes * $row['rates']->cost_hourly_rate;
        // $row['travel_install_hrs']->cost_overtime_total = $row['travel_install_hrs']->total_overtime_from_total_hrs * $row['rates']->cost_overtime_rate;
        // $row['travel_install_hrs']->cost_total_payroll = $row['travel_install_hrs']->cost_travel_total + $row['travel_install_hrs']->cost_install_total + $row['travel_install_hrs']->cost_overtime_total;

        // //calculate bill labor
        // $row['travel_install_hrs']->billing_travel_total = $row['travel_install_hrs']->travelTimeHrs * $row['rates']->billing_hourly_rate * $row['totalInstallers'];
        // $row['travel_install_hrs']->billing_install_total = $row['travel_install_hrs']->installTimes * $row['rates']->billing_hourly_rate * $row['totalInstallers'];
        // $row['travel_install_hrs']->billing_overtime_total = $row['travel_install_hrs']->total_overtime_from_total_hrs * $row['rates']->billing_overtime_rate * $row['totalInstallers'];
        // $row['travel_install_hrs']->billing_total_payroll = $row['travel_install_hrs']->billing_travel_total + $row['travel_install_hrs']->billing_install_total + $row['travel_install_hrs']->billing_overtime_total;
    }

    echo json_encode(
        array(
            "mainInfo" => $mainInfo,
            "markUpPercent" => $markUpPercent,
            "dateViewing" => $date,
            "tripInfo" => $tripInfo,
            "turn_on_weekend_overtime" => $turn_on_weekend_overtime
        )
    );
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
$conn = null;
