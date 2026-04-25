<?php


class CycleTimesProduction1
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
            $in_array[] = $row['WR_NBR'];
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
                , dueByTestday
                , fullDesc
                , wo_status
                , wo_rel_date
                , dueBy
                , case when dueBy < curDate() THEN 1 ELSE 0 END is_order_overdue
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
                    , DAYOFWEEK ( wr_due ) dueByTestday
                    , CONCAT(pt_desc1, pt_desc2) fullDesc
                    , b.wo_status
                    , b.wo_rel_date wo_rel_date
                    , CASE 
                        WHEN b.wo_so_job = 'dropin' 
                            THEN wr_due
                        ELSE 
                            CASE 
                                WHEN a.wr_op = 10
                                    THEN 
                                        CASE 
                                            WHEN DAYOFWEEK ( wr_due ) IN (1)
                                                THEN wr_due - 6
                                                WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                    THEN wr_due - 7
                                                    WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                        THEN wr_due - 7
                                                        WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                            THEN wr_due - 7
                                                            WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                                THEN wr_due - 7
                                                                WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                    THEN wr_due - 8
                                                                    WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                        THEN wr_due - 5
                                            ELSE wr_due - 5
                                END 
                                WHEN a.wr_op = 20
                                    THEN 
                                    CASE 
                                            WHEN DAYOFWEEK ( wr_due ) IN (1)
                                                THEN wr_due - 4
                                                WHEN DAYOFWEEK ( wr_due ) IN (2)
                                                    THEN wr_due - 5
                                                    WHEN DAYOFWEEK ( wr_due ) IN (3)
                                                        THEN wr_due - 5
                                                        WHEN DAYOFWEEK ( wr_due ) IN (4)
                                                            THEN wr_due - 5
                                                            WHEN DAYOFWEEK ( wr_due ) IN (5)
                                                                THEN wr_due - 3
                                                                WHEN DAYOFWEEK ( wr_due ) IN (6)
                                                                    THEN wr_due - 3
                                                                    WHEN DAYOFWEEK ( wr_due ) IN (7)
                                                                        THEN wr_due - 3
                                            ELSE wr_due - 3
                                    END 
                                WHEN a.wr_op = 30
                                    THEN 
                                    CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 2
                                        WHEN DAYOFWEEK ( wr_due ) IN (2, 3)
                                            THEN wr_due - 4
                                        WHEN DAYOFWEEK ( wr_due ) IN (4)
                                            THEN wr_due - 2
                                        ELSE wr_due - 2
                                    END 			
                            END 
                    END dueBy
                FROM wr_route a
                JOIN (
                    SELECT wo_nbr
                            , min(wo_ord_date) wo_ord_date
                            , max(wo_so_job) wo_so_job
                            , max(wo_rmks) wo_rmks
                            , max(wo_status) wo_status
                            , max(wo_rel_date) wo_rel_date
                    FROM wo_mstr
                    WHERE wo_domain = 'EYE'
                            AND wo_status IN ('R', 'F', 'A')
                    GROUP BY wo_nbr
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
            $date = new \DateTime($row['DUEBY']);
            $week = $date->format("W");
            $year = $date->format("Y");

            $row['week'] = $week;
            $row['year'] = $year;
            $row['weekAndYear'] = $row['week'] . ' - ' . $row['year'];
            $week_array = $this->getStartAndEndDate((int) $row['week'], (int) $row['year']);
            $row['weekDates'] = $week_array['week_start'] . ' thru ' .  $week_array['week_end'];

            $row['cycleTime'] = null;
            $row['hrs'] = 0;

            $row['headCount'] = $this->MAXEMPLOYEES;
            $row['availableHrs'] = $this->MAXEMPLOYEES * $this->HourlyEmployee;

            $row['recent_comments'] = new \stdClass();
            $row['cycle_time_info'] = new \stdClass();

            foreach ($productionCycleTimes as &$row1) {
                if ($row['WR_PART'] == $row1['partNumber']) {
                    $row['cycleTime'] = $row1['cycleTime'];
                    $row['hrs'] = $row1['cycleTime'] * $row['QTYOPEN'];
                    $row['cycle_time_info'] = $row1;
                }
            }

            foreach ($productionUsers as &$row3) {
                if ($row['DUEBY'] == $row3['date']) {
                    $row['headCount'] = $row3['employees'];
                    $row['availableHrs'] = $row3['employees'] * $this->USERHOUR;
                }
            }

            foreach ($commentInfo as $rowComments) {
                if ($row['WR_NBR'] == $rowComments['orderNum']) {
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
            $final[] = $current['DUEBY'];
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
            $row['weekDates'] = date_format(date_create($week_array['week_start']), "m/d/Y") . ' - ' . date_format(date_create($week_array['week_end']), "m/d/Y");
            $weekDates = $week . ' - ' . $year;

            foreach ($results as &$row) {
                if ($value === $row['DUEBY']) {
                    $headCount = $row['headCount'];
                    $hrs += $row['hrs'];
                    $availableHrs = $row['headCount'] *  $this->HourlyEmployee;
                }
            }

            $disabled = false;
            if ($week < $this->currentWeek || $year < $this->currentYear) {
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
            $final[] = $current['WR_PART'];
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
                $WR_PART = strtoupper($row['WR_PART']);
                if ($value == $WR_PART) {
                    $desc = $row['FULLDESC'];
                    if (is_array($row['cycle_time_info'])) {
                        $cycle_time = $row['cycle_time_info']['cycleTime'];
                        $updatedDate = $row['cycle_time_info']['updatedDate'];
                        $updatedBy = $row['cycle_time_info']['updatedBy'];
                        $comments = $row['cycle_time_info']['comments'];
                        $id = $row['cycle_time_info']['id'];
                    }
                }
            }

            $new[] = array(
                "part_number" => $value,
                "cycle_time" => $cycle_time,
                "updatedDate" => $updatedDate,
                "updatedBy" => $updatedBy,
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

        $currentHrs = 0;
        $totalOverDueHrs = 0;
        foreach ($productionOrders as &$row) {

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
        foreach ($uniqueWeeklyColumns as &$value) {
            $totalHrs = 0;
            $availableHrs = 0;
            foreach ($productionOrders as &$row) {
                if ($value == $row['weekAndYear']) {
                    $totalHrs += $row['hrs'];
                    $availableHrs = $row['headCount'] * $this->HourlyEmployee * $this->numberOfDaysInWeek;
                }
            }

            if ($first == 0) {
                $availableHrs = $availableHrs - ($this->MAXEMPLOYEES * $this->HourlyEmployee * $interval->d) -  ($timeDiff * $this->MAXEMPLOYEES);
            }

            $first++;
            $weeklyUsers[] = $availableHrs < 0 ? 0 : $availableHrs;
            $totalHrsArray[] = $totalHrs;
        }

        //calculate overdue
        $totalHrsOverdueArray = array();
        $index = 0;

        foreach ($uniqueWeeklyColumns1 as $value) {
            $totalHrsOverdueArray[] = $index == 0 ? $totalOverDueHrs : 0;
            $index++;
        }

        return array(
            "chart" => array(
                "label" => $uniqueWeeklyColumns,
                "labelMod" => $uniqueWeeklyColumns1,
                "values" => $totalHrsArray,
                "weeklyUsers" => $weeklyUsers,
                "totalHrsOverdueArray" => $totalHrsOverdueArray,
            ),
            "summary" => array(
                "currentHrs" => $currentHrs,
                "overdueTotalHrs" => $totalOverDueHrs,
                "hrsToComplete" => $currentHrs + $totalOverDueHrs
            ),
            "dateFromViewing" => $this->currentWeek . "-" . $this->currentYear,
            "results" => $productionOrders
        );
    }

    public function dailyReport($dateFrom = '2022-01-17', $dateTo = '2022-01-21')
    {

        $results = $this->modifyProductionOrderResults();

        $dates = [];

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
            $paymentDate = date('Y-m-d', strtotime($row['DUEBY']));
            $paymentDate = date('Y-m-d', strtotime($paymentDate));

            $contractDateBegin = date('Y-m-d', strtotime($dateFrom));
            $contractDateEnd = date('Y-m-d', strtotime($dateTo));

            if (($paymentDate >= $contractDateBegin) && ($paymentDate <= $contractDateEnd)) {
                $dates[] = $row['DUEBY'];
                $newResults[] = $row;
            } elseif ($paymentDate < $this->currentDate) {
                $pastDueCount += $row['hrs'];
            }
        }

        $dailyHrs[] = $pastDueCount;
        $colors[] = $red;
        $availability[] = null;

        foreach ($dayName as &$row1) {
            $h = 0;
            $availableHrs = 0;

            foreach ($results as $row3) {
                if ($row1 == $row3['DUEBY']) {
                    $availableHrs = $row3['availableHrs'];
                    $h += $row3['hrs'];
                } else if ($row1 > $row3['DUEBY']) {
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
                $availableHrs = null;
                $color = $red;
            } else if ($row1 > $nowDate) {
                $color = $blue;
            }

            $availability[] = $availableHrs;
            $colors[] = $color;
            $dailyHrs[] = $h;
        }

        array_unshift($dayName, $overdueText);

        $hrsToComplete = array_sum($dailyHrs);
        $currentWeekHrs = abs($hrsToComplete - $pastDueCount);

        return array(
            "chart" => array(
                "labels" => $dayName,
                "datasets" => $dailyHrs,
                "availability" => $availability,
                "colors" => $colors,
            ),
            "dateFromViewing" => $dateFrom,
            "dateToViewing" => $dateTo,
            "summary" => array(
                "hrsToComplete" => $hrsToComplete,
                "overdueHrs" => $pastDueCount,
                "currentWeekHrs" => $currentWeekHrs
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
        $query->bindParam(":employees", $data['employees'], PDO::PARAM_STR);
        $query->bindParam(":date", $data['date'], PDO::PARAM_STR);
        $query->bindParam(":weekRange", $data['weekDates'], PDO::PARAM_STR);
        $query->execute();
    }

    public function runDailyReport()
    {
        return $this->dailyReport();
    }

    public function runData()
    {
        return $this->allReport();
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$productionInstance = new CycleTimesProduction1($dbQad, $db);
$productionInstance->nowDate = date("Y-m-d H:i:s", time());

if (isset($_GET['getProductionCycleTimes'])) {
    $results = $productionInstance->runData();
}

echo $db_connect->json_encode($results);
