<?php

namespace EyefiDb\Api\MasterControl;
use EyefiDb\Api\DailyReport\DailyReport;

use PDO;
use PDOException;

class MasterControl
{

    protected $db;

    public function __construct($dbQad, $db)
    {
        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->todayDate = date("Y-m-d");
        $this->domain = 'EYE';
    }

    public function getKanban($in)
    {
        try {
            $comments = "
                SELECT *
                FROM eyefidb.kanban_details a
                WHERE a.wo_nbr IN ($in)
            ";
            $query = $this->db1->prepare($comments);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getMiscInfoBySalesOrderNumbers($in)
    {
        try {
            $comments = "
                SELECT *
                FROM eyefidb.workOrderOwner a
                WHERE a.so IN ($in)
            ";
            $query = $this->db1->prepare($comments);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }


    public function getWedgeReworkByWorkOrders($in)
    {
        $qry = "
            SELECT a.*, concat(first, ' ', b.last) created_by_name
            FROM eyefidb.wedge_form a
            LEFT JOIN db.users b ON b.id = a.created_by
            WHERE work_order_number IN ($in)
        ";
        $stmt = $this->db1->prepare($qry);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
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

    public function formatDataStructure($details)
    {

        $in = $this->getWorkOrdersInArray($details, 'WR_NBR');
        $in1 = $this->getWorkOrdersInArray($details, 'SO');
        $commentInfo = $this->getCommentsByOrderNumbers($in);
        
        $misc_info = $this->getMiscInfoBySalesOrderNumbers($in1);
        $kanban_info = $this->getKanban($in);

        

        /**
         * Print details 
         */
        $printDetails = $this->getPrintDetails($in);
        $wedgeRework = $this->getWedgeReworkByWorkOrders($in);

        foreach ($details as &$row) {
            $row['recent_comments'] = new \stdClass();
            $row['print_details'] = new \stdClass();
            $row['wedge_rework'] = new \stdClass();
            $row['status_info'] = $this->statusClass($row['DUEBY']);
            $row['misc'] = new \stdClass();
            $row['kanban_info'] = new \stdClass();

            
            foreach ($kanban_info as $kanban_info_row) {
                if ($row['WR_NBR'] == $kanban_info_row['wo_nbr']) {
                    $row['kanban_info'] = $kanban_info_row;
                }
            }
            
            foreach ($misc_info as $misc_info_row) {
                if ($row['SO'] == $misc_info_row['so']) {
                    $row['misc'] = $misc_info_row;
                }
            }
            
            // //shiping status only for misc
            // foreach ($misc_info as $misc_info_row) {
            //     if ($row['WR_NBR'] == $misc_info_row['so']) {
            //         $row['misc'] = $misc_info_row;
            //     }
            // }
            

            foreach ($commentInfo as $rowComments) {
                if ($row['WR_NBR'] == $rowComments['orderNum']) {
                    $row['recent_comments'] = $rowComments;
                }
            }

            foreach ($printDetails as $rowPrints) {
                if ($row['WR_NBR'] == $rowPrints['workOrder']) {
                    $row['print_details'] = $rowPrints;
                }
            }

            foreach ($wedgeRework as $rowWedgeRework) {
                if ($row['WR_NBR'] == $rowWedgeRework['work_order_number']) {
                    $row['wedge_rework'] = $rowWedgeRework;
                }
            }
        }
        return $details;
    }

    public function getByRouting($routing)
    {

        try {
            $mainQry = "
                select a.wr_nbr
                    , LTRIM(RTRIM(TO_CHAR(a.wr_nbr))) || '-' || LTRIM(RTRIM(TO_CHAR(a.wr_op)))  so
                    , a.wr_op
                    , a.wr_qty_ord
                    , a.wr_qty_ord-a.wr_qty_comp openQty
                    , a.wr_qty_wip 
                    , a.wr_qty_comp
                    , wr_domain 
                    , a.wr_status
                    , a.wr_due
                    , a.wr_part
                    , a.wr_queue
                    , a.wr_qty_inque
                    , a.wr_desc
                    , a.wr_wkctr
                    , b.wo_ord_date 
                    , b.wo_so_job
                    , b.wo_rmks
                    , REPLACE(CONCAT(a.wr_nbr,TO_CHAR(a.wr_op)), ' ', '') id
                    , lineStatus
                    , CONCAT(pt_desc1, pt_desc2) fullDesc
                    , b.wo_status
                    , b.wo_qty_comp
                    , b.wo_qty_ord
                    , b.wo_rel_date
                    , a.wr_qty_inque
                    , a.wr_qty_outque
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
                from wr_route a 

                LEFT join ( 
                    select wo_nbr
                        , wo_so_job
                        , wo_rmks
                        , wo_status
                        , wo_rel_date
                        , wo_ord_date
                        , wo_due_date
                        , wo_qty_comp
                        , wo_qty_ord
                    from wo_mstr 
                    where wo_domain = 'EYE' 
                    AND wo_status IN ('R', 'F', 'A', 'E')
                ) b ON b.wo_nbr = a.wr_nbr 

                left join (
                    select a.wod_nbr
                        , sum(a.wod_qty_req - a.wod_qty_iss) lineStatus
                    from wod_det a 
                    JOIN pt_mstr c 
                        ON c.pt_part = a.wod_part
                            AND pt_domain = 'EYE'
                            AND c.pt_part_type != 'Hardware' 
                            AND c.pt_part_type != 'HDW' 
                    WHERE wod_domain = 'EYE'
                            AND a.wod_qty_req > 0	
                    GROUP BY a.wod_nbr
                ) e ON e.wod_nbr = a.wr_nbr

                LEFT JOIN ( 
                    select pt_part
                        , max(pt_desc1) pt_desc1
                        , max(pt_desc2) pt_desc2
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    group by pt_part
                ) f ON f.pt_part = a.wr_part

            where wr_status != 'c'  
                and wr_domain = 'EYE' 
                and wr_op IN ($routing)
            ";

            $mainQry .= " 
                    AND ( 
                        ( a.wr_op != 10 AND a.wr_qty_inque > 0 AND a.wr_qty_ord != a.wr_qty_comp) OR 
                        ( a.wr_op = 10 AND ( a.wr_qty_ord-a.wr_qty_comp != 0 ) ) 
                    )
                ";

            $mainQry .= " with (noLock) ";

            $query = $this->db->prepare($mainQry);
            $query->execute();
            $details = $query->fetchAll(PDO::FETCH_ASSOC);

            

            /**
             * format data
             */
            return $this->formatDataStructure($details);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

        public function routing($op, $all)
        {
        try {
            $mainQry = "
                select a.wr_nbr
                    , LTRIM(RTRIM(TO_CHAR(a.wr_nbr))) || '-' || LTRIM(RTRIM(TO_CHAR(a.wr_op)))  so
                    , a.wr_op
                    , a.wr_qty_ord
                    , a.wr_qty_ord-a.wr_qty_comp openQty
                    , a.wr_qty_wip 
                    , a.wr_qty_comp
                    , wr_domain 
                    , a.wr_status
                    , a.wr_due
                    , a.wr_part
                    , a.wr_queue
                    , a.wr_qty_inque
                    , a.wr_desc
                    , a.wr_wkctr
                    , b.wo_ord_date 
                    , b.wo_so_job
                    , b.wo_rmks
                    , REPLACE(CONCAT(a.wr_nbr,TO_CHAR(a.wr_op)), ' ', '') id
                    , lineStatus
                    , CONCAT(pt_desc1, pt_desc2) fullDesc
                    , b.wo_status
                    , b.wo_qty_comp
                    , b.wo_qty_ord
                    , b.wo_rel_date
                    , a.wr_qty_inque
                    , a.wr_qty_outque
                    , e.total_lines
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
                from wr_route a 

                LEFT join ( 
                    select wo_nbr
                        , wo_so_job
                        , wo_rmks
                        , wo_status
                        , wo_rel_date
                        , wo_ord_date
                        , wo_qty_comp
                        , wo_qty_ord
                        , wo_due_date
                    from wo_mstr 
                    where wo_domain = 'EYE' 
                    AND wo_status IN ('R', 'F', 'A', 'E')
                ) b ON b.wo_nbr = a.wr_nbr 

                left join (
                    select a.wod_nbr
                        , sum(a.wod_qty_req - a.wod_qty_iss) lineStatus
                        , count(a.wod_nbr) total_lines
                    from wod_det a 
                    JOIN pt_mstr c 
                        ON c.pt_part = a.wod_part
                            AND pt_domain = 'EYE'
                            AND c.pt_part_type != 'Hardware' 
                            AND c.pt_part_type != 'HDW' 
                    WHERE wod_domain = 'EYE'
                            AND a.wod_qty_req > 0	
                    GROUP BY a.wod_nbr
                ) e ON e.wod_nbr = a.wr_nbr

                LEFT JOIN ( 
                    select pt_part
                        , max(pt_desc1) pt_desc1
                        , max(pt_desc2) pt_desc2
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    group by pt_part
                ) f ON f.pt_part = a.wr_part

            where wr_status != 'c'  
                and wr_domain = 'EYE' 
                and wr_op IN ($op)
            ";

            if ($all == 'true') {
                $mainQry .= " 
                    AND wr_qty_ord != wr_qty_comp AND wo_status != 'c'
                ";
            } else {
                $mainQry .= " 
                    AND ( 
                        ( a.wr_op != 10 AND a.wr_qty_inque > 0 AND a.wr_qty_ord != a.wr_qty_comp) OR 
                        ( a.wr_op = 10 AND ( a.wr_qty_ord-a.wr_qty_comp != 0 ) ) 
                    )
                ";
            }

            $mainQry .= " with (noLock) ";

            $query = $this->db->prepare($mainQry);
            $query->execute();
            $details = $query->fetchAll(PDO::FETCH_ASSOC);

            

            /**
             * format data
             */
            return $this->formatDataStructure($details);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function statusClass($dueBy)
    {
        $status_class = new \stdClass();

        $status_class->status_text = "Past Due";
        $status_class->status_class = "badge badge-danger";

        if ($dueBy == $this->todayDate) {
            $status_class->status_text = "Due Today";
            $status_class->status_class = "badge badge-warning";
        } elseif ($dueBy > $this->todayDate) {
            $status_class->status_text = "Future Order";
            $status_class->status_class = "badge badge-success";
        }

        return $status_class;
    }

    public function getWorkOrdersInArray($details, $key)
    {
        $in_array = array();
        foreach ($details as $row) {
            $in_array[] = $row[$key];
        }

        return "'" . implode("','", $in_array) . "'";
    }

    public function getPrintDetails($in)
    {
        $qry = "
            SELECT a.id
                , a.assignedTo
                , a.printedDate
                , a.createdBy
                , a.workOrder
                , concat(c.first, ' ', c.last) createdByName
                , comments
            FROM eyefidb.workOrderPrintDetails a
            INNER JOIN (
                SELECT workOrder
                    , MAX(id) id
                    , MAX(date(printedDate)) printedDate
                FROM eyefidb.workOrderPrintDetails
                GROUP BY workOrder
            ) b ON a.workOrder = b.workOrder AND a.id = b.id
            LEFT JOIN db.users c ON c.id = a.createdBy
            WHERE a.workOrder IN ($in)
        ";
        $query = $this->db1->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getWoMstrByWorkOrderNumber($pickNumber)
    {
        try {
            $qry = "
                select a.wo_so_job
                    , a.wo_nbr
                    , a.wo_lot
                    , a.wo_ord_date
                    , a.wo_due_date
                    , a.wo_part
                    , a.wo_qty_ord
                    , CONCAT(c.pt_desc1,c.pt_desc2) pt_desc1
                    , a.wo_order_sheet_printed
                    , a.wo_status
                    , a.wo_rmks	
					, a.wo_line wo_line
                    , a.wo_qty_comp 
                from wo_mstr a 
                LEFT JOIN pt_mstr c 
                    ON c.pt_part = a.wo_part
                        AND pt_domain = 'EYE'
                where a.wo_domain = 'EYE' 
                    AND a.wo_nbr = :wo_nbr
                WITH (nolock)
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(":wo_nbr", $pickNumber, PDO::PARAM_STR);
            $query->execute();
            return $query->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getWorkOrderDetailByWorkOrderNumber($pickNumber)
    {
        try {
            $qry = "
                select a.wod_nbr
                    , a.wod_lot
                    , a.wod_iss_date
                    , a.wod_part
                    , a.wod_qty_req wod_qty_req
                    , a.wod_qty_pick wod_qty_pick
                    , a.wod_qty_iss wod_qty_iss
                    , a.wod_qty_all wod_qty_all
                    , a.wod_nbr
                    , CONCAT(c.pt_desc1,c.pt_desc2) pt_desc1
                    , c.pt_um
                    , c.pt_part_type
                    , d.totalAvail
                    , a.wod_qty_req - (a.wod_qty_pick+a.wod_qty_iss) short
                    , CASE 
                        WHEN a.wod_qty_req = 0
                            THEN 100
                        ELSE  (a.wod_qty_iss/NULLIF(a.wod_qty_req, 0))*100
                    END lineStatus
                    , CASE 
                        WHEN a.wod_qty_req = 0
                            THEN 'text-success'
                        WHEN (a.wod_qty_iss/NULLIF(a.wod_qty_req,0))*100 = '100'
                            THEN 'text-success'
                    END lineStatusClass
                    
                    , wod_op
                    , case when c.pt_part_type = 'Hardware' OR c.pt_part_type = 'HDW' THEN 1 ELSE 0 END isHardware
                from wod_det a 
                LEFT JOIN pt_mstr c 
                    ON c.pt_part = a.wod_part
                        AND pt_domain = 'EYE'
                LEFT JOIN (
                    select b.in_part  
                        , sum(b.in_qty_avail) totalAvail 
                        , sum(b.in_qty_all) totalAll 
                        , sum(b.in_qty_oh) totalOnHand
                    from in_mstr b  
                    GROUP BY b.in_part
                ) d ON d.in_part = a.wod_part
                
                WHERE a.wod_nbr = :pickNumber
                    AND wod_domain = 'EYE'
                    AND a.wod_qty_req > 0				
                ORDER BY a.wod_nbr ASC WITH (nolock)
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(":pickNumber", $pickNumber, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getLocations($items)
    {
        if (!isset($items)) {
            return false;
        }

        $in  = str_repeat('?,', count($items) - 1) . '?';
        $qry = "
            SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
                , a.ld_part ld_part
                , a.ld_qty_oh ld_qty_oh
                , a.ld_qty_all ld_qty_all
                , a.ld_qty_oh-a.ld_qty_all availableQty
                , a.ld_lot
                , a.ld_ref
            FROM ld_det a
            WHERE a.ld_part IN ($in)
                AND a.ld_domain = 'EYE'
                AND a.ld_qty_oh > 0 
                AND a.ld_loc NOT IN ('JIAXING', 'PCREJ', 'REJECT', 'PROTO')
            ORDER BY case when a.ld_loc = 'INTGRTD' THEN 0 END ASC 
            WITH (noLock)
        ";
        $query = $this->db->prepare($qry);
        $query->execute($items);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAllocations($items)
    {
        if (!isset($items)) {
            return false;
        }

        $in  = str_repeat('?,', count($items) - 1) . '?';
        $qry = "
            select lad_part, lad_lot, lad_pick 
            from lad_det
            where lad_dataset = 'wod_det' AND a.lad_nbr IN ($in) and lad_site = 'EYE01' 
            WITH (noLock)
        ";
        $query = $this->db->prepare($qry);
        $query->execute($items);
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getPickDetailsByWorkOrderNumber($pickNumber, $filteredSections)
    {
        $result = $this->getWorkOrderDetailByWorkOrderNumber($pickNumber);

        $inventoryItems = array();

        foreach ($result as $row) {
            $items[] = $row['wod_part'];
        }

        if (isset($items)) {
            $inventoryItems = $this->getLocations($items);
        }

        $printDetails = $this->getPrintDetails($pickNumber);

        $details = array();
        $hardware = array();
        $openWorkOrderCount = 0;
        $totalWorkOrderCount = 0;
        $completedWorkOrderCount = 0;
        $totalWorkOrderQtyRequired = 0;
        $totalWorkOrderQtyIssued = 0;

        if ($result) {
            foreach ($result as $row) {

               # if ($row['ISHARDWARE'] == 1) {
               #     $hardware[] = $row;
               # } else {

                    $totalWorkOrderQtyRequired += $row['WOD_QTY_REQ'];
                    $totalWorkOrderQtyIssued += $row['WOD_QTY_ISS'];

                    $totalWorkOrderCount++;
                    $openPicks = $row['WOD_QTY_REQ'] - $row['WOD_QTY_ISS'];

                    //show locations to pick from 
                    foreach ($inventoryItems as $row2) {
                        //only pull information if it matches part number
                        if ($row2['LD_PART'] == $row['wod_part']) {

                            // only display locations if there is open qty for picking
                            // if ($openPicks > 0) {
                            //     $row['locations'][] = $row2;
                            // }
                            $row['locations'][] = $row2;
                        }
                    }

                    if ($openPicks > 0) {
                        $openWorkOrderCount++;
                    }
                    if ($openPicks <= 0) {
                        $completedWorkOrderCount++;
                    }


                    if ($filteredSections) {

                        $myArray = explode(',', $filteredSections);

                        if (in_array("Open Picks", $myArray) && $openPicks > 0) {

                            $details[] = $row;
                        }

                        if (in_array("Completed Picks", $myArray) && $openPicks <= 0) {

                            $details[] = $row;
                        }
                    } else {

                        $details[] = $row;
                    }
               # }
            }
            $doesOrderHaveLines = true;
        } else {
            $doesOrderHaveLines = false;
        }

        if ($totalWorkOrderQtyRequired == 0) {
            $workOrderPercentComplete = 0;
        } else {
            $workOrderPercentComplete = ($totalWorkOrderQtyIssued / $totalWorkOrderQtyRequired) * 100;
        }
        return array(
            $result,
            "details" => $details,
            "filteredSections" => explode(',', $filteredSections),
            "hardware" => $hardware,
            "mainDetails" => $this->getWoMstrByWorkOrderNumber($pickNumber),
            "totalWorkOrderCount" => $totalWorkOrderCount,
            "openWorkOrderCount" => $openWorkOrderCount,
            "completedWorkOrderCount" => $completedWorkOrderCount,
            "workOrderPercentComplete" => $workOrderPercentComplete,
            "doesOrderHaveLines" => $doesOrderHaveLines,
            "printDetails" => count($printDetails) > 0 ? $printDetails[0] : new \stdClass()
        );
    }

    public function savePrinted($data)
    {
        $obj = array();

        $qry = "
            INSERT INTO eyefidb.workOrderPrintDetails(
                assignedTo
                , workOrder
                , createdBy
                , comments
                , filterSelections
            ) VALUES (
                :assignedTo
                , :workOrder
                , :createdBy
                , :comments
                , :filterSelections
            )
        ";
        $query = $this->db1->prepare($qry);
        $query->bindParam(":assignedTo", $data['assignedTo'], PDO::PARAM_STR);
        $query->bindParam(":workOrder", $data['workOrder'], PDO::PARAM_STR);
        $query->bindParam(":comments", $data['comments'], PDO::PARAM_STR);
        $query->bindParam(":createdBy", $this->sessionId, PDO::PARAM_INT);
        $query->bindParam(":filterSelections", $data['filterSelections'], PDO::PARAM_STR);
        $query->execute();
        $id = $this->db1->lastInsertId();

        if ($id) {
            $obj = array(
                'assignedTo' => $data['assignedTo'],
                'workOrder' => $data['workOrder'],
                'createdBy' => $this->sessionId,
                'printedDate' => $data['printedDate'],
                'id' => $id
            );
        }

        return $obj;
    }

    public function print($data)
    {
        $obj = array();

        $qry = "
				INSERT INTO eyefidb.workOrderPrintDetails(
					assignedTo
					, workOrder
					, createdBy
					, comments
					, filterSelections
				) VALUES (
					:assignedTo
					, :workOrder
					, :createdBy
					, :comments
					, :filterSelections
				)
			";
        $query = $this->db1->prepare($qry);
        $query->bindParam(":assignedTo", $data['assignedTo'], PDO::PARAM_STR);
        $query->bindParam(":workOrder", $data['workOrder'], PDO::PARAM_STR);
        $query->bindParam(":comments", $data['comments'], PDO::PARAM_STR);
        $query->bindParam(":createdBy", $data['createdBy'], PDO::PARAM_INT);
        $query->bindParam(":filterSelections", $data['filterSelections'], PDO::PARAM_STR);
        $query->execute();
        $id = $this->db1->lastInsertId();

        if ($id) {
            $obj = array(
                'assignedTo' => $data['assignedTo'], 'workOrder' => $data['workOrder'], 'createdBy' => $this->sessionId, 'printedDate' => $data['printedDate'], 'id' => $id
            );
        }

        return $obj;
    }

    
    public function productionOrders($operation)
    {
        

        $mainQry = "
        select sum(case when dueBy = curDate() AND wr_qty_inque > 0 AND wr_status IN ('Q', 'S', 'R', 'H') THEN 1 ELSE 0 END) today_count
        , sum(case when dueBy = curDate() AND wr_status = 'C' THEN 1 ELSE 0 END) completed_before_or_on_due_date
        , sum(case when dueBy = curDate()  AND wr_qty_inque > 0 AND wr_status IN ('Q', 'S', 'R', 'H') THEN 1 ELSE 0 END) due_today_not_completed
    from ( select wr_nbr wr_nbr
        , a.wr_qty_ord - a.wr_qty_comp openQty
        , dueBy dueBy
        , a.wr_part wr_part
        , a.wr_qty_ord
        , a.wr_qty_comp
        , op_qty_comp
        , op_tran_date
        , op_qty_comp_backflush
        , wo_status
        , wr_qty_inque
        , case when wo_status = 'C' OR a.wr_qty_ord - a.wr_qty_comp = 0 THEN 1 ELSE 0 END complete_status
        , wr_status
    from 
        ( 
            select a.wr_nbr, 
                a.wr_op, 
                a.wr_qty_ord, 
                a.wr_qty_wip,  
                a.wr_qty_comp, 
                a.wr_status, 
                a.wr_due, 
                a.wr_part, 
                a.wr_queue, 
                a.wr_qty_inque,
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
                , d.op_qty_comp
                , d.op_tran_date
                , d.op_qty_comp op_qty_comp_backflush
                , wo_status
            from wr_route a 
            left join ( 
                select wo_nbr, wo_so_job, wo_status
                , wo_due_date
                from wo_mstr 
                where wo_domain = '".$this->domain."' 
            ) b ON b.wo_nbr = a.wr_nbr 
            
            left join (
                select op_wo_nbr, sum(op_qty_comp) op_qty_comp, max(op_tran_date) op_tran_date
                from op_hist 
                where op_wo_op = :operation 
                and op_domain = '".$this->domain."'
                and op_type = 'BACKFLSH'
                group by op_wo_nbr
            ) d ON d.op_wo_nbr = a.wr_nbr 
            where  a.wr_domain = '".$this->domain."' 
                and a.wr_op = :operation1
        ) a
        ) b
        order by dueBy ASC
        WITH (nolock)  
        ";

        
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":operation", $operation, PDO::PARAM_STR);
        $query->bindParam(":operation1", $operation, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    
    public function test()
    {
        
        $mainQry = "
        select * 
        from (
            select wr_nbr 
                , wr_op 
                , wr_desc 
                , wr_wkctr 
                , wr_qty_ord 
                , wr_qty_wip 
                , wr_qty_comp 
                , wr_qty_rjct 
                , wr_status
                , wr_start 
                , wr_due 
                , wr_part 
                , wr_cmtindx 
                , wr_queue 
                , wr_qty_move 
                , wr_qty_inque
                , case when wr_qty_comp = op_qty_wip THEN 1 ELSE 0 END isCompleted
                ,  CASE  
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
                    , op_qty_wip
                    , op_qty_comp
                    , op_tran_date
                    , wo_status
                from wr_route   a
                
                join ( 
                    select wo_nbr
                        , wo_so_job
                        , wo_status
                        , wo_due_date
                    from wo_mstr 
                    where wo_domain = 'EYE' 
                    AND wo_status IN  ('C','R','A')
                ) b ON b.wo_nbr = a.wr_nbr 
                
                left join (
                    select op_wo_op
                        , op_wo_nbr
                        , sum(op_qty_comp) op_qty_comp
                        , sum(op_qty_wip) op_qty_wip
                        , max(op_tran_date) op_tran_date
                    from op_hist 
                    where  op_domain = 'EYE'
                    and op_type = 'MOVE'
                    group by op_wo_nbr, op_wo_op
                ) d ON d.op_wo_nbr = a.wr_nbr 
                    and op_wo_op = wr_op

                where wr_domain = 'EYE'  
            ) a 
            where dueBy = curDate()
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    
    
    public function getPerformance($line){

        
        $data = $this->productionOrders(10);
       

        return array(
            "results" => $data
        );
    }

    public function updateProductionOrder($post){

        $qry = "
            update production_orders
            set status = 'C'
            where work_order = :work_order 
                AND queue = :queue
        ";
        $stmt = $this->db1->prepare($qry);
        $stmt->bindParam(":work_order", $post['work_order'], PDO::PARAM_STR);
        $stmt->bindParam(":queue", $post['queue'], PDO::PARAM_STR);
        $stmt->execute();
    }

}
