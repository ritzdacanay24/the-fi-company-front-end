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

    SELECT sum(Transaction_Amount) value
        , Cardholder_First_Name label
    FROM fs_trip_expense_transactions
    where STR_TO_DATE(Transaction_Date, '%m/%d/%Y') between :dateFrom and :dateTo
    GROUP BY Cardholder_First_Name, STR_TO_DATE(Transaction_Date, '%m/%d/%Y')
";

$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$summary = $query->fetchAll(PDO::FETCH_ASSOC);

$displayCustomers = $_GET['displayCustomers'] == "false" ||  $_GET['displayCustomers'] == 'undefined' ? "Show All" : $_GET['displayCustomers'];
$typeOfView = $_GET['typeOfView'];

$sql = "
    SELECT STR_TO_DATE(Transaction_Date, '%m/%d/%Y') sod_per_date
        , sum(Transaction_Amount) value
        , Cardholder_First_Name label
        , Cardholder_First_Name so_cust
        , 0 total_lines
    FROM fs_trip_expense_transactions
    where STR_TO_DATE(Transaction_Date, '%m/%d/%Y') between :dateFrom and :dateTo
";

$sql .= " GROUP BY STR_TO_DATE(Transaction_Date, '%m/%d/%Y'), Cardholder_First_Name ";

$query = $dbEyeFi->prepare($sql);
$query->bindParam(':dateFrom', $_GET['dateFrom'], PDO::PARAM_STR);
$query->bindParam(':dateTo', $_GET['dateTo'], PDO::PARAM_STR);
$query->execute();
$chartData = $query->fetchAll(PDO::FETCH_ASSOC);

//chart data 

 function getDynamicData($data, $weekStartDate = '2022-01-01', $weekEndDate = '2022-12-31', $typeOfView = 'Monthly', $displayCustomers = "Show All")
    {

        $results = $data;

        // $month = strtotime($weekStartDate);
        // $end = strtotime($weekEndDate);
        
$month1 = new DateTime($weekStartDate);
$end = new DateTime($weekEndDate);

$interval = DateInterval::createFromDateString('1 day');
$period = new DatePeriod($month1, $interval, $end);

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

        foreach ($period as $dt) {
            
                $month = $dt->format("Y-m-d");
                $weekday = date('D', strtotime($month)); 

                if (
                    strcasecmp($weekday, 'Sun') != 0
                    && strcasecmp($weekday, 'Sat') != 0
            ){

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
                } else if ($typeOfView == 'Monthly') {
                    $obj['label'][] = $m . '-' . $y;
                    $labelCheck = $m . '-' . $y;
                    $ee = "M";
                    $key = $m;
                } else if ($typeOfView == 'Annually') {
                    $obj['label'][] = $y;
                    $labelCheck =  $y;
                    $ee = "Y";
                    $key = $y;
                } else if ($typeOfView == 'Daily') {
                    $obj['label'][] = $d;
                    $labelCheck =  $d . '-' . $y;
                    $ee = "m/d/y";
                    $key = $d;
                } else if ($typeOfView == 'Quarterly') {
                    $obj['label'][] = "Qtr:" . $yearQuarter . '-' . $y;
                    $labelCheck =  $yearQuarter . '-' . $y;
                    $ee = "m/d/y";
                    $key = $yearQuarter . '-' . $y;
                }

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
    "chartData1" => $chartData1,
    "chartData" => $chartData
));
