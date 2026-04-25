<?php

class unfinishedForkliftInspections
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db1 = $db;
        $this->dbQad = $dbQad;
    }

    public function getEveryDetails($weekStartDate, $weekEndDate)
    {


        $mainQry = "

        SELECT date abs_shp_date , totalSum shipped_qty, n so_cust, month(date) month,
                year(date) year
from ( select date, sum(hits) totalSum, n
      from (
        select date(createDate) date, n, count(*) hits
        FROM userTrans a
        where field = 'Late Reason Code changed'
        group by so, date(createDate), n
        order by date(createDate) DESC

      ) a 
      group by date, n
      order by date desc

     ) a

     
     WHERE  date between :dateFrom and :dateTo 
        ";

        $query = $this->db1->prepare($mainQry);
        $query->bindParam(":dateFrom", $weekStartDate, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $weekEndDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

	public function getDynamicData($weekStartDate = '2022-01-01', $weekEndDate = '2022-12-31', $typeOfView = 'Monthly', $displayCustomers = "Show Customers")
    {

        $results = $this->getEveryDetails($weekStartDate, $weekEndDate);

        $month = strtotime($weekStartDate);
        $end = strtotime($weekEndDate);


        $test = array();
        $chart = array();
        $chart1 = array();

        $goal = 200000.00;

        if ($displayCustomers == "Show Customers") {
            $customers = [];
            foreach ($results as $row) {
                $customers[] = $row['so_cust'];
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



            if ($displayCustomers == "Show Customers") {

                foreach ($uniqueCustomers as $vendorSelectedrow) {

                    $test['test111'][$vendorSelectedrow] = 0;
                    $test['isFound'][$vendorSelectedrow] = false;

                    $test['test'][$vendorSelectedrow] = array();
                    $test['count'][$vendorSelectedrow] = 0;
                    foreach ($results as $row) {

                        if ($typeOfView == 'Quarterly') {
                            $yearQuarterSet1 = date("n", strtotime($row['abs_shp_date']));
                            $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row['abs_shp_date']));
                        } else if ($typeOfView == 'Annually') {
                            $formatedDate = date('Y', strtotime($row['abs_shp_date']));
                        } else {
                            $formatedDate = date($ee, strtotime($row['abs_shp_date'])) . '-' . date('Y', strtotime($row['abs_shp_date']));
                        }

                        if ($labelCheck == $formatedDate && $row['so_cust'] == $vendorSelectedrow) {
                            $test[$key] += $row['shipped_qty'];
                        }

                        if ($labelCheck == $formatedDate && $row['so_cust'] == $vendorSelectedrow) {
                            $test['test111'][$vendorSelectedrow] += $row['shipped_qty'];
                            $test['isFound'][$vendorSelectedrow] = true;
                        }
                    }
                }

                $color_index = 0;
                foreach ($uniqueCustomers as $vendorSelectedrow) {
                    $chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow];
                    $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
                    $color_index++;
                }
                //$chart1['total']['label'] = "Total";

            
            } else {
               
                
                foreach ($results as $row) {
                    if ($typeOfView == 'Quarterly') {
                        $yearQuarterSet1 = date("n", strtotime($row['abs_shp_date']));
                        $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row['abs_shp_date']));
                    } elseif ($typeOfView == 'Annually') {
                        $formatedDate = date('Y', strtotime($row['abs_shp_date']));
                    } else {
                        $formatedDate = date($ee, strtotime($row['abs_shp_date'])) . '-' . date('Y', strtotime($row['abs_shp_date']));
                    }

                    if ($labelCheck == $formatedDate) {
                        $test[$key] += $row['shipped_qty'];
                    }
                }


                $chart1['nocustomer']['dataset'][] = $test[$key];
                $chart1['nocustomer']['label'] = "Total $ Shipped";
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
            "chartnew" => $chart1,
            // "test" => $test,
            // "total" => $chart['totalCost']
        );
    }
}


use EyefiDb\Databases\DatabaseQad;

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;


$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();


$data = new unfinishedForkliftInspections($db, $dbQad);
$r = $data->getDynamicData();

echo $db_connect->json_encode($r);
