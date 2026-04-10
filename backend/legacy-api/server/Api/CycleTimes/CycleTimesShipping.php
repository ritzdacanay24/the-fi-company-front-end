<?php

namespace EyefiDb\Api\CycleTimes;

use PDO;
use PDOException;

class CycleTimesShipping
{

    protected $db;
    public $user_full_name;

    public function __construct($dbQad, $db)
    {
        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDateTime = date("Y-m-d H:i:s", time());
    }

    public function cycleTimesEdit()
    {

        $mainQry = "
                     select a.sod_part sod_part
                            , max(CASE 
                                   WHEN b.pt_part IS NULL 
                                          THEN a.sod_desc
                                   ELSE b.fullDesc
                            END) fullDesc
                     from sod_det a

                     left join (
                            select so_nbr	
                                   , so_cust
                                   , so_ord_date
                                   , so_ship
                                   , so_bol
                                   , so_cmtindx
                                   , so_compl_date
                                   , so_shipvia
                            from so_mstr
                            where so_domain = 'EYE'
                     ) c ON c.so_nbr = a.sod_nbr
                     
                     left join (
                            select pt_part							
                                   , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                                   , max(pt_routing) pt_routing
                            from pt_mstr
                            where pt_domain = 'EYE'
                            group by pt_part		
                     ) b ON b.pt_part = a.sod_part
                            
                     WHERE sod_domain = 'EYE'
                            AND sod_qty_ord != sod_qty_ship
                            AND so_compl_date IS NULL
                     GROUP BY a.sod_part
                     ORDER BY a.sod_part ASC
                     WITH (NOLOCK)
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
            $row['partNumber'] = $row['SOD_PART'];
            foreach ($cycleTimes as &$row1) {
                if ($row['SOD_PART'] == $row1['partNumber']) {
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

    public function cycleTimes()
    {

        function getStartAndEndDate($week, $year)
        {
            $dto = new \DateTime();
            $dto->setISODate($year, $week);
            $ret['week_start'] = $dto->format('Y-m-d');
            $dto->modify('+6 days');
            $ret['week_end'] = $dto->format('Y-m-d');
            return $ret;
        }

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
                     select a.sod_due_date sod_due_date
                            , sod_nbr sod_nbr
                            , sod_line sod_line
                            , a.sod_part sod_part
                            , CASE 
                                   WHEN b.pt_part IS NULL 
                                          THEN a.sod_desc
                                   ELSE b.fullDesc
                            END fullDesc
                            , cast(a.sod_qty_ord-a.sod_qty_ship as numeric(36,0)) qtyOpen
                            , ifnull(onHand, 0) onHand
                     from sod_det a

                     left join (
                            select so_nbr	
                                   , so_cust
                                   , so_ord_date
                                   , so_ship
                                   , so_bol
                                   , so_cmtindx
                                   , so_compl_date
                                   , so_shipvia
                            from so_mstr
                            where so_domain = 'EYE'
                     ) c ON c.so_nbr = a.sod_nbr

                     
                     left join (
                            select pt_part							
                                   , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                                   , max(pt_routing) pt_routing
                            from pt_mstr
                            where pt_domain = 'EYE'
                            group by pt_part		
                     ) b ON b.pt_part = a.sod_part

                     left join (
                            select a.ld_part
                                   , sum(a.ld_qty_oh)  onHand
                            from ld_det a
                            WHERE ld_domain = 'EYE'
                                   AND a.ld_qty_oh > 0
                            group by a.ld_part
                     ) c ON c.ld_part = a.sod_part
                            
                     WHERE sod_domain = 'EYE'
                            AND sod_qty_ord != sod_qty_ship
				AND so_compl_date IS NULL
                     ORDER BY a.sod_due_date ASC
                     WITH (NOLOCK)
              ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);


        $ddate = date("Y-m-d", time());
        $date = new \DateTime($ddate);
        $currentWeek = $date->format("W");
        $currentYear = $date->format("Y");
        $currentInfo = getStartAndEndDate((int) $currentWeek, (int) $currentYear);

        $weekColumns = array();
        $weekColumns1 = array();
        $weekColumns2 = array();
        $pastDueWeekHours = 0;
        $currentWeekHours = 0;
        $MAXEMPLOYEES = 11;
        $USERHOUR = 40;

        foreach ($result as &$row) {
            $row['id'] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
            $date = new \DateTime($row['SOD_DUE_DATE']);
            $week1 = $date->format("W");
            $year = $date->format("Y");

            $week_array = getStartAndEndDate((int) $week1, (int) $year);
            $row['weekDates'] = $week_array['week_start'] . ' thru ' .  $week_array['week_end'];
            $weekColumns[] = $week1 . ' - ' . $year;

            $ww = $currentWeek . ' - ' . $currentYear;
            if ($week1 . ' - ' . $year >= $ww) {
                $weekColumns1[] = date_format(date_create($week_array['week_start']), "m/d") . ' - ' . date_format(date_create($week_array['week_end']), "m/d");
            }


            $row['cycleTime'] = null;
            $row['hrs'] = 0;
            $row['WEEK'] = $week1;
            $row['YEAR'] = $year;



            foreach ($cycleTimes as &$row1) {
                if ($row['SOD_PART'] == $row1['partNumber']) {
                    $row['cycleTime'] = $row1['cycleTime'];

                    $row['hrs'] = $row1['cycleTime'] * $row['QTYOPEN'];

                    // if ($row['QTYOPEN'] < $row['ONHAND']) {
                    //        $row['hrs'] = 0;
                    // } else if ($row['QTYOPEN'] > $row['ONHAND']) {
                    //        $row['hrs'] = $row1['cycleTime'] * ($row['QTYOPEN'] - $row['ONHAND']);
                    // } else if ($row['QTYOPEN'] = $row['ONHAND']) {
                    //        $row['hrs'] = 0;
                    // } else {
                    //        $row['hrs'] = $row1['cycleTime'] * $row['QTYOPEN'];
                    // }

                }
            }


            if ($week1 < $currentWeek) {
                $pastDueWeekHours = $pastDueWeekHours + $row['hrs'];
            } else if ($week1 == $currentWeek) {
                $currentWeekHours = $currentWeekHours + $row['hrs'];
            }

            $newResults[] = array(
                "due_date" => $row['SOD_DUE_DATE'],
                "part_number" => $row['SOD_PART'],
                "work_order_number" => $row['SOD_NBR'],
                "part_description" => $row['FULLDESC'],
                "week" => $row['WEEK'],
                "year" => $row['YEAR'],
                "cycle_time" => $row['cycleTime'],
                "hrs" => $row['hrs'],
                "week_range" => $row['weekDates'],
                "week_year" => $row['WEEK'] . '-' . $row['YEAR'],
                "open_qty" => $row['QTYOPEN'],
                "id" => $row['id']
            );
        }

        $uniqueWeeklyColumns = array_values(array_unique($weekColumns, SORT_REGULAR));
        $uniqueWeekly1Columns = array_values(array_unique($weekColumns1, SORT_REGULAR));

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

        foreach ($newObj as &$value) {
            $totalHrs = 0;
            $color = 'rgba(95, 130, 149, 1)';

            $users = $MAXEMPLOYEES * $USERHOUR;
            foreach ($result as &$row) {
                $date = new \DateTime($row['SOD_DUE_DATE']);
                $week = $date->format("W");
                $year = $date->format("Y");
                $week_array = getStartAndEndDate((int) $week, (int) $year);
                $row['weekDates'] = date_format(date_create($week_array['week_start']), "m/d") . ' - ' . date_format(date_create($week_array['week_end']), "m/d");
                $weekDates = $week . ' - ' . $year;

                if ($value == $weekDates) {

                    $totalHrs = $totalHrs + $row['hrs'];

                    if ($week < $currentWeek) {
                        $color = 'rgba(95, 130, 149, 1)';
                    } else if ($week == $currentWeek) {
                        $color = 'rgb(34,139,34)';
                    }
                }
            }

            foreach ($employees as &$row) {
                $weekDates = $row['weekRange'];
                if ($value == $weekDates) {
                    $users = $row['employees'] * $USERHOUR;
                }
            }

            $obj[] = $totalHrs;
            $colors[] = $color;
            $weeklyUsers[] = $users;
            $setEmployees[] = array("week" => $value);
            $weekDates1 = $currentWeek . ' - ' . $currentYear;
            if ($value == $weekDates1) {
                $carryOverData[] = $pastDueWeekHours;
            } else {
                $carryOverData[] = 0;
            }
        }


        foreach ($setEmployees as &$value) {
            $value['employees'] = $MAXEMPLOYEES;
            $value['weekRange'] = $value['week'];

            $ret = explode('-', $value['week']);
            $weekNumber = $ret[0];
            $yearNumber = $ret[1];

            $week_array = getStartAndEndDate((int) $weekNumber, (int) $yearNumber);
            $value['dateRange'] = date_format(date_create($week_array['week_start']), "m/d") . ' - ' . date_format(date_create($week_array['week_end']), "m/d");

            foreach ($employees as &$row) {
                $weekDates = $row['weekRange'];
                if ($value['week'] == $weekDates) {
                    $value['employees'] = $row['employees'];
                }
            }
        }

        return array(
            "results" => $newResults,
            "currentWeekNumber" => $currentWeek,
            "currentInfo" => $currentInfo,
            "pastDueWeekHours" => $pastDueWeekHours,
            "currentWeekHours" => $currentWeekHours,
            "uniqueWeeklyColumns" => $uniqueWeeklyColumns,
            "weekColumns2" => $weekColumns2,
            "setEmployees" => $setEmployees,
            "chart" => array(
                "labels" => $uniqueWeekly1Columns,
                "datasets" => $obj,
                "colors" => $colors,
                "weeklyUsers" => $weeklyUsers,
                "carryOver" => $carryOverData
            )
        );
    }
}
