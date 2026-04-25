<?php

class GraphicsDemands
{

    protected $db;

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->todayDate = date("Y-m-d", time());
        $this->nowDate1 = date("Y-m-d H:i:s", time());
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

    public function getById($id)
    {
        $qry = "
            SELECT *
            FROM eyefidb.graphicsDemand a
            where id = :id
        ";
        $query = $this->db1->prepare($qry);
        $query->bindParam(":id", $id, PDO::PARAM_INT);
        $query->execute();
        return $query->fetch();
    }

    public function getMaxStatusFromGraphicsScheduleByWorkOrderNumber($woNumber)
    {
        $graphics = "
            SELECT graphicsWorkOrder
                , max(c.name) status
            FROM eyefidb.graphicsSchedule a
            LEFT JOIN eyefidb.graphicsQueues c
                ON c.queueStatus = a.status
            WHERE a.active = 1
                AND graphicsWorkOrder = :graphicsWorkOrder
            GROUP BY graphicsWorkOrder
        ";
        $query = $this->db1->prepare($graphics);
        $query->bindParam(':graphicsWorkOrder', $woNumber, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch();
    }

    public function getGraphicsScheduleInfoByPoAndItemNumber($poNumber, $itemNumber)
    {
        $graphics = "
            SELECT purchaseOrder
                , itemNumber
                , graphicsWorkOrder
                , graphicsSalesOrder
                , max(c.name) status
            FROM eyefidb.graphicsSchedule a
            LEFT JOIN eyefidb.graphicsQueues c
                ON c.queueStatus = a.status
            WHERE active = 1
                AND purchaseOrder = :purchaseOrder
                AND customerPartNumber = :itemNumber
            GROUP BY purchaseOrder
                , itemNumber
                , graphicsWorkOrder
                , graphicsSalesOrder
        ";
        $query = $this->db1->prepare($graphics);
        $query->bindParam(':purchaseOrder', $poNumber, PDO::PARAM_STR);
        $query->bindParam(':itemNumber', $itemNumber, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch();
    }

    

    public function getComments()
    {
        $comments = "
            SELECT a.orderNum
                , CASE WHEN a.comments_html != '' THEN comments_html ELSE comments END comments
                , date(a.createdDate) createdDate
            FROM eyefidb.comments a
            INNER JOIN (
                SELECT orderNum, MAX(id) id
                FROM eyefidb.comments
                GROUP BY orderNum
            ) b ON a.orderNum = b.orderNum AND a.id = b.id
            WHERE type = 'Graphics Demand'
        ";
        $query = $this->db1->prepare($comments);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }


    public function getGraphicsDemandStatusInfo()
    {
        $qry = "
            SELECT a.so 
                , a.line
                , a.id
                , a.part
                , a.uniqueId
                , a.poNumber
                , a.active
                , case when a.woNumber != '' THEN c.graphicsWorkOrder else b.graphicsWorkOrder END graphicsWorkOrderNumber
                , b.graphicsSalesOrder
                , case when a.woNumber != '' THEN c.status ELSE b.status END graphicsStatus
                , b.graphicsWorkOrder
                , concat(usr.first, ' ', usr.last) createdBy
                , woNumber
            FROM eyefidb.graphicsDemand a
            LEFT JOIN (
                SELECT a.poNumber
                    , a.poLine 
                    , a.graphicsWorkOrderNumber graphicsWorkOrder
                    , a.partNumber
                    , c.name status
                    , b.graphicsSalesOrder 
                FROM eyefidb.graphicsWorkOrderCreation a
                left join eyefidb.graphicsSchedule b ON b.graphicsWorkOrder = a.graphicsWorkOrderNumber
                LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = b.status
                WHERE a.active = 1
            ) b ON b.poNumber = a.poNumber 
                AND b.partNumber = a.part
            LEFT JOIN (
                SELECT a.graphicsWorkOrder
                    , c.name status 
                FROM eyefidb.graphicsSchedule a
                LEFT JOIN eyefidb.graphicsQueues c ON c.queueStatus = a.status
                WHERE a.active = 1
            ) c ON c.graphicsWorkOrder = a.woNumber 
            left join db.users usr ON usr.id = a.createdBy
        ";
        $query = $this->db1->prepare($qry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSalesOrderDetailsByDate($dateTo)
    {
        $mainQry = "
            select a.sod_nbr sod_nbr
                , a.sod_due_date sod_due_date
                , CASE WHEN b.pt_bom_code != '' THEN b.pt_bom_code ELSE a.sod_part END sod_part
                , a.sod_qty_ord sod_qty_ord
                , a.sod_qty_ship sod_qty_ship
                , a.sod_price sod_price
                , a.sod_contr_id sod_contr_id
                , a.sod_domain sod_domain
                , a.sod_compl_stat sod_compl_stat
                , a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) openBalance
                , a.sod_qty_ord-a.sod_qty_ship qtyOpen
                , b.pt_desc1 pt_desc1
                , b.pt_desc2 pt_desc2
                , CASE 
                    WHEN b.pt_part IS NULL 
                        THEN a.sod_desc
                    ELSE CONCAT(b.pt_desc1, b.pt_desc2) 
                END fullDesc
                , c.so_cust so_cust
                , a.sod_line sod_line
                , c.so_ord_date so_ord_date
                , c.so_ship so_ship
                , sod_order_category sod_order_category
                , a.sod_custpart cp_cust_part
                , IFNULL(e.ld_qty_oh, 0) ld_qty_oh
                , c.so_bol so_bol
                , sod_cmtindx so_cmtindx
                , pt_routing pt_routing
                , a.sod_list_pr sod_list_pr
                , b.pt_pm_code pt_pm_code
                , b.pt_prod_line pt_prod_line
                , b.pt_part_type 
                , 'test' test
                
            from sod_det a
            
            left join (
                select pt_part	
                    , pt_desc1
                    , pt_desc2
                    , max(pt_routing) pt_routing
                    , max(pt_pm_code) pt_pm_code 
                    , max(pt_bom_code) pt_bom_code
                    , max(pt_prod_line) pt_prod_line
                    , max(pt_part_type) pt_part_type
                from pt_mstr
                where pt_domain = 'EYE'
                group by  pt_part	
                    , pt_desc1		
                    , pt_desc2			
            ) b ON b.pt_part = a.sod_part
            
            left join (
                select so_nbr	
                    , so_cust
                    , so_ord_date
                    , so_ship
                    , so_bol
                    , so_cmtindx
                    , so_compl_date
                from so_mstr
                where so_domain = 'EYE'
            ) c ON c.so_nbr = a.sod_nbr
            
            LEFT JOIN (
                select a.ld_part
                    , sum(a.ld_qty_oh) ld_qty_oh
                from ld_det a
                WHERE ld_domain = 'EYE'
                    AND a.ld_loc = 'LVFG'
                GROUP BY a.ld_part
            ) e ON e.ld_part = a.sod_part
            
            WHERE sod_domain = 'EYE'
            AND sod_qty_ord != sod_qty_ship	
            AND a.sod_due_date <= :date	
            AND so_compl_date IS NULL
            ORDER BY a.sod_due_date ASC WITH (NOLOCK)
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":date", $dateTo, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getProductStructureInfoByPartNumbers($in)
    {

        
        $result = $this->getSalesOrderDetailsByDate('2022-12-31');

        foreach ($result as $row) {
            $in_array[] = $row['SOD_PART'];
        }

        $in = "'" . implode("','", $in_array) . "'";
        
        $productStructure = "
            SELECT sod_part
                , sod_nbr
                , open_qty
                , case when a.pt_bom_code != '' THEN a.pt_bom_code ELSE t1.ps_comp END ps_par_t1
                , t1.ps_qty_per ps_qty_per_t1
                , a.pt_desc1 pt_desc1_t1
                , a.pt_pm_code pt_pm_code_t1
                , a.pt_prod_line pt_prod_line_t1
                , a.pt_bom_code pt_bom_code_t1
                
                , t2.ps_comp ps_comp_t2
                , t2.ps_qty_per ps_qty_per_t2
                , t2.pt_desc1 pt_desc1_t2
                , t2.pt_pm_code pt_pm_code_t2
                , t2.pt_prod_line pt_prod_line_t2
                , t2.pt_bom_code pt_bom_code_t2

                , t3.ps_comp ps_comp_t3
                , t3.ps_qty_per ps_qty_per_t3
                , t3.pt_desc1 pt_desc1_t3
                , t3.pt_pm_code pt_pm_code_t3
                , t3.pt_prod_line pt_prod_line_t3
                , t3.pt_bom_code pt_bom_code_t3

                , t4.ps_comp ps_comp_t4
                , t4.ps_qty_per ps_qty_per_t4
                , t4.pt_desc1 pt_desc1_t4
                , t4.pt_pm_code pt_pm_code_t4
                , t4.pt_prod_line pt_prod_line_t4
                , t4.pt_bom_code pt_bom_code_t4

                , cast((t1.ps_qty_per*t2.ps_qty_per*open_qty) as numeric(36,2))  qty_needed
                
            from ps_mstr t1 
            
            join (
                select sod_part
                    , min(sod_nbr) sod_nbr
                    , sum(sod_qty_ord - sod_qty_ship) open_qty 
                from sod_det 
                where sod_domain = 'EYE'
                    and sod_qty_ord - sod_qty_ship > 0
                group by sod_part
            ) b ON b.sod_part = t1.ps_par


            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_um) pt_um
                    , max(pt_pm_code) pt_pm_code 
                    , max(pt_prod_line) pt_prod_line
                    , max(pt_bom_code) pt_bom_code
                from pt_mstr
                WHERE pt_domain = 'EYE'
                group by pt_part
            ) a ON t1.ps_comp = a.pt_part
            

            left join (
                SELECT case when pt_bom_code != '' THEN pt_bom_code ELSE t1.ps_comp END ps_comp 
                    , t1.ps_par
                    , t1.ps_qty_per
                    , a.pt_desc1 
                    , a.pt_pm_code
                    , a.pt_bom_code
                    , a.pt_prod_line 
                    , a.pt_um
                from ps_mstr t1 
                LEFT JOIN ( 
                    select  pt_part
                        , max(pt_desc1) pt_desc1
                        , max(pt_um) pt_um 
                        , max(pt_pm_code) pt_pm_code 
                        , max(pt_bom_code) pt_bom_code
                        , max(pt_prod_line) pt_prod_line
                        , max(pt_bom_code) pt_bom_code
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    group by pt_part
                ) a ON t1.ps_comp = a.pt_part
                WHERE   t1.ps_domain = 'EYE'
                ORDER BY t1.ps_comp
            ) t2 ON case when a.pt_bom_code != '' THEN a.pt_bom_code ELSE t1.ps_comp END = t2.ps_par

            left join (
                SELECT case when pt_bom_code != '' THEN pt_bom_code ELSE t1.ps_comp END ps_comp 
                    , t1.ps_par
                    , t1.ps_qty_per
                    , a.pt_desc1 
                    , a.pt_pm_code
                    , a.pt_bom_code
                    , a.pt_prod_line 
                    , a.pt_um
                from ps_mstr t1 
                LEFT JOIN ( 
                    select  pt_part
                        , max(pt_desc1) pt_desc1
                        , max(pt_um) pt_um 
                        , max(pt_pm_code) pt_pm_code 
                        , max(pt_bom_code) pt_bom_code
                        , max(pt_prod_line) pt_prod_line
                        , max(pt_bom_code) pt_bom_code
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    group by pt_part
                ) a ON t1.ps_comp = a.pt_part
                WHERE   t1.ps_domain = 'EYE'
                ORDER BY t1.ps_comp
            ) t3 ON case when a.pt_bom_code != '' THEN a.pt_bom_code ELSE t2.ps_comp END = t3.ps_par

            left join (
                SELECT case when pt_bom_code != '' THEN pt_bom_code ELSE t1.ps_comp END ps_comp 
                    , t1.ps_par
                    , t1.ps_qty_per
                    , a.pt_desc1 
                    , a.pt_pm_code
                    , a.pt_bom_code
                    , a.pt_prod_line 
                    , a.pt_um
                from ps_mstr t1 
                LEFT JOIN ( 
                    select  pt_part
                        , max(pt_desc1) pt_desc1
                        , max(pt_um) pt_um 
                        , max(pt_pm_code) pt_pm_code 
                        , max(pt_bom_code) pt_bom_code
                        , max(pt_prod_line) pt_prod_line
                        , max(pt_bom_code) pt_bom_code
                    from pt_mstr
                    WHERE pt_domain = 'EYE'
                    group by pt_part
                ) a ON t1.ps_comp = a.pt_part
                WHERE   t1.ps_domain = 'EYE'
                ORDER BY t1.ps_comp
            ) t4 ON case when a.pt_bom_code != '' THEN a.pt_bom_code ELSE t3.ps_comp END = t4.ps_par

            WHERE t1.ps_par IN ($in)
                AND t1.ps_domain = 'EYE'
            ORDER BY t1.ps_comp
                , t2.ps_comp ASC
            WITH (NOLOCK)
        ";
        $productChildrenQuery = $this->db->prepare($productStructure);
        $productChildrenQuery->execute();
        $results = $productChildrenQuery->fetchAll(PDO::FETCH_ASSOC);


        $graphics = [];

        foreach($results as $row){
            $row['partNeeded'] = $row['PS_COMP_T2'];
            $row['qtyNeeded'] = $row['QTY_NEEDED'];

            if($row['PS_COMP_T2'] == ''){
                $row['partNeeded'] = $row['PS_PAR_T1'];
            }

            if($row['QTY_NEEDED'] == ''){
                $row['qtyNeeded'] = $row['OPEN_QTY'];
            }

            if(
                $row['PT_PROD_LINE_T1'] == '014' || 
                $row['PT_PROD_LINE_T2'] == '014' || 
                $row['PT_PROD_LINE_T3'] == '014' || 
                $row['PT_PROD_LINE_T4'] == '014'
            ){
                $graphics[] = $row;
            }
        }

        return $results;
    }

    public function restructureData($result, $resultsProduct, $statusInfo, $commentInfo)
    {

        $obj = array();

        foreach ($result as $row1) {
            if ($row1['PT_PROD_LINE'] == '014') {
                if (strpos($row1['SOD_PART'], 'THK') === false) {
                    $obj[] = array(
                        "part" => $row1['SOD_PART'],
                        "salesOrderQty" => $row1['QTYOPEN'],
                        "qtyNeeded" => $row1['QTYOPEN'],
                        "qtyPer" => $row1['QTYOPEN'],
                        "parentQtyPer" => 0,
                        "sod_nbr" => $row1['SOD_NBR'],
                        "sod_due_date" => $row1['SOD_DUE_DATE'],
                        "pt_desc" => $row1['FULLDESC'],
                        "SOItem" => $row1['SOD_PART'],
                        'level' => 0,
                        "sod_line" => $row1['SOD_LINE'],
                        "parentComponent" => $row1['SOD_PART'],
                        "code" => $row1['PT_PM_CODE'],
                        "so_ord_date" => $row1['SO_ORD_DATE'],
                        "so_ship" => $row1['SO_SHIP'],
                        "sod_contr_id" => $row1['SOD_CONTR_ID'],
                        "PT_PART_TYPE" => $row1['PT_PART_TYPE']
                    );
                }
            }
        }

        foreach ($resultsProduct as $row) {
            foreach ($result as $row1) {
                if ($row1['SOD_PART'] == $row['PARENT']) {

                    if ($row['PARENT_PT_PROD_LINE'] == '014') {
                        $obj[] = array(
                            "part" => $row['PARENT_COMPONENT'],
                            "salesOrderQty" => $row1['QTYOPEN'],
                            "qtyNeeded" => $row1['QTYOPEN'] * $row['PARENT_COMP_QTY'],
                            "qtyPer" => $row['PARENT_COMP_QTY'],
                            "parentQtyPer" => $row['PARENT_COMP_QTY'],
                            "sod_nbr" => $row1['SOD_NBR'],
                            "sod_due_date" => $row1['SOD_DUE_DATE'],
                            "pt_desc" => $row['PARENT_DESC'],
                            "SOItem" => $row1['SOD_PART'],
                            'level' => 1,
                            "sod_line" => $row1['SOD_LINE'],
                            "parentComponent" => $row['PARENT_COMPONENT'],
                            "code" => $row['PARENT_PT_PM_CODE'],
                            "so_ord_date" => $row1['SO_ORD_DATE'],
                            "parent_ps_end" => $row['PARENT_PS_END'],
                            "so_ship" => $row1['SO_SHIP'],
                            "sod_contr_id" => $row1['SOD_CONTR_ID']
                        );
                    }

                    if ($row['PARENT_SUB_PT_PROD_LINE'] == '014') {
                        $obj[] = array(
                            "part" => $row['PARENT_CATEGORY'],
                            "salesOrderQty" => $row1['QTYOPEN'],
                            "qtyNeeded" => $row1['QTYOPEN'] * $row['PARENT_COMP_QTY'] * $row['PARENT_CATEGORY_QTY'],
                            "qtyPer" => $row['PARENT_CATEGORY_QTY'],
                            "parentQtyPer" => $row['PARENT_COMP_QTY'],
                            "sod_nbr" => $row1['SOD_NBR'],
                            "sod_due_date" => $row1['SOD_DUE_DATE'],
                            "pt_desc" => $row['PARENT_CATEGORY_DESC'],
                            "SOItem" => $row1['SOD_PART'],
                            'level' => 2,
                            "sod_line" => $row1['SOD_LINE'],
                            "parentComponent" => $row['PARENT_COMPONENT'],
                            "code" => $row['PARENT_PT_PM_CODE'],
                            "so_ord_date" => $row1['SO_ORD_DATE'],
                            "parent_ps_end" => $row['PARENT_CATEGORY_PS_END'],
                            "so_ship" => $row1['SO_SHIP'],
                            "sod_contr_id" => $row1['SOD_CONTR_ID']
                        );
                    }
                }
            }
        }

        foreach ($obj as $r) {
            $in_array[] = $r['sod_nbr'] . '-' . $r['sod_line'] . '-' . $r['parentComponent'] . '-' . $r['part'];
        }

        $in = "'" . implode("','", $in_array) . "'";

        $misc_info = $this->getMiscInfoBySalesOrderNumbers($in);
        $l = array();
        foreach ($obj as $r) {
            $r['checked'] = 'Not Ordered';
            $r['id'] = $r['sod_nbr'] . '-' . $r['sod_line'] . '-' . $r['parentComponent'] . '-' . $r['part'];

            $r['graphicsStatus'] = "";
            $r['graphicsWorkOrderNumber'] = "";
            $r['graphicsSalesOrder'] = "";
            $r['poEnteredBy'] = "";
            $r['woNumber'] = "";
            $r['misc'] = new \stdClass();

            foreach ($misc_info as $misc_info_row) {
                if ($r['id'] == $misc_info_row['so']) {
                    $r['misc'] = $misc_info_row;
                }
            }

            foreach ($statusInfo as $r1) {
                if ($r1['uniqueId'] == $r['id']) {

                    $r['checked'] = $r1['active'] == 1 ? 'Ordered' : 'Not Ordered';
                    $r['checkedId'] = $r1['id'];
                    $r['poNumber'] = $r1['poNumber'];
                    $r['poEnteredBy'] = $r1['createdBy'];
                    $r['woNumber'] = $r1['woNumber'];

                    $r['graphicsStatus'] = $r1['graphicsStatus'];
                    $r['graphicsWorkOrderNumber'] = $r1['graphicsWorkOrderNumber'];
                    $r['graphicsSalesOrder'] = $r1['graphicsSalesOrder'];
                }
            }

            //comments
            $r['COMMENTS'] = false;
            $r['COMMENTSMAX'] = "";
            $r['COMMENTSCLASS'] = "";
            foreach ($commentInfo as $r1) {

                if ($r['id'] == $r1['orderNum']) {

                    $r['COMMENTS'] = true;
                    $r['COMMENTSMAX'] = $r1['comments'];

                    ///color the comments 
                    if ($r1['createdDate'] == $this->todayDate) {
                        $r['COMMENTSCLASS'] = "text-success";
                    } else {
                        $r['COMMENTSCLASS'] = "text-info";
                    }
                }
            }
            $l[] = $r;
        }
        return $l;
    }

    public function getGraphicsDemandReport($toDate = '300')
    {

        $in_array = array();

        $dateTo = strtotime(date("Y-m-d", strtotime($this->todayDate)) . " +$toDate days");
        $dateTo = date("Y-m-d", $dateTo);

        $commentInfo = $this->getComments();

        $statusInfo = $this->getGraphicsDemandStatusInfo();

        $result = $this->getSalesOrderDetailsByDate($dateTo);

        foreach ($result as $row) {
            $in_array[] = $row['SOD_PART'];
        }

        $in = "'" . implode("','", $in_array) . "'";

        $resultsProduct = $this->getProductStructureInfoByPartNumbers($in);

        $finalResults = $this->restructureData($result, $resultsProduct, $statusInfo, $commentInfo);

        return $finalResults;
    }
}

use EyefiDb\Databases\DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad;
use EyefiDb\Config\Protection;


$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$datainstance = new GraphicsDemands($db, $dbQad);

$data = $datainstance->getProductStructureInfoByPartNumbers(1);

echo $db_connect_qad->jsonToTable($data);
