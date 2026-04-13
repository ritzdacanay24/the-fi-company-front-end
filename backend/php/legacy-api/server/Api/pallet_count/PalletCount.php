<?php

namespace EyefiDb\Api\pallet_count;

use PDO;
use PDOException;

class PalletCount
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
                            END) full_desc
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
                     
                     join (
                            select pt_part							
                                   , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                                   , max(pt_routing) pt_routing
                                   , max(pt_prod_line) pt_prod_line
                            from pt_mstr
                            where pt_domain = 'EYE'
                                   AND pt_prod_line != '014'
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
                     $this->user_full_name == 'Ernestina Tucky'
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

              $mainQry = "
                     select a.sod_due_date sod_due_date
                            , sum(a.sod_qty_ord-a.sod_qty_ship) qtyOpen
                            , a.sod_part sod_part
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
                     WHERE sod_domain = 'EYE'
                            AND sod_qty_ord != sod_qty_ship	
                            AND so_compl_date IS NULL
                            AND WEEK(a.sod_due_date) IN ($in)
                     GROUP BY a.sod_due_date, a.sod_part
                     ORDER BY a.sod_due_date ASC 
                     WITH (NOLOCK)
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

                                   // if ($row1['palletQty'] > 0) {
                                   //        $row['actualNeed'] = $row['QTYOPEN'] * $row1['palletQty'];
                                   // } else if ($row1['qtyPer'] > 0) {
                                   //        $row['actualNeed'] = ceil($row['QTYOPEN'] / $row1['qtyPer']);
                                   // }

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
