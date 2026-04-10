<?php

namespace EyefiDb\Api\Charts;

use PDO;
use PDOException;

class Charts
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->year = isset($_GET['year']) ? $_GET['year'] : date("Y", time());
        $this->nowDateTime = date("Y-m-d h:m:s", time());
        $this->app_email_error_from = 'noreply@the-fi-company.com';
    }

    public function getWeek($week, $year)
    {
        $dto = new \DateTime();
        $result['start'] = $dto->setISODate($year, $week, 0)->format('Y-m-d');
        $result['end'] = $dto->setISODate($year, $week, 6)->format('Y-m-d');
        return $result;
    }

    public function getTotalWeeksInYear($year)
    {
        $yearTotal = $year + 1;
        for ($i = $year; $i < $yearTotal; $i++) {
            return max(date("W", strtotime($i . "-12-27")), date("W", strtotime($i . "-12-29")), date("W", strtotime($i . "-12-31")));
        }
    }

    public function getWeeks($typeOfView = 'Weeks')
    {
        $signupdate = "$this->year-01-04";

        if ($typeOfView == 'Weeks') {
            $signupweek = date("W", strtotime($signupdate));
            $year = date("Y", strtotime($signupdate));

            if(date('Y') == $year){
                $w = date('W', strtotime('sunday this week'));
            }else{
                
                $w = $this->getTotalWeeksInYear($year);
            }
            

            $data = [];
            for ($i = 0; $i <= $w; $i++) {
                $results = $this->getWeek($i, $year);

                $dateStart = date_create($results['start']);
                $dateEnd = date_create($results['end']);

                $results['dateStart'] = date_format($dateStart, "M d");
                $results['dateEnd'] = date_format($dateEnd, "M d");
                $results['week'] = $i;
                $results['data'] = 0;
                $data[] = $results;
            }

            return $data;
        } else if ($typeOfView == 'Months') {
            $date1 = strtotime($signupdate);
            $date2 = strtotime('2022-12-31');
            while ($date1 <= $date2) {
                echo date('Y-m-d', $date1) . "\n";
                $date1 = strtotime('+1 month', $date1);
            }
        }
    }

    public function externalComplaintsByWeek()
    {
        $mainQry = "
            SELECT week(createdDate) week, year(createdDate) year, count(*) value
            FROM eyefidb.qa_capaRequest 
            where type1 LIKE '%external%'
                AND year(createdDate) = :year
            group by week(createdDate), year(createdDate)
		";
        $query = $this->db1->prepare($mainQry);
        $query->bindParam(":year", $this->year, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $weeks = $this->getWeeks();

        foreach ($weeks as &$row) {
            foreach ($results as $row1) {
                if ($row['week'] == $row1['week']) {
                    $row['data'] += $row1['value'];
                }
            }
        }

        $chartData = array();
        foreach ($weeks as $row) {
            $chartData['label'][] = $row['dateStart'] . " to " . $row['dateEnd'];
            $chartData['data'][] = $row;
            $chartData['value'][] = $row['data'];
        }

        return $chartData;
    }

    public function internalComplaintsByWeek()
    {
        $mainQry = "
            SELECT week(createdDate) week, year(createdDate) year, count(*) value
            FROM eyefidb.qa_capaRequest 
            where type1 LIKE '%internal%'
                AND year(createdDate) = :year
            group by week(createdDate), year(createdDate)
		";
        $query = $this->db1->prepare($mainQry);
        $query->bindParam(":year", $this->year, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $weeks = $this->getWeeks();

        foreach ($weeks as &$row) {
            foreach ($results as $row1) {
                if ($row['week'] == $row1['week']) {
                    $row['data'] += $row1['value'];
                }
            }
        }

        $chartData = array();
        foreach ($weeks as $row) {
            $chartData['label'][] = $row['dateStart'] . " to " . $row['dateEnd'];
            $chartData['value'][] = $row['data'];
        }

        return $chartData;
    }

    //YTD
    public function externalFailureTypesByWeek()
    {
        $mainQry = "
            SELECT year(createdDate) year, count(*) value, failuretype
            FROM eyefidb.qa_capaRequest 
            where type1 LIKE '%external%'
                AND year(createdDate) = :year
            group by year(createdDate), failuretype
            ORDER BY count(*) DESC
		";
        $query = $this->db1->prepare($mainQry);
        $query->bindParam(":year", $this->year, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $weeks = $this->getWeeks();

        $chartData = array();
        foreach ($results as $row) {
            $chartData['label'][] = $row['failuretype'];
            $chartData['value'][] = $row['value'];
        }

        return $chartData;
    }

    //YTD
    public function internalFailureTypesByWeek()
    {
        $mainQry = "
            SELECT year(createdDate) year, count(*) value, failuretype
            FROM eyefidb.qa_capaRequest 
            where type1 LIKE '%internal%'
                AND year(createdDate) = :year
            group by year(createdDate), failuretype
            ORDER BY count(*) DESC
		";
        $query = $this->db1->prepare($mainQry);
        $query->bindParam(":year", $this->year, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        $weeks = $this->getWeeks();

        $chartData = array();
        foreach ($results as $row) {
            $chartData['label'][] = $row['failuretype'];
            $chartData['value'][] = $row['value'];
        }

        return $chartData;
    }

    public function getData($dateFrom, $dateTo)
    {


        $mainQry = "
            select  
                shipped_ontime,
                total_shipped,
                total_orders,
                sod_due_date sod_due_date,
                case when total_orders = 0 THEN 0 ELSE (shipped_ontime/total_orders)*100 END otd
            from ( 
                select 
                
                    SUM(case when a.sod_due_date < f.abs_shp_date  THEN 1 ELSE 0 END) shipped_late,
                    SUM(case when a.sod_due_date = f.abs_shp_date  THEN 1 ELSE 0 END) shipped_ontime,
                    SUM(case when a.sod_due_date > f.abs_shp_date THEN 1 ELSE 0 END) shipped_ahead,
                    sum(case when sod_qty_ord != abs_ship_qty THEN 1 ELSE 0 END) total_open,

                    count(f.abs_shp_date) total_shipped, 
                    count(a.sod_due_date) total_orders, 
                    MONTH(sod_due_date) month,
                    YEAR(sod_due_date) year,
                    sod_due_date sod_due_date
                from sod_det a

                left join (
                    select so_nbr	
                    from so_mstr
                    where so_domain = 'EYE'
                ) c ON c.so_nbr = a.sod_nbr

                LEFT join (
                    select abs_shipto
                        , abs_shp_date
                        , abs_item
                        , abs_line
                        , sum(abs_ship_qty) abs_ship_qty
                        , abs_inv_nbr
                        , abs_par_id
                        , abs_order
                    from abs_mstr 
                    where abs_domain = 'EYE'
                    and abs_ship_qty > 0
                    GROUP BY abs_shipto
                        , abs_shp_date
                        , abs_item
                        , abs_line
                        , abs_inv_nbr
                        , abs_par_id
                        , abs_order
                ) f ON f.abs_order = a.sod_nbr
                    AND f.abs_line = a.sod_line

                WHERE sod_domain = 'EYE' and year(sod_due_date) = :year
                group by sod_due_date
                order by sod_due_date ASC
            ) a 
            WITH (NOLOCK)
        ";


        
        $mainQry = "
        select  shipped_ontime,
        total_shipped,
        total_orders,
        sod_due_date sod_due_date,
        case when total_orders = 0 THEN 0 ELSE (shipped_ontime/total_orders)*100 END otd
        from ( 
            select sod_due_date
                , sum(case when f.abs_shp_date IS NOT NULL THEN 1 ELSE 0 END) total_shipped
                , sum(case when abs_shp_date <= sod_due_date AND abs_ship_qty = sod_qty_ord THEN 1 ELSE 0 END) shipped_ontime
                , count(*) total_orders 
            from sod_det a

            left join (
                select so_nbr	
                from so_mstr
                where so_domain = 'EYE'
            ) c ON c.so_nbr = a.sod_nbr

            LEFT join (
                select max(abs_shp_date) abs_shp_date
                    , abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_order
                from abs_mstr 
                where abs_domain = 'EYE'
                and abs_ship_qty > 0
                GROUP BY abs_line
                    , abs_order
            ) f ON f.abs_order = a.sod_nbr
                AND f.abs_line = a.sod_line

            WHERE sod_domain = 'EYE' and year(sod_due_date) = :year and sod_qty_ord > 0
            group by sod_due_date
            order by sod_due_date ASC
        ) a 
        WITH (NOLOCK)
        ";


        $query = $this->db->prepare($mainQry);
        $query->bindParam(":year", $this->year, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getData1()
    {

        $mainQry = "
            select  
                total_open_val,
                total_lines_shipped_today_val,
                total_open_val + total_lines_shipped_today_val total_val,
                sod_due_date
            from ( 
                select 
                
                    sum(case when a.sod_due_date < curDate() THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) total_open_overdue_val,
                    sum(case when a.sod_due_date = curDate() THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) total_open_due_val,
                    sum(case when a.sod_due_date > curDate() THEN sod_list_pr*(sod_qty_ord - sod_qty_ship) ELSE 0 END ) total_open_future_val,
                    sum(sod_list_pr*(sod_qty_ord - sod_qty_ship)) total_open_val,

                    sum(case when a.sod_due_date < curDate() THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) total_lines_shipped_overdue_val,
                    sum(case when a.sod_due_date = curDate() THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) total_lines_shipped_due_val, 
                    sum(case when a.sod_due_date > curDate() THEN sod_list_pr*f.abs_ship_qty ELSE 0 END ) total_lines_shipped_future_val, 
                    sum(sod_list_pr*f.abs_ship_qty) total_lines_shipped_today_val,

                    sod_due_date sod_due_date
                from sod_det a

                left join (
                    select so_nbr	
                    from so_mstr
                    where so_domain = 'EYE'
                ) c ON c.so_nbr = a.sod_nbr

                LEFT join (
                    select abs_shipto
                        , abs_shp_date
                        , abs_item
                        , abs_line
                        , sum(abs_ship_qty) abs_ship_qty
                        , abs_inv_nbr
                        , abs_par_id
                        , abs_order
                    from abs_mstr 
                    where abs_domain = 'EYE'
                    and abs_ship_qty > 0
                    GROUP BY abs_shipto
                        , abs_shp_date
                        , abs_item
                        , abs_line
                        , abs_inv_nbr
                        , abs_par_id
                        , abs_order
                ) f ON f.abs_order = a.sod_nbr
                    AND f.abs_line = a.sod_line

                WHERE sod_domain = 'EYE' and year(sod_due_date) =:year
                group by sod_due_date
                order by sod_due_date ASC
            ) a 
            WITH (NOLOCK)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":year", $this->year, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function getEveryDetails($weekStartDate, $weekEndDate)
    {


        $mainQry = "

        select  *
            from ( 
            select sum(abs_ship_qty*sod_list_pr) shipped_qty, 
                abs_shp_date,
                case when UPPER(so_cust) IN ('BALTEC', 'AMEGAM', 'INTGAM', 'ATI', 'EVIGAM') THEN UPPER(so_cust) ELSE 'Other' END so_cust, 
                month(abs_shp_date) month,
                year(abs_shp_date) year
            from sod_det a

            left join (
                select so_nbr, so_cust
                from so_mstr
                where so_domain = 'EYE'
            ) c ON c.so_nbr = a.sod_nbr

            LEFT join (
                select abs_shipto
                    , abs_shp_date
                    , abs_item
                    , abs_line
                    , sum(abs_ship_qty) abs_ship_qty
                    , abs_inv_nbr
                    , abs_par_id
                    , abs_order
                from abs_mstr 
                where abs_domain = 'EYE'
                and abs_ship_qty > 0
                GROUP BY abs_shipto
                    , abs_shp_date
                    , abs_item
                    , abs_line
                    , abs_inv_nbr
                    , abs_par_id
                    , abs_order
            ) f ON f.abs_order = a.sod_nbr
                AND f.abs_line = a.sod_line

            WHERE sod_domain = 'EYE' 
                and abs_shp_date between :dateFrom and :dateTo 
                group by abs_shp_date, case when UPPER(so_cust) IN ('BALTEC', 'AMEGAM', 'INTGAM', 'ATI', 'EVIGAM') THEN UPPER(so_cust) ELSE 'Other' END
                ) a 
            WITH (NOLOCK)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $weekStartDate, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $weekEndDate, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function insert($data)
    {

        $cycleSql = "
            INSERT INTO eyefidb.shipment_report (ship_date, shipped_value, due_date) 
            VALUES(:ship_date, :shipped_value, :due_date )
        ";
        $query = $this->db1->prepare($cycleSql);
        $query->bindParam(":ship_date", $data['ship_date'], PDO::PARAM_STR);
        $query->bindParam(":shipped_value", $data['shipped_value'], PDO::PARAM_STR);
        $query->bindParam(":due_date", $data['due_date'], PDO::PARAM_STR);
        $query->execute();
    }


    function getWorkdays($date1, $date2, $workSat = FALSE, $patron = NULL)
    {
        if (!defined('SATURDAY')) define('SATURDAY', 6);
        if (!defined('SUNDAY')) define('SUNDAY', 0);

        // Array of all public festivities
        $publicHolidays = array('01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26');
        // The Patron day (if any) is added to public festivities
        if ($patron) {
            $publicHolidays[] = $patron;
        }

        /*
         * Array of all Easter Mondays in the given interval
         */
        $yearStart = date('Y', strtotime($date1));
        $yearEnd   = date('Y', strtotime($date2));

        for ($i = $yearStart; $i <= $yearEnd; $i++) {
            $easter = date('Y-m-d', easter_date($i));
            list($y, $m, $g) = explode("-", $easter);
            $monday = mktime(0, 0, 0, date($m), date($g) + 1, date($y));
            $easterMondays[] = $monday;
        }

        $start = strtotime($date1);
        $end   = strtotime($date2);
        $workdays = 0;
        for ($i = $start; $i <= $end; $i = strtotime("+1 day", $i)) {
            $day = date("w", $i);  // 0=sun, 1=mon, ..., 6=sat
            $mmgg = date('m-d', $i);
            if (
                $day != SUNDAY &&
                !in_array($mmgg, $publicHolidays) &&
                !in_array($i, $easterMondays) &&
                !($day == SATURDAY && $workSat == FALSE)
            ) {
                $workdays++;
            }
        }

        return intval($workdays);
    }

    public function getDynamicData1($weekStartDate = '2022-01-01', $weekEndDate = '2022-12-31', $typeOfView = 'Monthly')
    {


        $results = $this->getEveryDetails($weekStartDate, $weekEndDate);

        $month = strtotime($weekStartDate);
        $end = strtotime($weekEndDate);

        $totalDays = $this->getWorkdays($weekStartDate, $weekEndDate);

        $test = array();
        $chart = array();

        $goal = 200000.00;

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

            foreach ($results as $row) {
                if ($typeOfView == 'Quarterly') {
                    $yearQuarterSet1 = date("n", strtotime($row['ABS_SHP_DATE']));
                    $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row['ABS_SHP_DATE']));
                } else if ($typeOfView == 'Annually') {
                    $formatedDate = date('Y', strtotime($row['ABS_SHP_DATE']));
                } else {
                    $formatedDate = date($ee, strtotime($row['ABS_SHP_DATE'])) . '-' . date('Y', strtotime($row['ABS_SHP_DATE']));
                }

                if ($labelCheck == $formatedDate) {
                    $test[$key] += $row['SHIPPED_QTY'];
                }
            }

            if ($test[$key] > $calculateGoal) {
                $chart['backgroundColor'][] = '#006400';
            } else {
                $chart['backgroundColor'][] = '#8FBC8F';
            }

            $chart['totalCost'][] = $test[$key];
            $chart[$key]['label'][] = $labelCheck;

            $chart['goalLine'][] = $calculateGoal;

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
            "d" => $totalDays
        );
    }

    public function getDynamicData($weekStartDate = '2022-01-01', $weekEndDate = '2022-12-31', $typeOfView = 'Monthly', $displayCustomers = "Show All")
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
                $customers[] = $row['SO_CUST'];
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
                            $yearQuarterSet1 = date("n", strtotime($row['ABS_SHP_DATE']));
                            $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row['ABS_SHP_DATE']));
                        } else if ($typeOfView == 'Annually') {
                            $formatedDate = date('Y', strtotime($row['ABS_SHP_DATE']));
                        } else {
                            $formatedDate = date($ee, strtotime($row['ABS_SHP_DATE'])) . '-' . date('Y', strtotime($row['ABS_SHP_DATE']));
                        }

                        if ($labelCheck == $formatedDate && $row['SO_CUST'] == $vendorSelectedrow) {
                            $test[$key] += $row['SHIPPED_QTY'];
                        }

                        if ($labelCheck == $formatedDate && $row['SO_CUST'] == $vendorSelectedrow) {
                            $test['test111'][$vendorSelectedrow] += $row['SHIPPED_QTY'];
                            $test['isFound'][$vendorSelectedrow] = true;
                        }
                    }
                }

                $color_index = 0;
                foreach ($uniqueCustomers as $vendorSelectedrow) {
                    $chart1[$vendorSelectedrow]['dataset'][] = $test['test111'][$vendorSelectedrow];
                    $chart1[$vendorSelectedrow]['label'] = $vendorSelectedrow;
                    $chart1[$vendorSelectedrow]['backgroundColor'] = $colors[$color_index];
                    $color_index++;
                }
                //$chart1['total']['label'] = "Total";

            
            } else {
               
                
                foreach ($results as $row) {
                    if ($typeOfView == 'Quarterly') {
                        $yearQuarterSet1 = date("n", strtotime($row['ABS_SHP_DATE']));
                        $formatedDate = ceil($yearQuarterSet1 / 3) . '-' . date('Y', strtotime($row['ABS_SHP_DATE']));
                    } elseif ($typeOfView == 'Annually') {
                        $formatedDate = date('Y', strtotime($row['ABS_SHP_DATE']));
                    } else {
                        $formatedDate = date($ee, strtotime($row['ABS_SHP_DATE'])) . '-' . date('Y', strtotime($row['ABS_SHP_DATE']));
                    }

                    if ($labelCheck == $formatedDate) {
                        $test[$key] += $row['SHIPPED_QTY'];
                    }
                }


                $chart1['nocustomer']['dataset'][] = $test[$key];
                $chart1['nocustomer']['label'] = "Total $ Shipped";
                $chart1['nocustomer']['backgroundColor'] = '#8FBC8F';
                $chart1['nocustomer']['type'] = 'bar';
            }






            // $chart['customers'][$uniqueCustomers][] = $test[$uniqueCustomers];


            // if ($test[$key] > $calculateGoal) {
            //     $chart['backgroundColor'][] = '#006400';
            //     $chart['borderColor'][] = '#006400';
            // } else {
            //     $chart['backgroundColor'][] = '#8FBC8F';
            //     $chart['borderColor'][] = '#8FBC8F';
            // }


            // $chart['totalCost'][] = $test[$key];

            //$chart1['total']['dataset'][] = $test[$key];

            //$chart[$key]['label'][] = $labelCheck;


            
            // $chart1['goalLine']['dataset'][] = $calculateGoal;
            // $chart1['goalLine']['label'] = "Goal";
            // $chart1['goalLine']['backgroundColor'] = 'red';
            // $chart1['goalLine']['type'] = 'line';





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

    public function shippedData()
    {

        $mainQry = "
            select  
                total_open_val,
                total_lines_shipped_today_val,
                total_open_val + total_lines_shipped_today_val total_val,
                abs_shp_date,
                total_lines_invoiced_val
            from ( 
                select 
                
                sum(sod_list_pr*f.abs_ship_qty) total_lines_shipped_today_val,
                    sum(sod_list_pr*(sod_qty_ord - sod_qty_ship)) total_open_val,
                    sum(CASE WHEN abs_inv_nbr != ''  then sod_list_pr*f.abs_ship_qty else 0 END) total_lines_invoiced_val,

                    abs_shp_date abs_shp_date
                from sod_det a

                left join (
                    select so_nbr	
                    from so_mstr
                    where so_domain = 'EYE'
                ) c ON c.so_nbr = a.sod_nbr

                LEFT join (
                    select abs_shipto
                        , abs_shp_date
                        , abs_item
                        , abs_line
                        , sum(abs_ship_qty) abs_ship_qty
                        , abs_inv_nbr
                        , abs_par_id
                        , abs_order
                    from abs_mstr 
                    where abs_domain = 'EYE'
                    and abs_ship_qty > 0
                    GROUP BY abs_shipto
                        , abs_shp_date
                        , abs_item
                        , abs_line
                        , abs_inv_nbr
                        , abs_par_id
                        , abs_order
                ) f ON f.abs_order = a.sod_nbr
                    AND f.abs_line = a.sod_line

                WHERE sod_domain = 'EYE' and year(abs_shp_date) =:year
                group by abs_shp_date
                order by abs_shp_date ASC
            ) a 
            WITH (NOLOCK)
        ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":year", $this->year, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function onTimeDelivery()
    {

        $results = $this->getData('2021-01-01', '2021-12-31');
        //$results1 = $this->getData1('2021-01-01', '2021-12-31');
        //$shippedResults = $this->shippedData('2021-01-01', '2021-12-31');

        $weeks = $this->getWeeks();

        $chartData = array();
        $chartData1 = array();
        $new = [];
        $average = [];

        $overall_count = 0;

        foreach ($weeks as &$row) {
            $order_count = 0;
            $otd = 0;

            $order_count1 = 0;
            $otd1 = 0;
            $otd2 = 0;
            $overallTotal = 0;

            $overall_count++;

            $contractDateBegin = date('Y-m-d', strtotime($row['start']));
            $contractDateEnd = date('Y-m-d', strtotime($row['end']));

            $shipped_ontime = 0;
            $total_orders = 0;
            foreach ($results as &$row1) {
                $paymentDate = date('Y-m-d', strtotime($row1['SOD_DUE_DATE']));
                $paymentDate = date('Y-m-d', strtotime($paymentDate));
                $overallTotal += $row1['OTD'];
                if (($paymentDate >= $contractDateBegin) && ($paymentDate <= $contractDateEnd)) {
                    $order_count++;
                    $shipped_ontime += $row1['SHIPPED_ONTIME'];
                    $total_orders += $row1['TOTAL_ORDERS'];
                }
            }


            $otdPercent = $total_orders == 0 ? 0 : ($shipped_ontime / $total_orders ) * 100;
            $new[] = array(
                "date" => $row['start'] . ' - ' . $row['end'],
                "totalOrders" => $order_count,
                "otd" => $otdPercent
            );

            $chartData['label'][] = $row['dateStart'] . " to " . $row['dateEnd'];
            $chartData['value'][] = $otdPercent;

            //open shipped value
            // foreach ($results1 as &$row1) {
            //     $paymentDate = date('Y-m-d', strtotime($row1['SOD_DUE_DATE']));
            //     $paymentDate = date('Y-m-d', strtotime($paymentDate));

            //     if (($paymentDate >= $contractDateBegin) && ($paymentDate <= $contractDateEnd)) {
            //         $order_count1++;
            //         $otd2 += $row1['TOTAL_OPEN_VAL'];
            //     }
            // }
            // $chartData1['label'][] = $row['start'] . " to " . $row['end'];
            // $chartData1['total_open'][] = $otd2;


            // //shipped value
            // $TOTAL_LINES_INVOICED_VAL = 0;
            // foreach ($shippedResults as &$row1) {
            //     $paymentDate = date('Y-m-d', strtotime($row1['ABS_SHP_DATE']));
            //     $paymentDate = date('Y-m-d', strtotime($paymentDate));

            //     if (($paymentDate >= $contractDateBegin) && ($paymentDate <= $contractDateEnd)) {
            //         $otd1 += $row1['TOTAL_LINES_SHIPPED_TODAY_VAL'];
            //         $TOTAL_LINES_INVOICED_VAL += $row1['TOTAL_LINES_INVOICED_VAL'];
            //     }
            // }
            // $chartData1['total'][] = $otd1;
            // $chartData1['total_invoiced'][] = $TOTAL_LINES_INVOICED_VAL;
        }

        $average = 0;
        $a = array_filter($chartData['value']);
        if (count($a)) {
            $average = array_sum($a) / count($a);
        }

        $c = count($weeks);
        $ff = [];
        for ($i = 0; $i < $c; $i++) {
            $ff[] = $average;
        }
        return array(
            $chartData,
            $new,
            $results,
            $chartData1,
            $ff,
            $average
        );
    }

    public function run()
    {

        return array(
            "externalComplaintsByWeek" => $this->externalComplaintsByWeek(),
            "internalComplaintsByWeek" => $this->internalComplaintsByWeek(),
            "externalFailureTypesByWeek" => $this->externalFailureTypesByWeek(),
            "internalFailureTypesByWeek" => $this->internalFailureTypesByWeek(),
            "onTimeDelivery" => $this->onTimeDelivery()[0],
            "chartDataDetails" => $this->onTimeDelivery()[2],
            "average" => 0,
            "averagePercent" => $this->onTimeDelivery()[5],
            "getWeeks" => $this->getWeeks()
        );
    }
}
