<?php

namespace EyefiDb\Api\CycleTimes;

use PDO;
use PDOException;

class CycleTimesProduction
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


    public function cycleTimesEdit()
    {

        //set to 20 or 30 
        $whatToView = 20;

        if ($whatToView == 30) {
            $nextView = 20;
        } else if ($whatToView == 20) {
            $nextView = 10;
        }

        $mainQry = "

              SELECT a.wr_part sod_part,
                            max(a.wr_desc) fullDesc
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
                            group by a.wr_part
                     ORDER BY 
                     CASE 
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
                 END ASC
                              
                     with (noLock)   
             
              ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        $cycleSql = "
                     select *
                     from eyefidb.shipping_cycle_times
              ";
        $query = $this->db1->prepare($cycleSql);
        $query->execute();
        $cycleTimes = $query->fetchAll(PDO::FETCH_ASSOC);


        foreach ($result as &$row) {
            $row['cycleTime'] = "";
            $row['comments'] = "";
            $row['updatedDate'] = "";
            $row['updatedBy'] = "";
            $row['partNumber'] = strtoupper($row['SOD_PART']);
            foreach ($cycleTimes as &$row1) {
                if ($row['partNumber'] == $row1['partNumber']) {
                    $row['cycleTime'] = $row1['cycleTime'];
                    $row['comments'] = $row1['comments'];
                    $row['updatedDate'] = $row1['updatedDate'];
                    $row['updatedBy'] = $row1['updatedBy'];
                }
            }
        }
        return $result;
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

    private function getStartAndEndDate($week, $year)
    {
        $dto = new \DateTime();
        $dto->setISODate($year, $week);
        $ret['week_start'] = $dto->format('Y-m-d');
        $dto->modify('+6 days');
        $ret['week_end'] = $dto->format('Y-m-d');
        return $ret;
    }

    //test weekly
    public function cycleTimes()
    {

        $cycleSql = "
            select *
            from eyefidb.shipping_cycle_times
        ";
        $query = $this->db1->prepare($cycleSql);
        $query->execute();
        $cycleTimes = $query->fetchAll(PDO::FETCH_ASSOC);

        $employeesSql = "
            select *
            from eyefidb.weekly_users
        ";
        $query = $this->db1->prepare($employeesSql);
        $query->execute();
        $employees = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
            SELECT * 
                        
            from (select a.wr_nbr wr_nbr
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
                , DAYOFWEEK ( wr_due ) dueByTestday
                , CONCAT(pt_desc1, pt_desc2) fullDesc
                , b.wo_status
                , b.wo_rel_date wo_rel_date
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
        $result = $query->fetchAll(PDO::FETCH_ASSOC);


        $in = $this->getWorkOrdersInArray($result);
        $commentInfo = $this->getCommentsByOrderNumbers($in);


        $ddate = date("Y-m-d", time());
        $date = new \DateTime($ddate);
        $currentWeek = $date->format("W");
        $currentYear = $date->format("Y");
        $currentInfo = $this->getStartAndEndDate((int) $currentWeek, (int) $currentYear);

        $weekColumns = array();
        $weekColumns1 = array();
        $weekColumns2 = array();
        $pastDueWeekHours = 0;
        $currentWeekHours = 0;
        $pastDueWeekHours1 = 0;
        $nowDate = date("Y-m-d");
        $dateColumns = array();

        foreach ($result as &$row) {

            $row['recent_comments'] = new \stdClass();
            foreach ($commentInfo as $rowComments) {
                if ($row['WR_NBR'] == $rowComments['orderNum']) {
                    $row['recent_comments'] = $rowComments;
                }
            }

            $date = new \DateTime($row['DUEBY']);
            $week1 = $date->format("W");
            $year = $date->format("Y");
            $row['overdue'] = 0;

            $row['WR_PART'] = strtoupper($row['WR_PART']);
            $row['dayname'] = date('l', strtotime($row['DUEBY']));

            $row['headCount'] = $this->MAXEMPLOYEES * $this->USERHOUR;
            $row['emloyees'] = $this->MAXEMPLOYEES;
            $week_array = $this->getStartAndEndDate((int) $week1, (int) $year);
            $row['weekDates'] = $week_array['week_start'] . ' thru ' .  $week_array['week_end'];
            if ($year == $currentYear) {
                $weekColumns[] = $week1 . ' - ' . $year;
            }
            $dateColumns[] = $row['DUEBY'];

            $ww = $currentWeek . ' - ' . $currentYear;
            if ($week1 . ' - ' . $year >= $ww && $year == $currentYear) {
                $weekColumns1[] = date_format(date_create($week_array['week_start']), "m/d/Y") . ' - ' . date_format(date_create($week_array['week_end']), "m/d/Y");
            }

            $row['cycleTime'] = null;
            $row['hrs'] = 0;
            $row['WEEK'] = $week1;
            $row['YEAR'] = $year;

            foreach ($cycleTimes as &$row1) {
                if ($row['WR_PART'] == $row1['partNumber']) {
                    $row['cycleTime'] = $row1['cycleTime'];
                    //$row['hrs'] = $row['WO_SO_JOB'] == 'PROTO' ? 0 : $row1['cycleTime'] * $row['QTYOPEN'];

                    $row['hrs'] = $row1['cycleTime'] * $row['QTYOPEN'];
                }
            }

            if ($week1 < $currentWeek) {
                $pastDueWeekHours = $pastDueWeekHours + $row['hrs'];
            } else if ($week1 == $currentWeek) {
                $currentWeekHours = $currentWeekHours + $row['hrs'];
            }


            if ($nowDate > $row['DUEBY']) {
                $row['overdue'] = 1;
                $pastDueWeekHours1 += $row['hrs'];
            }


            foreach ($employees as &$row3) {
                $weekDates = $row3['weekRange'];
                if ($row['DUEBY'] == $row3['date']) {
                    $row['headCount'] = $row3['employees'] * $this->USERHOUR;
                    $row['emloyees'] = $row3['employees'];
                }
            }

            $newResults[] = array(
                "due_date" => $row['DUEBY'],
                "headCount" => $row['headCount'],
                "emloyees" => $row['emloyees'],
                "day" => $row['dayname'],
                "part_number" => $row['WR_PART'],
                "work_order_number" => $row['WR_NBR'],
                "part_description" => $row['FULLDESC'],
                "week" => $row['WEEK'],
                "year" => $row['YEAR'],
                "cycle_time" => $row['cycleTime'],
                "hrs" => $row['hrs'],
                "week_range" => $row['weekDates'],
                "week_year" => $row['WEEK'] . '-' . $row['YEAR'],
                "open_qty" => $row['QTYOPEN'],
                "overdue" => $row['overdue'],
                "wo_so_job" => $row['WO_SO_JOB'],
                "recent_comments" => $row['recent_comments']
            );
        }

        $uniqueWeeklyColumns = array_values(array_unique($weekColumns, SORT_REGULAR));
        $uniqueWeekly1Columns = array_values(array_unique($weekColumns1, SORT_REGULAR));
        $uniqueDateColumns = array_values(array_unique($dateColumns, SORT_REGULAR));

        $obj = array();
        $colors = array();
        $weeklyUsers = array();
        $setEmployees = array();
        $carryOverData = array();
        $newObj = array();

        foreach ($uniqueWeeklyColumns as &$value) {
            $ww = $currentWeek . ' - ' . $currentYear;
            if ($value >= $ww) {
                $newObj[] = $value;
            }
        }

        //calculate how many days passed starting from monday
        $startOfTheWeek = date('Y-m-d', strtotime('monday this week'));

        $first = 0;
        $numberOfDaysInWeek = 5;

        $date1 = new \DateTime($startOfTheWeek);
        $date2 = new \DateTime($this->currentDate);
        $interval = $date1->diff($date2);

        $currentHour = date('H');
        $startingWorkTime = 7;
        $timeDiff = $currentHour >= $startingWorkTime ? $currentHour - $startingWorkTime : 0;

        $mm = 299.75;
        foreach ($newObj as &$value) {
            $totalEmployees = $this->MAXEMPLOYEES;
            $totalHrs = 0;
            //default
            $color = 'rgba(95, 130, 149, 1)';
            $count = 0;

            foreach ($result as &$row) {
                $date = new \DateTime($row['DUEBY']);
                $week = $date->format("W");
                $year = $date->format("Y");
                $week_array = $this->getStartAndEndDate((int) $week, (int) $year);
                $row['weekDates'] = date_format(date_create($week_array['week_start']), "m/d/Y") . ' - ' . date_format(date_create($week_array['week_end']), "m/d/Y");

                $weekDates = $week . ' - ' . $year;

                if ($value == $weekDates && $year == $currentYear) {
                    if ($week < $currentWeek) {
                        $totalHrs = $totalHrs + $row['hrs'];
                        $color = 'rgba(95, 130, 149, 1)';
                    } else if ($week == $currentWeek) {
                        $totalHrs = $totalHrs + $row['hrs'];
                        $color = 'rgb(34,139,34)';
                    } else {
                        $totalHrs = $totalHrs + $row['hrs'];
                    }
                }
            }

            $count = 0;
            $countTotal = 0;
            foreach ($employees as &$row3) {
                if ($value == $row3['weekRange']) {
                    $countTotal++;
                    $count += $row3['employees'];
                }
            }

            $t = $numberOfDaysInWeek - $countTotal;
            $totalEmployees = $count == 0 ? $this->MAXEMPLOYEES * $numberOfDaysInWeek : $count + ($t * $this->MAXEMPLOYEES);
            $totalCountOfEmployees = $totalEmployees * $this->USERHOUR / $numberOfDaysInWeek;
            if ($first == 0) {

                //- ($timeDiff * $this->MAXEMPLOYEES)
                $totalCountOfEmployees = $totalCountOfEmployees - ($this->MAXEMPLOYEES * $this->HourlyEmployee * $interval->d) -  ($timeDiff * $this->MAXEMPLOYEES);
                //$totalCountOfEmployees = 44;

                if ($totalCountOfEmployees < 0) {
                    $totalCountOfEmployees = 0;
                }
                //$totalHrs += $pastDueWeekHours;
                //$totalHrs += 375.25 - $pastDueWeekHours - $pastDueWeekHours1;
                $totalHrs = 195.40;
            }


            $obj[] = $totalHrs;
            $colors[] = $color;
            $weeklyUsers[] = $totalCountOfEmployees;
            $setEmployees[] = array("week" => $value);
            $weekDates1 = $currentWeek . ' - ' . $currentYear;
            if ($value == $weekDates1) {
                $carryOverData[] = $pastDueWeekHours1;
            } else {
                $carryOverData[] = 0;
            }
            $first++;
        }


        $new = array();
        foreach ($uniqueDateColumns as &$value) {
            $employee = $this->MAXEMPLOYEES;

            $date = new \DateTime($value);
            $week = $date->format("W");
            $year = $date->format("Y");
            $week_array = $this->getStartAndEndDate((int) $week, (int) $year);
            $row['weekDates'] = date_format(date_create($week_array['week_start']), "m/d/Y") . ' - ' . date_format(date_create($week_array['week_end']), "m/d/Y");
            $weekDates = $week . ' - ' . $year;

            foreach ($employees as &$row) {
                if ($value === $row['date']) {
                    $employee = $row['employees'];
                }
            }

            $new[] = array(
                "date" => $value,
                "employees" => $employee,
                "weekDates" => $weekDates,
                "week" => $week,
                "year" => $year
            );
        }

        return array(
            "results" => $newResults,
            "currentWeekNumber" => $currentWeek,
            "currentInfo" => $currentInfo,
            "pastDueWeekHours" => $pastDueWeekHours1,
            "currentWeekHours" => 195.40,
            "currentWeekHours1" => $currentWeekHours - $pastDueWeekHours1 + $pastDueWeekHours,
            "uniqueWeeklyColumns" => $uniqueWeeklyColumns,
            "weekColumns2" => $weekColumns2,
            "currentDate" => $this->currentDate,
            "pastDueWeekHours1" => $pastDueWeekHours1,
            "uniqueDateColumns" => $uniqueDateColumns,
            "currentHour" => $currentHour,
            "setEmployees" => $new,
            "chart" => array(
                "labels" => $uniqueWeekly1Columns,
                "datasets" => $obj,
                "colors" => $colors,
                "weeklyUsers" => $weeklyUsers,
                "carryOver" => $carryOverData
            )
        );
    }

    public function getDays()
    {
        $days = [
            "Overdue"
        ];
        for ($i = 0; $i < 5; $i++) {
            $days[] = jddayofweek($i, 1);
        }
        return $days;
    }


    public function cycleTimesDaily($dateFrom, $dateTo)
    {

        $cycleSql = "
                     select *
                     from eyefidb.shipping_cycle_times
              ";
        $query = $this->db1->prepare($cycleSql);
        $query->execute();
        $cycleTimes = $query->fetchAll(PDO::FETCH_ASSOC);

        $employeesSql = "
                     select *
                     from eyefidb.weekly_users
              ";
        $query = $this->db1->prepare($employeesSql);
        $query->execute();
        $employees = $query->fetchAll(PDO::FETCH_ASSOC);

        //set to 20 or 30 
        $whatToView = 20;

        if ($whatToView == 30) {
            $nextView = 20;
        } else if ($whatToView == 20) {
            $nextView = 10;
        }

        $mainQry = "
                     SELECT a.wr_nbr wr_nbr
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
                            , DAYOFWEEK ( wr_due ) dueByTestday
                            , CONCAT(pt_desc1, pt_desc2) fullDesc
                            , b.wo_status
                            , b.wo_rel_date wo_rel_date
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
                            and 
                            (
                                   CASE 
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
                    END between :dateFrom and :dateTo
                                   OR 
                                   CASE 
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
                    END < :currentDate
                            )
                            ORDER BY 
                            CASE 
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
                    END ASC
                     with (noLock) 
			
              ";

        $query = $this->db->prepare($mainQry);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $query->bindParam(":currentDate", $this->currentDate, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);


        $in = $this->getWorkOrdersInArray($result);
        $commentInfo = $this->getCommentsByOrderNumbers($in);

        $ddate = date("Y-m-d", time());
        $date = new \DateTime($ddate);
        $currentWeek = $date->format("W");
        $currentYear = $date->format("Y");
        $currentInfo = $this->getStartAndEndDate((int) $currentWeek, (int) $currentYear);

        $weekColumns1 = array();
        $pastDueWeekHours = 0;
        $currentWeekHours = 0;

        $dayName = $this->getDays();
        $colors = array();

        $nowDate = date("Y-m-d");
        foreach ($result as &$row) {

            $row['recent_comments'] = new \stdClass();
            foreach ($commentInfo as $rowComments) {
                if ($row['WR_NBR'] == $rowComments['orderNum']) {
                    $row['recent_comments'] = $rowComments;
                }
            }

            $date = new \DateTime($row['DUEBY']);
            $row['hrs'] = 0;
            $row['overdue'] = 0;
            $row['dayname'] = date('l', strtotime($row['DUEBY']));
            $week = $date->format("W");
            $year = $date->format("Y");
            $row['cycleTime'] = null;
            $row['headCount'] = $this->MAXEMPLOYEES * $this->HourlyEmployee;
            $row['emloyees'] = $this->MAXEMPLOYEES;

            $week_array = $this->getStartAndEndDate((int) $week, (int) $year);
            $row['weekDates'] = $week_array['week_start'] . ' thru ' .  $week_array['week_end'];

            foreach ($cycleTimes as &$row1) {
                if ($row['WR_PART'] == $row1['partNumber']) {
                    $row['cycleTime'] = $row1['cycleTime'];
                    //$row['hrs'] = $row['WO_SO_JOB'] == 'PROTO' ? 0 : $row1['cycleTime'] * $row['QTYOPEN'];  
                    $row['hrs'] = $row1['cycleTime'] * $row['QTYOPEN'];
                }
            }

            if ($nowDate > $row['DUEBY']) {
                $row['overdue'] = 1;
                $pastDueWeekHours = $pastDueWeekHours + $row['hrs'];
            } else {
                $currentWeekHours = $currentWeekHours + $row['hrs'];
            }

            foreach ($employees as &$row3) {
                $weekDates = $row3['weekRange'];
                if ($row['DUEBY'] == $row3['date']) {
                    $row['headCount'] = $row3['employees'] * $this->HourlyEmployee;
                    $row['emloyees'] = $row3['employees'];
                }
            }

            $newResults[] = array(
                "due_date" => $row['DUEBY'],
                "day" => $row['dayname'],
                "headCount" => $row['headCount'],
                "emloyees" => $row['emloyees'],
                "part_number" => $row['WR_PART'],
                "work_order_number" => $row['WR_NBR'],
                "part_description" => $row['FULLDESC'],
                "week" => $week,
                "year" => $year,
                "cycle_time" => $row['cycleTime'],
                "hrs" => $row['hrs'],
                "week_range" => $row['weekDates'],
                "week_year" => $week . '-' . $year,
                "open_qty" => $row['QTYOPEN'],
                "overdue" => $row['overdue'],
                "wo_so_job" => $row['WO_SO_JOB'],
                "recent_comments" => $row['recent_comments']
            );
        }

        $once = 0;
        $currentHour = date('H');
        $startingWorkTime = 7;
        $timeDiff = $currentHour >= $startingWorkTime ? $currentHour - $startingWorkTime : 0;

        $date_from = new \DateTime($dateFrom);
        $week_from = $date_from->format("W");

        foreach ($dayName as &$row) {
            $weekColumns1[] = $row;
            $totalHrs = $once == 0 ? $pastDueWeekHours : 0;
            $color = $once == 0 ? 'rgb(178,34,34)' : '';

            $users = $this->MAXEMPLOYEES * $this->HourlyEmployee;

            foreach ($result as &$row1) {
                $date = new \DateTime($row1['DUEBY']);
                $row1['WR_PART'] = strtoupper($row1['WR_PART']);

                //check match
                if ($row == $row1['dayname']) {

                    //set past due color 
                    //check if todays date is less than today
                    if ($nowDate == $row1['DUEBY']) {
                        if ($row1['overdue'] == 0) {
                            if ($currentHour >= 15) {
                                $users = 0;
                            } else {
                                $users = $this->MAXEMPLOYEES * $this->HourlyEmployee - ($timeDiff * $this->MAXEMPLOYEES);
                            }
                        }
                        $totalHrs += $row1['hrs'];
                        $color = 'green';
                    } else if ($nowDate < $row1['DUEBY']) {
                        $totalHrs +=  $row1['hrs'];
                        $color = 'rgba(95, 130, 149, 1)';
                    } else {
                        $color = 'rgb(178,34,34)';
                    }

                    //other than current week
                    foreach ($employees as &$row3) {

                        $weekDates = $row3['date'];
                        if ($row1['overdue'] == 0) {
                            if ($row1['DUEBY'] == $weekDates) {
                                $users = $row3['employees'] * $this->HourlyEmployee;
                            }
                        }
                    }
                }
            }

            if ($once == 0) {
                $weeklyUsers[] = null;
            } else {
                $weeklyUsers[] = $totalHrs == 0 && $week_from == $currentWeek ? null : $users;
            }

            $once++;
            $colors[] = $color;
            $obj[] = $totalHrs;
        }

        return array(
            "results" => $newResults,
            "currentWeekNumber" => $currentWeek,
            "currentInfo" => $currentInfo,
            "currentWeekHours" => $currentWeekHours,
            "pastDueWeekHours" => $pastDueWeekHours,
            "currentHour" => $currentHour,
            "chart" => array(
                "labels" => $weekColumns1,
                "datasets" => $obj,
                "colors" => $colors,
                "weeklyUsers" => $weeklyUsers,
                "carryOver" => []
            )

        );
    }
}
