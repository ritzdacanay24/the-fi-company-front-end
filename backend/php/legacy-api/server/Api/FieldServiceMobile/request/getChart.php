<?php
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Databases\DatabaseEyefi;

$db_connect = new DatabaseQad();
$db = $db_connect->getConnection();
$db->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);

$db_connectEyefi = new DatabaseEyeFi();
$dbEyeFi = $db_connectEyefi->getConnection();
$dbEyeFi->setAttribute(PDO::ATTR_CASE, PDO::CASE_LOWER);


$sql = "

    SELECT  COUNT(*) value
    , sum(case when active = 0 OR active IS NULL THEN 1 ELSE 0 end) total_cancelled
    , customer label
    FROM fs_request
    where DATE(created_date) between :dateFrom and :dateTo
    GROUP BY customer 
";

$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$summary = $query->fetchAll(PDO::FETCH_ASSOC);



$displayCustomers = $_GET['displayCustomers'] == "false" ||  $_GET['displayCustomers'] == 'undefined' ? "Show All" : $_GET['displayCustomers'];
$typeOfView = $_GET['typeOfView'];

$sql = "
SELECT DATE(created_date) sod_per_date
    , COUNT(*) value
    , sum(case when ACTIVE = 1 THEN 1 ELSE 0 end) total_shipped_on_time
    , customer label
    , customer so_cust
    , 0 total_lines
FROM fs_request
where DATE(created_date) between :dateFrom and :dateTo
";


if($displayCustomers != "Show All"){
    $sql .= " and customer = '$displayCustomers'";
}

$sql .= " GROUP BY DATE(created_date), customer ";

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
                            $test[$key] += $row['value'];
                        }

                        if ($labelCheck == $formatedDate && $row[$label] == $vendorSelectedrow) {
                            $test['test111'][$vendorSelectedrow] += $row['value'];
                            $test['isFound'][$vendorSelectedrow] = true;
                        }
                    }
                }

                $color_index = 0;
                foreach ($uniqueCustomers as $vendorSelectedrow) {
                    $chart1[$vendorSelectedrow]['dataset'][] =$test['test111'][$vendorSelectedrow];
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
                        $test1[$key] += $row['value'];
                    }
                }


                $chart1['nocustomer']['dataset'][] = $test1[$key];
                $chart1['nocustomer']['label'] = "Requests";
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
    "chartData" => $chartData1
));
