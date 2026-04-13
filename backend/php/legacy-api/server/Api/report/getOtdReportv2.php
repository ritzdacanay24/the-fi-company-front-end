<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connectEyefi = new DatabaseEyeFi();
$dbEyeFi = $db_connectEyefi->getConnection();
$dbEyeFi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);


$displayCustomers = $_GET['displayCustomers'] == "false" ||  $_GET['displayCustomers'] == 'undefined' ? "Show All" : $_GET['displayCustomers'];
$typeOfView = $_GET['typeOfView'];


$sql = "
    select customer so_cust
        , so_nbr
        , line_nbr sod_line
        , performance_date sod_per_date
        , last_shipped_on
        , qty_ordered sod_qty_ord
        , shipped_qty abs_ship_qty
        , difference diff
        , week
        , year
        , month
        , case 
            when a.performance_date-a.last_shipped_on < 0 AND a.performance_date < curDate()
            THEN 'Yes' 
            when a.last_shipped_on IS NULL
            THEN 'Yes' 
            when a.performance_date < curDate() AND a.qty_ordered != shipped_qty
            THEN 'Yes' 
            ELSE 'No' 
        END  is_late
        , shipped_partial
    from on_time_delivery a       
    where a.performance_date between :dateFrom and :dateTo   and so_nbr NOT LIKE 'FS%'

";

if($displayCustomers != "Show All"){
    $sql .= " AND customer = '$displayCustomers'";
}

$sql .= "order by customer, a.performance_date ASC";
$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$details = $query->fetchAll(PDO::FETCH_ASSOC);



$sql = "
    select *, case when total_shipped_on_time > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END value
    from 
    (
        select customer label
            , count(*) total_lines
            , sum(case 
                when a.performance_date-a.last_shipped_on < 0 AND a.performance_date < curDate()
                THEN 0
                when a.last_shipped_on IS NULL
                THEN 0
                when a.performance_date < curDate() AND a.qty_ordered != shipped_qty
                THEN 0
                ELSE 1
            END) total_shipped_on_time

        from on_time_delivery a       
        where a.performance_date between :dateFrom and :dateTo   and so_nbr NOT LIKE 'FS%'
        group by customer
    ) a

";
$sql .= " order by CONVERT(case when total_shipped_on_time > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END,UNSIGNED INTEGER) desc ";

$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$summary = $query->fetchAll(PDO::FETCH_ASSOC);

$average = 0;

$total_lines = 0;
$total_shipped_on_time = 0;

foreach($summary as $row){
    if($row['label'] == $displayCustomers && $displayCustomers !== 'Show All'){
        $average = $row['value'];
    }else{
        $total_lines +=$row['total_lines'];
        $total_shipped_on_time +=$row['total_shipped_on_time'];
    }
}

if($displayCustomers == 'Show All'){
    $average = $total_lines > 0 ? number_format($total_shipped_on_time / $total_lines * 100,2) : 0;
}


$sql = "
    select case when total_lines > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END value,
    DATE_SUB(CURDATE(), INTERVAL 4 DAY) d
    from  
    (
        select  count(*) total_lines
            , sum(
                case 
                    when a.performance_date-last_shipped_on < 0 AND a.performance_date < last_shipped_on  THEN 0
                    when last_shipped_on IS NULL THEN 0
                    when a.performance_date < last_shipped_on AND a.qty_ordered != shipped_qty THEN 0
                    ELSE 1
                END
            ) total_shipped_on_time

        from on_time_delivery a       
        where a.performance_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)   and so_nbr NOT LIKE 'FS%'
    ) a
";

$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$yesterdayInfo = $query->fetch(PDO::FETCH_ASSOC);

$sql = "
    select case when total_lines > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END value,
    DATE_SUB(CURDATE(), INTERVAL 1 DAY) d
    from 
    (
        select  count(*) total_lines
            , sum(
                case 
                    when a.performance_date-last_shipped_on < 0 AND a.performance_date < curDate()  THEN 0
                    when last_shipped_on IS NULL THEN 0
                    when a.performance_date < curDate() AND a.qty_ordered != shipped_qty THEN 0
                    ELSE 1
                END
            ) total_shipped_on_time

        from on_time_delivery a       
        where a.performance_date = DATE_SUB(CURDATE(), INTERVAL 0 DAY)  and so_nbr NOT LIKE 'FS%'
    ) a
";

$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$todayInfo = $query->fetch(PDO::FETCH_ASSOC);

$sql = "
    select *
        , case when total_shipped_on_time > 0 THEN (total_shipped_on_time/total_lines)*100 ELSE 0 END value
    from 
    (
        select customer label
            , customer so_cust
            , performance_date sod_per_date
            , count(*) total_lines
            , sum(
                case 
                    when a.performance_date-last_shipped_on < 0 AND a.performance_date < curDate()  THEN 0
                    when last_shipped_on IS NULL THEN 0
                    when a.performance_date < curDate() AND a.qty_ordered != shipped_qty THEN 0
                    ELSE 1
                END
            ) total_shipped_on_time

        from on_time_delivery a       
        where a.performance_date between :dateFrom and :dateTo and so_nbr NOT LIKE 'FS%'
        group by performance_date, customer
    ) a
    

";

if($displayCustomers != "Show All"){
    $sql .= " where label = '$displayCustomers'";
}


$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$chartData = $query->fetchAll(PDO::FETCH_ASSOC);

//chart data 

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

        $goal = 200000.00;

        if ($displayCustomers != "Show All") {
            $customers = [];
            foreach ($results as $row) {
                $customers[] = $row[$label];
            }

            $colors = ['#85144b', '#001f3f', '#3D9970', '#39CCCC', '#FF851B', '#7FDBFF'];

            $uniqueCustomers = array_values(array_unique($customers, SORT_REGULAR));
        }

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


            $calculateGoal = $goal1;

            $test[$key] = 0;
            $test1[$key] = 0;



            if ($displayCustomers != "Show All") {

                foreach ($uniqueCustomers as $vendorSelectedrow) {

                    $test['test111'][$vendorSelectedrow] = 0;
                    $test['test2222'][$vendorSelectedrow] = 0;
                    $test['isFound'][$vendorSelectedrow] = false;

                    $test['test'][$vendorSelectedrow] = array();
                    $test['count'][$vendorSelectedrow] = 0;
                    foreach ($results as $row) {

                        if ($typeOfView == 'Quarterly') {
                            $yearQuarterSet1 = date("n", strtotime($row[$KeyName]));
                            $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row[$KeyName]));
                        } else if ($typeOfView == 'Annually') {
                            $formatedDate = date('Y', strtotime($row[$KeyName]));
                        } else {
                            $formatedDate = date($ee, strtotime($row[$KeyName])) . '-' . date('Y', strtotime($row[$KeyName]));
                        }

                        if ($labelCheck == $formatedDate && $row[$label] == $vendorSelectedrow) {
                            $test[$key] += $row['total_shipped_on_time'];
                            $test1[$key] += $row['total_lines'];
                        }

                        if ($labelCheck == $formatedDate && $row[$label] == $vendorSelectedrow) {
                            $test['test111'][$vendorSelectedrow] += $row['total_shipped_on_time'];
                            $test['test2222'][$vendorSelectedrow] += $row['total_lines'];
                            $test['isFound'][$vendorSelectedrow] = true;
                        }
                    }
                }

                $color_index = 0;
                foreach ($uniqueCustomers as $vendorSelectedrow) {
                    $chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow]> 0 ? ( $test['test111'][$vendorSelectedrow]/$test['test2222'][$vendorSelectedrow]*100) : 0;
                    $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
                    //$chart1[$vendorSelectedrow]['backgroundColor'] = $colors[$color_index];
                    $color_index++;
                }
                //$chart1['total']['label'] = "Total";

            
            } else {
               
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
                        $test1[$key] += $row['total_lines'];
                    }
                }


                $chart1['nocustomer']['dataset'][] = $test[$key] > 0 ? ($test[$key]/$test1[$key])*100 : 0;
                $chart1['nocustomer']['label'] = "OTD %";
                $chart1['nocustomer']['backgroundColor'] = '#8FBC8F';
                $chart1['nocustomer']['type'] = 'bar';
            }


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
            "chartnew" => $chart1
        );
    }

    function getAverage(){

    }

$chartData1 = getDynamicData($chartData, $_GET['dateFrom'], $_GET['dateTo'], $typeOfView, $displayCustomers );

echo $db_connect->json_encode(array(
    "summary" => $summary,
    "details" => $details,
    "chartData" => $chartData1,
    "average" => $average,
    'yesterdayInfo' => $yesterdayInfo,
    'todayInfo' => $todayInfo,
    
    "goal" => 70
));
