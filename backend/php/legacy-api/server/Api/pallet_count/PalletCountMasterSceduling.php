<?php

namespace EyefiDb\Api\pallet_count;

use PDO;
use PDOException;

class PalletCountMasterSceduling
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


        //set to 20 or 30 
        $whatToView = 20;

        if ($whatToView == 30) {
            $nextView = 20;
        } else if ($whatToView == 20) {
            $nextView = 10;
        }

    //     $mainQry = "
    //     SELECT a.wr_part sod_part
    //     , max(pt_desc1) full_desc
    //       FROM wr_route a
          
    //       JOIN (
    //           SELECT wo_nbr
    //               , min(wo_ord_date) wo_ord_date
    //               , max(wo_so_job) wo_so_job
    //               , max(wo_rmks) wo_rmks
    //               , max(wo_status) wo_status
    //           FROM wo_mstr
    //           WHERE wo_domain = 'EYE'
    //               AND wo_status IN ('R', 'F', 'A')
    //           GROUP BY wo_nbr
    //       ) b ON b.wo_nbr = a.wr_nbr
          
    //       LEFT JOIN ( 
    //           select pt_part
    //               , max(pt_desc1) pt_desc1
    //               , max(pt_desc2) pt_desc2
    //           from pt_mstr
    //           WHERE pt_domain = 'EYE'
    //           group by pt_part
    //       ) f ON f.pt_part = a.wr_part
          
          
         
    //       WHERE a.wr_domain = 'EYE'
    //       AND a.wr_op IN (10, 20, 30)
    //       AND wr_qty_comp != a.wr_qty_ord
    //       AND wo_status != 'c'
    //       AND WR_STATUS != 'C'
    //       group by a.wr_part
    //   ORDER BY 
    //       CASE 
    //           WHEN b.wo_so_job = 'dropin' 
    //               THEN wr_due
    //           ELSE 
    //               CASE 
    //                   WHEN a.wr_op = 10
    //                       THEN 
    //                           CASE 
    //                               WHEN DAYOFWEEK ( wr_due ) IN (1)
    //                                   THEN wr_due - 4
    //                               WHEN DAYOFWEEK ( wr_due ) IN (2, 3, 4)
    //                                   THEN wr_due - 5
    //                               ELSE wr_due - 3
    //                   END 
    //                   WHEN a.wr_op = 20
    //                       THEN 
    //                       CASE 
    //                       WHEN DAYOFWEEK ( wr_due ) IN (1)
    //                           THEN wr_due - 2
    //                           WHEN DAYOFWEEK ( wr_due ) IN (2)
    //                               THEN wr_due - 3
    //                           ELSE wr_due - 1
    //                       END 
    //                   WHEN a.wr_op = 30
    //                       THEN wr_due				
    //               END 
    //       END ASC
    //   with (noLock) 
    //     ";

        $mainQry = "
            SELECT a.wo_part sod_part
                , max(CONCAT(pt_desc1, pt_desc2)) full_desc
            FROM wo_mstr a
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_desc2) pt_desc2
                from pt_mstr
                WHERE pt_domain = 'EYE'
                group by pt_part
            ) c ON c.pt_part = a.wo_part
            
            WHERE a.wo_domain = 'EYE'
                AND wo_status IN ('R', 'F', 'A')
                AND wo_status != 'c'
                
               group by a.wo_part
            order by wo_due_date ASC
            with (noLock)  
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        $cycleSql = "
                     select id
                            , partNumber
                            , palletSize
                            , palletQty
                            , pallet_size_qad
                            , qtyPer
                     from eyefidb.ws_auto
              ";
        $query = $this->db1->prepare($cycleSql);
        $query->execute();
        $cycleTimes = $query->fetchAll(PDO::FETCH_ASSOC);

        foreach ($result as &$row) {
            $row['pallet_size_qad'] = "";
            $row['palletQty'] = "";
            $row['qtyPer'] = "";
            $row['partNumber'] = $row['SOD_PART'];
            foreach ($cycleTimes as &$row1) {
                if ($row['SOD_PART'] == $row1['partNumber']) {
                    $row['pallet_size_qad'] = $row1['pallet_size_qad'];
                    $row['palletQty'] = $row1['palletQty'];
                    $row['qtyPer'] = $row1['qtyPer'];
                }
            }
        }
        return array(
            "results" => $result,
            "palletSizes" => $this->getPalletSizes()
        );
    }
    public function getPalletSizes()
    {
        $mainQry = "
                  select pod_part
                  from pod_det 
                  join po_mstr ON  po_vend  IN ('POWPAL', 'CRATER') AND po_domain = 'EYE' and po_nbr = pod_nbr
                  where po_vend IN ('POWPAL', 'CRATER')
                  AND pod_domain = 'EYE'
                  GROUP BY pod_part
                  ORDER BY pod_part ASC
                  WITH (NOLOCK)
           ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $pallets = $query->fetchAll(PDO::FETCH_ASSOC);

        $palletsSizes = array();
        foreach ($pallets as &$row) {
            $palletsSizes[] = $row['pod_part'];
        }

        return $palletsSizes;
    }

    public function update($data)
    {
        if (
            $this->user_full_name == 'Ritz Dacanay' ||
            $this->user_full_name == 'Marti Cowan' ||
            $this->user_full_name == 'Juvenal Torres' ||
            $this->user_full_name == 'Mauricio Gramillo' ||
            $this->user_full_name == 'Mike Brown'
        ) {
            $cycleSql = "
                INSERT INTO eyefidb.ws_auto (partNumber, pallet_size_qad, palletQty, qtyPer) 
                VALUES(:partNumber, :pallet_size_qad, :palletQty, :qtyPer ) ON 
                DUPLICATE KEY UPDATE partNumber=VALUES(partNumber), 
                pallet_size_qad=VALUES(pallet_size_qad), 
                palletQty=VALUES(palletQty), 
                qtyPer=VALUES(qtyPer)
            ";

            $query = $this->db1->prepare($cycleSql);
            $query->bindParam(":partNumber", $data['partNumber'], PDO::PARAM_STR);
            $query->bindParam(":pallet_size_qad", $data['pallet_size_qad'], PDO::PARAM_STR);
            $query->bindParam(":palletQty", $data['palletQty'], PDO::PARAM_INT);
            $query->bindParam(":qtyPer", $data['qtyPer'], PDO::PARAM_INT);
            $query->execute();
        } else {
            throw new PDOException("Access Denied. ", 401);
        }
    }

    public function saveWeeklyUsers($data)
    {
        if (
            $this->user_full_name == 'Ritz Dacanay' ||
            $this->user_full_name == 'Leo Noel Rajendran' ||
            $this->user_full_name == 'Ernestina Tucky' ||
            $this->user_full_name == 'Marti Cowan'
        ) {
            $cycleSql = "
                            INSERT INTO eyefidb.weekly_users (employees, weekRange, dateRange) 
                            VALUES(:employees, :weekRange, :dateRange ) ON 
                            DUPLICATE KEY UPDATE employees=VALUES(employees), 
                            weekRange=VALUES(weekRange), 
                            dateRange=VALUES(dateRange)
                     ";
            $query = $this->db1->prepare($cycleSql);
            $query->bindParam(":employees", $data['employees'], PDO::PARAM_STR);
            $query->bindParam(":weekRange", $data['weekRange'], PDO::PARAM_STR);
            $query->bindParam(":dateRange", $data['dateRange'], PDO::PARAM_STR);
            $query->execute();
        } else {
            throw new PDOException("Access Denied. ", 401);
        }
    }

    public function cycleCountPallets($data, $fieldName)
    {
        if (
            $this->user_full_name == 'Ritz Dacanay' ||
            $this->user_full_name == 'Marti Cowan' ||
            $this->user_full_name == 'Juvenal Torres' ||
            $this->user_full_name == 'Mauricio Gramillo' ||
            $this->user_full_name == 'Mike Brown' ||
            $this->user_full_name == 'Bryon Jones'
        ) {

            if ($fieldName == 'onHand') {
                $cycleSql = "
                                   INSERT INTO eyefidb.palletCount (name, onHand, lastCounted, minMax) 
                                   VALUES(:name, :onHand, :lastCounted, :minMax) ON 
                                   DUPLICATE KEY UPDATE name=VALUES(name), 
                                   onHand=VALUES(onHand), 
                                   minMax=VALUES(minMax),
                                   lastCounted=VALUES(lastCounted)
                            ";
            } else {
                $cycleSql = "
                                   INSERT INTO eyefidb.palletCount (name, onHand, minMax) 
                                   VALUES(:name, :onHand, :minMax) ON 
                                   DUPLICATE KEY UPDATE name=VALUES(name), 
                                   onHand=VALUES(onHand), 
                                   minMax=VALUES(minMax)
                            ";
            }

            $query = $this->db1->prepare($cycleSql);
            $query->bindParam(":name", $data['PT_PART'], PDO::PARAM_STR);
            $query->bindParam(":onHand", $data['onHand'], PDO::PARAM_INT);
            $query->bindParam(":minMax", $data['minMax'], PDO::PARAM_STR);

            if ($fieldName == 'onHand') {
                $query->bindParam(":lastCounted", $this->nowDateTime, PDO::PARAM_STR);
            }

            $query->execute();
        } else {
            throw new PDOException("Access Denied. ", 401);
        }
    }

    public function palletCycleCount()
    {

        $qry = "
                     select * 
                     from eyefidb.palletCount
              ";
        $query = $this->db1->prepare($qry);
        $query->execute();
        $palletCountInfo = $query->fetchAll(PDO::FETCH_ASSOC);

        $mainQry = "
                     select pt_part pt_part
                     from pt_mstr  
                     where pt_vend IN ('POWPAL', 'CRATER')
                     ORDER BY pt_part ASC
                     WITH (NOLOCK)
              ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $pallets = $query->fetchAll(PDO::FETCH_ASSOC);

        foreach ($pallets as &$row) {
            $row['onHand'] = 0;
            $row['lastCounted'] = 0;
            $row['minMax'] = '';
            foreach ($palletCountInfo as &$row1) {
                if ($row['PT_PART'] == $row1['name']) {
                    $row['onHand'] = $row1['onHand'];
                    $row['lastCounted'] = $row1['lastCounted'];
                    $row['minMax'] = $row1['minMax'];
                }
            }
        }

        return $pallets;
    }

    public function palletCount()
    {


        $ddate = $this->nowDateTime;
        $date = new \DateTime($ddate);
        $week = $date->format("W");

        $weekNumberArray = array();

        for ($x = 0; $x <= 3; $x++) {
            $weekNumberArray[] = $week;
            $week = $week + 1;
        }
        $in = "'" . implode("','", $weekNumberArray) . "'";

        function getStartAndEndDate($week, $year)
        {
            $dto = new \DateTime();
            $dto->setISODate($year, $week);
            $ret['week_start'] = $dto->format('m/d/Y');
            $dto->modify('+6 days');
            $ret['week_end'] = $dto->format('m/d/Y');
            return $ret;
        }

        $qry = "
                     select * 
                     from eyefidb.ws_auto
              ";
        $query = $this->db1->prepare($qry);
        $query->execute();
        $pallet = $query->fetchAll(PDO::FETCH_ASSOC);

        $qry = "
                     select * 
                     from eyefidb.palletCount
              ";
        $query = $this->db1->prepare($qry);
        $query->execute();
        $palletCountInfo = $query->fetchAll(PDO::FETCH_ASSOC);

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
                , a.wr_part sod_part
                , a.wr_status wr_status
                , a.wr_qty_ord qtyOpen
                , wo_ord_date wo_ord_date
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
                                            THEN wr_due - 4
                                        WHEN DAYOFWEEK ( wr_due ) IN (2, 3, 4)
                                            THEN wr_due - 5
                                        ELSE wr_due - 3
                            END 
                            WHEN a.wr_op = 20
                                THEN 
                                CASE 
                                WHEN DAYOFWEEK ( wr_due ) IN (1)
                                    THEN wr_due - 2
                                    WHEN DAYOFWEEK ( wr_due ) IN (2)
                                        THEN wr_due - 3
                                    ELSE wr_due - 1
                                END 
                            WHEN a.wr_op = 30
                                THEN wr_due				
                        END 
                END sod_due_date
                , DAYOFWEEK ( wr_due ) dueByTestday
                , CONCAT(pt_desc1, pt_desc2) fullDesc
                , b.wo_status
                , b.wo_rel_date wo_rel_date
                , REPLACE(CONCAT(a.wr_nbr,TO_CHAR(wr_op)), ' ', '') id 
                , d.lineStatus
            FROM wr_route a

            JOIN (
                SELECT wo_nbr
                    , wo_ord_date
                    , wo_so_job
                    , wo_rmks
                    , wo_status
                    , wo_rel_date
                FROM wo_mstr
                WHERE wo_domain = 'EYE'
                    AND wo_status IN ('R', 'F', 'A')
            ) b ON b.wo_nbr = a.wr_nbr
            
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_desc2) pt_desc2
                from pt_mstr
                WHERE pt_domain = 'EYE'
                group by pt_part
            ) c ON c.pt_part = a.wr_part

            left join (
                select a.wod_nbr
                    , sum(a.wod_qty_req - a.wod_qty_iss) lineStatus
                from wod_det a 
                JOIN pt_mstr c 
                    ON c.pt_part = a.wod_part
                        AND pt_domain = 'EYE'
                        AND c.pt_part_type != 'Hardware' AND c.pt_part_type != 'HDW' 
                WHERE wod_domain = 'EYE'
                        AND a.wod_qty_req > 0	
                GROUP BY a.wod_nbr
            ) d ON d.wod_nbr = a.wr_nbr
            
            WHERE a.wr_domain = 'EYE'
                AND a.wr_op IN (20)
                AND wr_qty_comp != a.wr_qty_ord
                AND wo_status != 'c'
                AND WR_STATUS != 'C'
                
            order by CASE 
                WHEN b.wo_so_job = 'dropin' 
                    THEN wr_due
                ELSE 
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
                                            WHEN DAYOFWEEK ( wr_due ) IN (2, 3, 4)
                                                THEN wr_due - 5
                                            ELSE wr_due - 3
                                END 
                                WHEN a.wr_op = 20
                                    THEN 
                                    CASE 
                                    WHEN DAYOFWEEK ( wr_due ) IN (1)
                                        THEN wr_due - 2
                                        WHEN DAYOFWEEK ( wr_due ) IN (2)
                                            THEN wr_due - 3
                                        ELSE wr_due - 1
                                    END 
                                WHEN a.wr_op = 30
                                    THEN wr_due				
                            END 
                    END
            END
            with (noLock)  
		";

        $mainQry = "
            SELECT a.wo_nbr wr_nbr
                , a.wo_part sod_part
                , a.wo_qty_ord-wo_qty_comp qtyOpen
                , wo_due_date-3 sod_due_date
                , CONCAT(pt_desc1, pt_desc2) fullDesc
            FROM wo_mstr a
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_desc2) pt_desc2
                from pt_mstr
                WHERE pt_domain = 'EYE'
                group by pt_part
            ) c ON c.pt_part = a.wo_part
            
            WHERE a.wo_domain = 'EYE'
                AND wo_status IN ('R', 'F', 'A')
                AND wo_status != 'c'
            order by wo_due_date ASC
            with (noLock)  
		";


        $query = $this->db->prepare($mainQry);
        $query->execute();
        $result = $query->fetchAll(PDO::FETCH_ASSOC);

        $weekColumns = array();
        foreach ($result as &$row) {
            $date = new \DateTime($row['SOD_DUE_DATE']);
            $row['week'] = $date->format("W");
            $row['year'] = $date->format("Y");
            $week_array = getStartAndEndDate((int) $row['week'], (int) $row['year']);
            $row['weekDates'] = $week_array['week_start'] . ' - ' .  $week_array['week_end'];

            $weekColumns[] = $row['weekDates'];

            $row['palletSizeQad'] = "";
            $row['palletQty'] = 0;
            $row['palletQtyPer'] = 0;
            $row['actualNeed'] = 0;
            foreach ($pallet as &$row1) {

                if ($row['SOD_PART'] == $row1['partNumber']) {

                    $row['palletSizeQad'] = $row1['pallet_size_qad'];
                    $row['palletQtyPer'] = $row1['qtyPer'];
                    $row['palletQty'] = $row1['palletQty'];

                    if ($row1['qtyPer'] > 0) {
                        if ($row['QTYOPEN'] > 0 && $row1['qtyPer'] > 0) {
                            $row['actualNeed'] = ceil($row['QTYOPEN'] * $row1['qtyPer']);
                        }
                    } elseif ($row1['palletQty'] > 0) {
                        $row['actualNeed'] = ceil($row['QTYOPEN'] / $row1['palletQty']);
                    }
                }
            }
        }
        $uniqueWeeklyColumns = array_values(array_unique($weekColumns, SORT_REGULAR));
        $mainQry = "
                     select pt_part pt_part,
                            cast(openPo as numeric(36,0))  open_po
                     from pt_mstr  

                     left join ( 
                            select sum(pod_qty_ord) ordered, 
                                   sum(pod_qty_rcvd) rec, 
                                   sum(pod_qty_ord-pod_qty_rcvd) openPo, 
                                   pod_part, 
                                   min(pod_due_date) minDate 
                            from pod_det 

                            join po_mstr ON  po_vend  IN ('POWPAL', 'CRATER') AND po_domain = 'EYE' and po_nbr = pod_nbr

                            join ( 
                                   select pt_part,  
                                          pt_desc1 
                                   from pt_mstr   
                                   where pt_vend IN ('POWPAL', 'CRATER')
                            ) c ON c.pt_part = pod_part   

                            WHERE pod_qty_ord != pod_qty_rcvd 
                                   and pod_domain = 'EYE' 
                            group by pod_part 
                            
                     ) a ON a.pod_part = pt_part 

                     where pt_vend IN ('POWPAL', 'CRATER')
                     ORDER BY pt_part ASC
                     WITH (NOLOCK)
              ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $pallets = $query->fetchAll(PDO::FETCH_ASSOC);

        $palletsSizes = array();
        $startingNumber = 0;
        foreach ($pallets as &$row) {
            $palletsSizes[] = $row['PT_PART'];

            $row['minMax'] = "";
            $row['ON_HAND'] = 0;
            $row['OPEN_PO'] = $row['OPEN_PO'] == "" ? 0 : $row['OPEN_PO'];
            foreach ($uniqueWeeklyColumns as &$row1) {
                $row[$row1] = 0;
            }

            foreach ($palletCountInfo as &$row3) {
                if ($row['PT_PART'] == $row3['name']) {
                    $row['minMax'] = $row3['minMax'];
                    $row['ON_HAND'] = $row3['onHand'];
                }
            }

            $row['onHand+onOrder'] = 0;
            $row['Need'] = 0;
        }

        $test = array();

        foreach ($pallets as &$row) {
            $needed = 0;

            foreach ($result as &$row2) {
                $week_array = getStartAndEndDate((int) $row2['week'], (int) $row2['year']);
                $weekDates = $week_array['week_start'] . ' - ' .  $week_array['week_end'];

                if (array_key_exists($weekDates, $row)) {
                    if ($row['PT_PART'] == $row2['palletSizeQad']) {
                        $row[$weekDates] = $row[$weekDates] + $row2['actualNeed'];
                        $needed = $needed + $row2['actualNeed'];
                    }
                }
            }
            $needCount = $needed;

            $row['onHand+onOrder'] = $row['ON_HAND'] + $row['OPEN_PO'];

            $row['Need'] = $needCount < $row['onHand+onOrder'] ? 0 : $needed - $row['onHand+onOrder'];


            $test[] = $row;
        }


        return array(
            "results" => $test,
            "palletsSizes" => $palletsSizes,
            "Weeknummer" => $weekNumberArray
        );
    }
}
