<?php

namespace EyefiDb\Api\LateReasonCodes;

use PDO;
use PDOException;

class LateReasonCodes
{

    protected $db;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDateTime = date("Y-m-d H:i:s", time());
    }

    public function getData($department = '')
    {
        $mainQry = "
            select *, '0' selected
            from eyefidb.lateReasonCodes
            where active = 1
            
        ";

        if($department != ""){
            $mainQry .= " and department = '$department'";
        }

        $mainQry .= " order by name ASC ";

        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function save($data)
    {
        $mainQry = "
            INSERT INTO eyefidb.lateReasonCodes (name, department) VALUES (:name, :department)
        ";

        $department = ISSET($data['department']) ? $data['department'] : "";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':name', $data['newItem'], PDO::PARAM_STR);
        $query->bindParam(':department', $department , PDO::PARAM_STR);
        $query->execute();
        return $this->db->lastInsertId();
    }

    public function remove($data)
    {
        $mainQry = "
            UPDATE eyefidb.lateReasonCodes
            SET active = 0
            WHERE id = :id
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':id', $data['id'], PDO::PARAM_STR);
        $query->execute();
        return 1;
    }

    public function getEveryDetails($weekStartDate, $weekEndDate, $queue)
    {


        

        if($queue == 'All'){
            $mainQry = "
                SELECT date abs_shp_date , totalSum shipped_qty, n so_cust, month(date) month,
                year(date) year,
                week(date) week
                from ( select date, sum(hits) totalSum, n
                    from (
                        select date(createDate) date, n, count(*) hits
                        FROM userTrans a
                        where field = 'Late Reason Code changed' and n != ''
                        group by so, date(createDate), n
                        order by date(createDate) DESC
                    ) a 
                    group by date, n
                    order by date desc
                    ) a
                    WHERE  date between :dateFrom and :dateTo 
            ";
        }else{
            $mainQry = "

                SELECT date abs_shp_date , totalSum shipped_qty, n so_cust, month(date) month,
                        year(date) year,
                        week(date) week,
                        is_so, 
                        is_wo_10, 
                        is_wo_20,
                        is_wo_30
                from ( select date, sum(hits) totalSum, n, is_so, is_wo_10, is_wo_20, is_wo_30
                    from (
                        select date(createDate) date, n, count(*) hits
                            , (case when LOCATE('SO', so) OR LOCATE('SV', so) THEN 1 ELSE 0 END) is_so
                            , (case when LOCATE('-10', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END) is_wo_10
                            , (case when LOCATE('-20', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END) is_wo_20
                            , (case when LOCATE('-30', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END) is_wo_30
                            
                        FROM userTrans a
                        where field = 'Late Reason Code changed' and n != ''
                        group by so, date(createDate), n, LOCATE('SO', so)
                            , (case when LOCATE('-10', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END)
                            , (case when LOCATE('-20', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END)
                            , (case when LOCATE('-30', so) AND field = 'Late Reason Code changed' THEN 1 ELSE 0 END)
                        order by date(createDate) DESC

                    ) a 
                    group by date, n, is_so, is_wo_10, is_wo_20, is_wo_30
                    order by date desc

                    ) a

                    
                    WHERE  date between :dateFrom and :dateTo 
                    
                    
            ";

            if($queue == "Sales Order") $mainQry .= " AND is_so = 1";

            if($queue == "WO-10") $mainQry .= " AND is_wo_10 = 1";
            if($queue == "WO-20") $mainQry .= " AND is_wo_20 = 1";
            if($queue == "WO-30") $mainQry .= " AND is_wo_30 = 1";
        }

        
        $mainQry .= " order by totalSum DESC";


        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $weekStartDate, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $weekEndDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

	public function getDynamicData($weekStartDate = '2022-02-14', $weekEndDate = '2022-05-01', $typeOfView = 'Weekly', $displayCustomers = "Show Customers", $queue)
    {

        $results = $this->getEveryDetails($weekStartDate, $weekEndDate, $queue);

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
            "results" => $results
            // "test" => $test,
            // "total" => $chart['totalCost']
        );
    }

    public function getKpi()
    {
        $mainQry = "
            SELECT date, sum(hits) totalSum, (case when work_order_type = 'WO' THEN operation1 ELSE '' END) operation, work_order_type, n
            from (
            select date(createDate) date, so, (CASE WHEN a.so LIKE 'SO%' OR a.so LIKE 'SV%' THEN 'SO' ELSE 'WO' END) work_order_type, count(*) hits, TRIM( 
                RIGHT(
                    so, 
                    (LENGTH(so) - LOCATE('-',so)) 
                )
            ) operation1, n
                FROM userTrans a
                where field = 'Late Reason Code changed'
                group by so, date(createDate), n
                order by date(createDate) DESC
                       
            ) a 
            group by date, work_order_type,(case when work_order_type = 'WO' THEN operation1 ELSE '' END), work_order_type, n
            order by date desc
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
}
