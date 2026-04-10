<?php

namespace EyefiDb\Api\CycleTimes;

use PDO;
use PDOException;


class CycleTimesProduction111
{

    protected $db;
    public $user_full_name;

    public function __construct($dbQad, $db)
    {
        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDateTime = date("Y-m-d H:i:s", time());
        $this->currentDate = date("Y-m-d");

        //default values
        $this->MAXEMPLOYEES = 11;
        $this->HourlyEmployee = 8;

        $this->USERHOUR = 40;
        $this->numberOfDaysInWeek = 5;

        $ddate = date("Y-m-d", time());
        $date = new \DateTime($ddate);
        $this->currentWeek = $date->format("W");
        $this->currentYear = $date->format("Y");
    }

    public function getWorkOrdersInArray($details)
    {
        $in_array = array();
        foreach ($details as $row) {
            $in_array[] = $row['wr_nbr'];
        }

        return "'" . implode("','", $in_array) . "'";
    }

    public function getCommentsByOrderNumbers($in, $type = 'Work Order')
    {
        try {
            $comments = "
                SELECT a.orderNum
                    , comments_html comments_html
                    , comments comments
                    , a.createdDate
                    , date(a.createdDate) byDate
                    , case when date(a.createdDate) = curDate() then 'text-success' else 'text-info' end color_class_name
                    , case when date(a.createdDate) = curDate() then 'bg-success' else 'bg-info' end bg_class_name
                    , concat('SO#:', ' ', a.orderNum) comment_title
                    , concat(c.first, ' ', c.last) created_by_name
                FROM eyefidb.comments a
                INNER JOIN (
                    SELECT orderNum
                        , MAX(id) id
                        , MAX(date(createdDate)) createdDate
                    FROM eyefidb.comments
                    GROUP BY orderNum
                ) b ON a.orderNum = b.orderNum AND a.id = b.id
                LEFT JOIN db.users c ON c.id = a.userId
                WHERE a.type = :type
                    AND a.orderNum IN ($in)
                    AND a.active = 1
              ";
            $query = $this->db1->prepare($comments);
            $query->bindParam(':type', $type, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    private function getStartAndEndDate($week, $year)
    {
        $dto = new \DateTime();
        $dto->setISODate($year, $week);
        $ret['week_start'] = $dto->format('Y-m-d');
        $dto->modify('+6 days');
        $ret['week_end'] = $dto->format('Y-m-d');
        return $ret;
    }

    public function productionCycleTimes()
    {
        $cycleSql = "
            select *
            from eyefidb.shipping_cycle_times
        ";
        $query = $this->db1->prepare($cycleSql);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function productionUsers()
    {
        $employeesSql = "
            select *
            from eyefidb.weekly_users
        ";
        $query = $this->db1->prepare($employeesSql);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function productionOrders()
    {
        $mainQry = "
            SELECT wr_nbr
                , wr_op
                , wr_desc
                , wr_wkctr
                , wr_qty_ord
                , wr_qty_comp
                , wr_due
                , wr_part
                , wr_status
                , qtyOpen
                , wo_ord_date
                , dropInClass
                , wo_so_job
                , wo_rmks
                , day
                , fullDesc
                , wo_status
                , wo_rel_date
                , dueBy
                
            from (
                select a.wr_nbr wr_nbr
                    , a.wr_op wr_op
                    , a.wr_desc wr_desc
                    , a.wr_wkctr wr_wkctr
                    , a.wr_qty_ord wr_qty_ord
                    , a.wr_qty_comp wr_qty_comp
                    , a.wr_due wr_due
                    , a.wr_part wr_part
                    , a.wr_status wr_status
                    , a.wr_qty_ord-a.wr_qty_comp qtyOpen
                    , wo_ord_date wo_ord_date
                    , CASE WHEN b.wo_so_job = 'dropin' THEN 1 ELSE 0 END dropInClass
                    , b.wo_so_job wo_so_job
                    , b.wo_rmks wo_rmks
                    , DAYOFWEEK ( wr_due ) day
                    , CONCAT(pt_desc1, pt_desc2) fullDesc
                    , b.wo_status
                    , b.wo_rel_date wo_rel_date,
                CASE  
                    WHEN b.wo_so_job = 'dropin' 
                        THEN wr_due
                    ELSE 
                        CASE 
                            WHEN a.wr_op = 10
                                THEN 
                                    CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 4
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 4
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 2
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 2
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 2
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 3
                                        ELSE wr_due - 2
                            END 
                            WHEN a.wr_op = 20
                                THEN 
                                CASE 
                                        WHEN DAYOFWEEK ( wr_due ) IN (1)
                                            THEN wr_due - 3
                                            WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                THEN wr_due - 3
                                                WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                    THEN wr_due - 1
                                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                        THEN wr_due - 1
                                                        WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                            THEN wr_due - 1
                                                            WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                THEN wr_due - 1
                                                                WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                    THEN wr_due - 2
                                        ELSE wr_due - 1
                                END 
                            WHEN a.wr_op = 30
                                THEN 
                                CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 2
                                    WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                        THEN wr_due - 0
                                    WHEN DAYOFWEEK ( wr_due ) IN (4)
                                        THEN wr_due - 0
                                    ELSE wr_due - 0
                                END 	
                                else wo_due_date			
                        END 
                END dueBy 
                FROM wr_route a
        join ( 
            select wo_nbr
                , wo_so_job
                , wo_need_date
                , wo_ord_date
                , wo_rel_date
                , wo_per_date
                , wo_due_date
                , wo_rmks
                , wo_status
            from wo_mstr 
            where wo_domain = 'EYE' 
                and wo_status != 'c' 
        ) b ON b.wo_nbr = a.wr_nbr 
                
                LEFT JOIN ( 
                    select pt_part
                            , max(pt_desc1) pt_desc1
                            , max(pt_desc2) pt_desc2
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    group by pt_part
                ) c ON c.pt_part = a.wr_part
                
                WHERE a.wr_domain = 'EYE'
                    AND a.wr_op IN (20)
                    AND wr_qty_comp != a.wr_qty_ord
                    AND wo_status != 'c'
                    AND WR_STATUS != 'C'
                ) a 
            order by dueBy Asc
            with (noLock)	
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    //add cycle times 
    //add availabl times
    public function modifyProductionOrderResults()
    {

        $productionCycleTimes = $this->productionCycleTimes();
        $productionUsers = $this->productionUsers();
        $productionOrders = $this->productionOrders();

        $in = $this->getWorkOrdersInArray($productionOrders);
        $commentInfo = $this->getCommentsByOrderNumbers($in);

        foreach ($productionOrders as &$row) {
            $date = new \DateTime($row['dueby']);
            $week = $date->format("W");
            $year = $date->format("Y");

            $row['week'] = $week;
            $row['year'] = $year;
            $row['weekAndYear'] = $row['week'] . ' - ' . $row['year'];
            $week_array = $this->getStartAndEndDate((int) $row['week'], (int) $row['year']);
            $row['weekDates'] = date_format(date_create($week_array['week_start']), "m/d/Y") . ' - ' . date_format(date_create($week_array['week_end']), "m/d/Y");

            $row['cycletime'] = null;
            $row['hrs'] = 0;

            $row['headCount'] = $this->MAXEMPLOYEES;
            $row['availableHrs'] = $this->MAXEMPLOYEES * $this->HourlyEmployee;

            $row['recent_comments'] = new \stdClass();
            $row['cycle_time_info'] = new \stdClass();
            $row['is_order_overdue'] = 0;

            if ($this->currentDate > $row['dueby']) {
                $row['is_order_overdue'] = 1;
            }

            foreach ($productionCycleTimes as &$row1) {
                if ($row['wr_part'] == $row1['partnumber']) {
                    $row['cycletime'] = $row1['cycletime'];
                    $row['hrs'] = $row1['cycletime'] * $row['qtyopen'];
                    $row['cycle_time_info'] = $row1;
                }
            }

            foreach ($productionUsers as &$row3) {
                if ($row['dueby'] == $row3['date']) {
                    $row['headCount'] = $row3['employees'];
                    $row['availableHrs'] = $row3['employees'] * $this->HourlyEmployee;
                }
            }

            foreach ($commentInfo as $rowComments) {
                if ($row['wr_nbr'] == $rowComments['ordernum']) {
                    $row['recent_comments'] = $rowComments;
                }
            }
        }

        return $productionOrders;
    }

    public function availablity()
    {

        $results = $this->modifyProductionOrderResults();

        $final  = array();
        $new  = array();

        foreach ($results as $current) {
            $final[] = $current['dueby'];
        }

        $final = array_values(array_unique($final, SORT_REGULAR));

        foreach ($final as &$value) {
            $headCount = $this->MAXEMPLOYEES;
            $hrs = 0;
            $availableHrs = 0;

            $date = new \DateTime($value);
            $week = $date->format("W");
            $year = $date->format("Y");
            $week_array = $this->getStartAndEndDate((int) $week, (int) $year);
            $row['weekdates'] = date_format(date_create($week_array['week_start']), "m/d/Y") . ' - ' . date_format(date_create($week_array['week_end']), "m/d/Y");
            $weekDates = $week . ' - ' . $year;

            foreach ($results as &$row) {
                if ($value === $row['dueby']) {
                    $headCount = $row['headCount'];
                    $hrs += $row['hrs'];
                    $availableHrs = $row['headCount'] *  $this->HourlyEmployee;
                }
            }

            $disabled = false;
            if ($week <= $this->currentWeek && $year <= $this->currentYear || $value < $this->currentDate) {
                $disabled = true;
            }

            $new[] = array(
                "date" => $value,
                "disabled" => $disabled,
                "headCount" => $headCount,
                "weekDates" => $weekDates,
                "week" => $week,
                "year" => $year,
                "availableHrs" => $availableHrs,
                "openHrs" => $hrs
            );
        }

        return $new;
    }

    public function editAddCycleTimes()
    {
        $results = $this->modifyProductionOrderResults();

        $final  = array();
        $new  = array();

        foreach ($results as $current) {
            $final[] = $current['wr_part'];
        }

        $final = array_values(array_unique($final, SORT_REGULAR));

        foreach ($final as &$value) {
            $value = strtoupper($value);
            $cycle_time = null;
            $updatedDate = "";
            $updatedBy = "";
            $comments = "Estimated Time";
            $id = "";
            $desc = "";
            foreach ($results as &$row) {
                $WR_PART = strtoupper($row['wr_part']);
                if ($value == $WR_PART) {
                    $desc = $row['fulldesc'];
                    if (is_array($row['cycle_time_info'])) {
                        $cycle_time = $row['cycle_time_info']['cycletime'];
                        $updatedDate = $row['cycle_time_info']['updateddate'];
                        $updatedBy = $row['cycle_time_info']['updatedby'];
                        $comments = $row['cycle_time_info']['comments'];
                        $id = $row['cycle_time_info']['id'];
                    }
                }
            }

            $new[] = array(
                "part_number" => $value,
                "cycle_time" => $cycle_time,
                "updateddate" => $updatedDate,
                "updatedby" => $updatedBy,
                "comments" => $comments,
                "desc" => $desc,
                "id" => $id
            );
        }

        return $new;
    }

    public function allReport()
    {

        $startOfTheWeek = date('Y-m-d', strtotime('monday this week'));
        $date1 = new \DateTime($startOfTheWeek);
        $date2 = new \DateTime($this->currentDate);
        $interval = $date1->diff($date2);
        $first = 0;

        $currentHour = date('H');
        $startingWorkTime = 7;
        $timeDiff = $currentHour >= $startingWorkTime ? $currentHour - $startingWorkTime : 0;

        $productionOrders = $this->modifyProductionOrderResults();

        $weekColumns = array();
        $weekColumns1 = array();
        $overdueColumn = array();
        $overdueColumn1 = array();
        $unqiueDueDates = array();
        $unqiueDates = array();
        $colors = [];

        $currentHrs = 0;
        $totalOverDueHrs = 0;
        $carryOver = 0;

        $red = "rgb(178,34,34)";
        $green = "green";
        $blue = "rgba(95, 130, 149, 1)";
        $overdueText = "Overdue";

        foreach ($productionOrders as &$row) {

            $unqiueDueDates[$row['dueby']] = $row['headCount'];
            $unqiueDates[] = $row['dueby'];
            if ($row['week'] >= $this->currentWeek && $row['year'] >= $this->currentYear) {
                $weekColumns[] = $row['weekAndYear'];
                $weekColumns1[] = $row['weekDates'];
            } else {
                $totalOverDueHrs = $totalOverDueHrs + $row['hrs'];
                $overdueColumn1[] = $row['weekAndYear'];
            }

            if ($row['weekAndYear'] == $this->currentWeek . " - " . $this->currentYear) {
                $currentHrs += $row['hrs'];
            }
        }

        $uniqueWeeklyColumns = array_values(array_unique($weekColumns, SORT_REGULAR));
        $uniqueWeeklyColumns1 = array_values(array_unique($weekColumns1, SORT_REGULAR));
        $overdueColumn1 = array_values(array_unique($overdueColumn1, SORT_REGULAR));

        $totalHrsArray = array();
        $weeklyUsers = array();
        $test = array();
        foreach ($uniqueWeeklyColumns as &$value) {
            $totalHrs = 0;
            $availableHrs = 0;
            $availableHrsCount = 0;

            foreach ($unqiueDueDates as $key => $value1) {
                $date = new \DateTime($key);
                $week = $date->format("W");
                $year = $date->format("Y");

                $row['week'] = $week;
                $row['year'] = $year;
                $weekAndYear = $row['week'] . ' - ' . $row['year'];

                if($weekAndYear == $value){
                    $availableHrsCount += $value1 * $this->HourlyEmployee;
                }
            }

            foreach ($productionOrders as &$row) {

                if ($value == $row['weekAndYear']) {

                    $totalHrs += $row['hrs'];

                    $availableHrs = $row['headCount'] * $this->HourlyEmployee * $this->numberOfDaysInWeek;

                    //if the day is completed with open hrs, place value in overdue column
                    if ($row['dueby'] < $this->currentDate)
                        $carryOver = $totalHrs;
                }
            }

            if ($first == 0) {
                $totalHrs -= $carryOver;
                $availableHrs = $availableHrs - ($this->MAXEMPLOYEES * $this->HourlyEmployee * $interval->d) -  ($timeDiff * $this->MAXEMPLOYEES);
                $availableHrsCount = $availableHrsCount - ($this->MAXEMPLOYEES * $this->HourlyEmployee * $interval->d) -  ($timeDiff * $this->MAXEMPLOYEES);
            }

            $first++;
            $weeklyUsers[] = $availableHrs < 0 ? 0 : $availableHrs;
            $totalHrsArray[] = $totalHrs;
            $test[] = $availableHrsCount;
            $colors[] = "rgba(95, 130, 149, 1)";
        }

        //calculate overdue
        $totalHrsOverdueArray = array();
        $index = 0;

        $totalOver = $carryOver + $totalOverDueHrs;
        $hrsToComplete = $currentHrs + $totalOverDueHrs;
        $totalCurrentHrs = $currentHrs - $carryOver;

        foreach ($uniqueWeeklyColumns1 as $value) {
            $totalHrsOverdueArray[] = $index == 0 ? $totalOver : 0;
            $index++;
        }

        return array(
            "chart" => array(
                "test" => $test,
                "labelMod" => $uniqueWeeklyColumns,
                "label" => $uniqueWeeklyColumns1,
                "values" => $totalHrsArray,
                "weeklyUsers" => $weeklyUsers,
                "totalHrsOverdueArray" => $totalHrsOverdueArray,
                "colors" => $colors
            ),
            "summary" => array(
                "currentHrs" => $totalCurrentHrs,
                "overdueTotalHrs" => $totalOver,
                "hrsToComplete" => $hrsToComplete,
                "carryOver" => $carryOver
            ),
            "dateFromViewing" => $this->currentWeek . "-" . $this->currentYear,
            "results" => $productionOrders,
            "availability" => $this->availablity()
        );
    }

    public function dailyReport($dateFrom = '2022-01-17', $dateTo = '2022-01-21')
    {

        $results = $this->modifyProductionOrderResults();

        $dates = [];
        $dayNameLabel = [];

        $pastDueCount = 0;
        $dayName = $this->getDays($dateFrom, $dateTo);

        $nowDate = date("Y-m-d");
        $currentHour = date('H');
        $startingWorkTime = 7;
        $endingWorkTime = 15;
        $timeDiff = $currentHour >= $startingWorkTime ? $currentHour - $startingWorkTime : 0;

        $red = "rgb(178,34,34)";
        $green = "green";
        $blue = "rgba(95, 130, 149, 1)";
        $overdueText = "Overdue";
        $newResults = [];
        foreach ($results as $row) {
            $paymentDate = date('Y-m-d', strtotime($row['dueby']));
            $paymentDate = date('Y-m-d', strtotime($paymentDate));

            $contractDateBegin = date('Y-m-d', strtotime($dateFrom));
            $contractDateEnd = date('Y-m-d', strtotime($dateTo));

            if (($paymentDate >= $contractDateBegin) && ($paymentDate <= $contractDateEnd)) {
                $dates[] = $row['dueby'];
                $newResults[] = $row;
            } elseif ($paymentDate < $this->currentDate) {
                $newResults[] = $row;
                $pastDueCount += $row['hrs'];
            }
        }

        $dailyHrs = [];
        $colors[] = $red;
        $availability[] = null;
        $carryOverHrs = 0;
        foreach ($dayName as &$row1) {
            $dayNameLabel[] = date('D, d-M-y', strtotime($row1));
            $h = 0;
            $availableHrs = 0;

            foreach ($results as $row3) {
                if ($row1 == $row3['dueby']) {
                    $availableHrs = $row3['availableHrs'];
                    $h += $row3['hrs'];
                } else if ($row1 > $row3['dueby']) {
                    $availableHrs = $row3['availableHrs'];
                }
            }

            if ($row1 == $nowDate) {
                $color = $green;

                if ($currentHour >= $endingWorkTime) {
                    $availableHrs = null;
                } else {
                    $availableHrs = $this->MAXEMPLOYEES * $this->HourlyEmployee - ($timeDiff * $this->MAXEMPLOYEES);
                }
            } else if ($row1 < $nowDate) {
                $carryOverHrs += $h;
                $h = 0;
                $availableHrs = null;
                $color = $red;
            } else if ($row1 > $nowDate) {
                $color = $blue;
            }

            $availability[] = $availableHrs;
            $colors[] = $color;
            $dailyHrs[] = $h;
        }
        $pt = $carryOverHrs + $pastDueCount;

        array_unshift($dailyHrs, $pt);

        array_unshift($dayName, $overdueText);

        $hrsToComplete = array_sum($dailyHrs);
        $currentWeekHrs = abs($hrsToComplete - $pt);

        return array(
            "chart" => array(
                "labelm" => $dayNameLabel,
                "label" => $dayName,
                "values" => $dailyHrs,
                "weeklyUsers" => $availability,
                "colors" => $colors,
            ),
            "dateFromViewing" => $this->currentWeek . "-" . $this->currentYear,
            "summary" => array(
                "hrsToComplete" => $hrsToComplete,
                "overdueTotalHrs" => $carryOverHrs + $pastDueCount,
                "currentHrs" => $currentWeekHrs,
                "carryOverHrs" => $carryOverHrs
            ),
            "results" => $newResults

        );
    }

    function getDays($sStartDate, $sEndDate)
    {
        // Firstly, format the provided dates.  
        // This function works best with YYYY-MM-DD  
        // but other date formats will work thanks  
        // to strtotime().  
        $sStartDate = gmdate("Y-m-d", strtotime($sStartDate));
        $sEndDate = gmdate("Y-m-d", strtotime($sEndDate));

        // Start the variable off with the start date  
        $aDays[] = $sStartDate;

        // Set a 'temp' variable, sCurrentDate, with  
        // the start date - before beginning the loop  
        $sCurrentDate = $sStartDate;

        // While the current date is less than the end date  
        while ($sCurrentDate < $sEndDate) {
            // Add a day to the current date  
            $sCurrentDate = gmdate("Y-m-d", strtotime("+1 day", strtotime($sCurrentDate)));

            // Add this new day to the aDays array  
            $aDays[] = $sCurrentDate;
        }

        // Once the loop has finished, return the  
        // array of days.  
        return $aDays;
    }

    public function update($data)
    {

        $cycleSql = "
            INSERT INTO eyefidb.shipping_cycle_times (partNumber, cycleTime, updatedDate, comments, updatedBy) 
            VALUES(:partNumber, :cycleTime, :updatedDate, :comments, :updatedBy ) ON 
            DUPLICATE KEY UPDATE partNumber=VALUES(partNumber), 
            cycleTime=VALUES(cycleTime), 
            updatedDate=VALUES(updatedDate), 
            comments=VALUES(comments), 
                updatedBy=VALUES(updatedBy)
        ";
        $query = $this->db1->prepare($cycleSql);
        $query->bindParam(":cycleTime", $data['cycleTime'], PDO::PARAM_STR);
        $query->bindParam(":updatedDate", $this->nowDateTime, PDO::PARAM_STR);
        $query->bindParam(":comments", $data['comments'], PDO::PARAM_STR);
        $query->bindParam(":updatedBy", $this->user_full_name, PDO::PARAM_STR);
        $query->bindParam(":partNumber", $data['partNumber'], PDO::PARAM_STR);
        $query->execute();
    }

    public function saveWeeklyUsers($data)
    {

        $cycleSql = "
            INSERT INTO eyefidb.weekly_users (employees, date, weekRange) 
            VALUES(:employees, :date, :weekRange ) ON 
            DUPLICATE KEY UPDATE employees=VALUES(employees), 
            date=VALUES(date), 
            weekRange=VALUES(weekRange)
        ";
        $query = $this->db1->prepare($cycleSql);
        $query->bindParam(":employees", $data['headCount'], PDO::PARAM_STR);
        $query->bindParam(":date", $data['date'], PDO::PARAM_STR);
        $query->bindParam(":weekRange", $data['weekDates'], PDO::PARAM_STR);
        $query->execute();
    }

    public function runDailyReport($dateFrom, $dateTo)
    {
        return $this->dailyReport($dateFrom, $dateTo);
    }

    public function runData()
    {
        return $this->allReport();
    }
}
