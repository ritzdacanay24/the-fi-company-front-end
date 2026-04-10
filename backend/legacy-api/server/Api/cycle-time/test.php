<?php
use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$dbConnect = new DatabaseEyefi();
$db = $dbConnect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_NATURAL);

$dbConnectQad = new DatabaseQad();
$dbQad = $dbConnectQad->getConnection();
$dbQad->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$typeOfView = ISSET($_GET['typeOfView']) ? $_GET['typeOfView']: "Weekly";
$dateFrom = ISSET($_GET['dateFrom']) ? $_GET['dateFrom']: '2024-08-01';
$dateTo = ISSET($_GET['dateTo']) ? $_GET['dateTo']: '2025-02-13';

//alldata 
$mainQry = "
        SELECT a.*, b.*, c.*, ROUND(a.open_qty * cycleTime,2) ext_cycle_time, IFNULL(c.employees, 11) employees
    FROM overdue_orders a
    LEFT JOIN shipping_cycle_times b ON b.partNumber = a.part_number
    LEFT JOIN weekly_users c ON c.date = a.wr_due_by
    WHERE a.wr_op = 20
        AND a.open_qty > 0
        AND wr_status != 'C'
    ORDER BY wr_due_by asc
";
$query = $db->prepare($mainQry);
$query->execute();
$allData = $query->fetchAll(PDO::FETCH_ASSOC);

//day
if($typeOfView == 'day'){
    $mainQry = "
        SELECT wr_due_by
            , COUNT(*) total_orders
            , sum(a.open_qty * cycleTime) ext_cycle_time
            , max(IFNULL(c.employees, 11)*8) head_count
            , SUM(case when wr_due_by < CURDATE() then a.open_qty * cycleTime ELSE 0 END) overdue
        FROM overdue_orders a
        LEFT JOIN shipping_cycle_times b ON b.partNumber = a.part_number
        LEFT JOIN weekly_users c ON c.date = a.wr_due_by
        WHERE a.wr_op = 20
            AND a.open_qty > 0
            AND wr_status != 'C'
        GROUP BY wr_due_by
        ORDER BY wr_due_by asc
    ";
} else if($typeOfView == 'week'){

//week
    $mainQry = "
    SELECT COUNT(*) total_orders
        , sum(a.open_qty * cycleTime) ext_cycle_time
        , max(IFNULL(c.employees, 11)*8) head_count
        , SUM(case when wr_due_by < CURDATE() then a.open_qty * cycleTime ELSE 0 END) overdue
        , WEEK(wr_due_by, 2) week
        , YEAR(wr_due_by) year
        , concat(MIN(DATE_FORMAT(wr_due_by, '%m/%e/%y')), '-' , MAX(DATE_FORMAT(wr_due_by, '%m/%e/%y'))) wr_due_by
    FROM overdue_orders a
    LEFT JOIN shipping_cycle_times b ON b.partNumber = a.part_number
    LEFT JOIN weekly_users c ON c.date = a.wr_due_by
    WHERE a.wr_op = 20
        AND a.open_qty > 0
        AND wr_status != 'C'
    GROUP BY WEEK(wr_due_by, 2), YEAR(wr_due_by)
    ORDER BY YEAR(wr_due_by), WEEK(wr_due_by, 2) asc
    ";

} else if($typeOfView == 'month'){
    //month
    $mainQry = "
        SELECT COUNT(*) total_orders
            , sum(a.open_qty * cycleTime) ext_cycle_time
            , max(IFNULL(c.employees, 11)*8) head_count
            , SUM(case when wr_due_by < CURDATE() then a.open_qty * cycleTime ELSE 0 END) overdue
            , MONTH(wr_due_by) month
            , YEAR(wr_due_by) year
            , concat(MIN(DATE_FORMAT(wr_due_by, '%m/%e/%y')), '-' , MAX(DATE_FORMAT(wr_due_by, '%m/%e/%y'))) wr_due_by
        FROM overdue_orders a
        LEFT JOIN shipping_cycle_times b ON b.partNumber = a.part_number
        LEFT JOIN weekly_users c ON c.date = a.wr_due_by
        WHERE a.wr_op = 20
            AND a.open_qty > 0
            AND wr_status != 'C'
        GROUP BY MONTH(wr_due_by) desc, YEAR(wr_due_by)
    ";
}

//test

$mainQry = "
    SELECT sum(a.open_qty * cycleTime) value
        , max(IFNULL(c.employees, 11)*8) head_count
        ,  wr_due_by sod_per_date
        ,  wr_due_by label
        , sum(a.open_qty * cycleTime) total_shipped_on_time
        , WEEK(wr_due_by, 1) week
        , YEAR(wr_due_by) year
    FROM overdue_orders a
    LEFT JOIN shipping_cycle_times b ON b.partNumber = a.part_number
    LEFT JOIN weekly_users c ON c.date = a.wr_due_by
    WHERE a.wr_op = 20
        AND a.open_qty > 0
        AND wr_status != 'C'
        GROUP BY wr_due_by
        , WEEK(wr_due_by, 1) 
        , YEAR(wr_due_by) 
        
";

$query = $db->prepare($mainQry);
$query->execute();
$chartData =  $query->fetchAll(PDO::FETCH_ASSOC);


// $chart = array();
// foreach($results as &$row){

//     $color = 'green';
//     $headCount = $row['head_count'];
//     if($row['ext_cycle_time'] > $row['head_count']){
//         $color = 'red';
//     }else if($row['wr_due_by'] < date("Y-m-d")){
//         $color = 'red';
//         $headCount = 0;
//     }

//     $chart['colors'][] = $color;
//     $chart['label'][] = $row['wr_due_by'];
//     $chart['values'][] = $row['ext_cycle_time'] ? $row['ext_cycle_time']:0;
//     $chart['headCount'][] = $headCount;
// }

$displayCustomers = true;


$chartData1 = getDynamicData($chartData, $dateFrom, $dateTo, $typeOfView, $displayCustomers );


echo $dbConnect->json_encode(array("chart" => $chartData1));


function getDynamicData($data, $weekStartDate = '2022-01-01', $weekEndDate = '2022-12-31', $typeOfView = 'Monthly', $displayCustomers = "Show All")
    {

        $results = $data;

        $month = strtotime($weekStartDate);
        $end = strtotime($weekEndDate);

        $KeyName = "sod_per_date";
        $keyValue = 'value';
        $label = 'label';

        $test = array();
        $chart = array();
        $chart1 = array();
        $headCountData = array();

        $goal = 200000.00;

        $totalHeadCount = 11;
        $totalHoursPerHead = 8;

        while ($month <= $end) {
            $w = date('W', $month);
            $y = date('Y', $month);
            $m = date('M', $month);
            $d = date('m/d/y', $month);

            $yearQuarterSet = date("n", $month);
            $yearQuarter = ceil($yearQuarterSet / 3);

            if ($typeOfView == 'Weekly') {
                $obj['label'][] = $w . '-' . $y;
                $labelCheck = $w . '-' . $y;
                $ee = "W";
                $key = $w;
                $goal1 = $goal * 5;
            } else if ($typeOfView == 'Monthly') {
                $obj['label'][] = $m . '-' . $y;
                $labelCheck = $m . '-' . $y;
                $ee = "M";
                $key = $m;
                $goal1 = $goal * 31;
            } else if ($typeOfView == 'Annually') {
                $obj['label'][] = $y;
                $labelCheck =  $y;
                $ee = "Y";
                $key = $y;
                $goal1 = $goal * 365;
            } else if ($typeOfView == 'Daily') {
                $obj['label'][] = $d;
                $labelCheck =  $d . '-' . $y;
                $ee = "m/d/y";
                $key = $d;
                $goal1 = $goal;
            } else if ($typeOfView == 'Quarterly') {
                $obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
                $labelCheck =  $yearQuarter . '-' . $y;
                $ee = "m/d/y";
                $key = $yearQuarter . '-' . $y;
                $goal1 = $goal * 90;
            }



            $test[$key] = 0;
            $test1[$key] = 0;
            $headCount[$key] = 0;
            $testHeadCount[$key] = 0;

            foreach ($results as $row) {
                if ($typeOfView == 'Quarterly') {
                    $yearQuarterSet1 = date("n", strtotime($row[$KeyName]));
                    $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row[$KeyName]));
                } elseif ($typeOfView == 'Annually') {
                    $formatedDate = date('Y', strtotime($row[$KeyName]));
                } else {
                    $formatedDate = date($ee, strtotime($row[$KeyName])) . '-' . date('Y', strtotime($row[$KeyName]));
                }

                if ($labelCheck == $formatedDate) {
                    $test[$key] += $row['total_shipped_on_time'];
                    $test1[$key] += $row['value'];
                    $headCount[$key] += $row['head_count'];
                    $testHeadCount[$key] += 1;
                }
            }

            $chart1['dataset'][] = $test1[$key];
            $chart1['label'] = "Total Hrs";
            $chart1['backgroundColor'] = '#8FBC8F';
            $chart1['type'] = 'bar';

            
            $headCountData['dataset'][] = $headCount[$key];
            $headCountData['testHeadCount'][] = $testHeadCount[$key];
            $headCountData['label'] = "Head Count";
            $headCountData['backgroundColor'] = '#8FBC8F';
            $headCountData['type'] = 'line';



            if ($typeOfView == 'Weekly') {
                $month = strtotime("+1 week", $month);
            } else if ($typeOfView == 'Monthly') {
                $month = strtotime("+1 month", $month);
            } else if ($typeOfView == 'Annually') {
                $month = strtotime("+1 year", $month);
            } else if ($typeOfView == 'Daily') {
                $month = strtotime("+1 day", $month);
            } else if ($typeOfView == 'Quarterly') {
                $month = strtotime("+3 month", $month);
            }
        }

        return array(
            "obj" => $obj,
            "chart" => $chart,
            "chartnew" => $chart1,
            "headCountData" => $headCountData,
            "month" => $month
        );
    }