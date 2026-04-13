<?php

namespace EyefiDb\Api\Graphics;

use PDO;
use PDOException;

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
        $this->nowDateTime = date("Y-m-d H:i:s", time()); // Add missing property
        $this->sessionId = 1; // Add missing property - you may want to get this from session
    }


    public function updateMisc($data)
    {
        try {
            $qry = "
                UPDATE eyefidb.workOrderOwner 
                SET userName = :userName
                    , fs_install = :fs_install
                    , lastModDate = :lastModDate
                    , lastModUser = :lastModUser
                    , fs_install_date = :fs_install_date
                    , arrivalDate = :arrivalDate
                    , shipViaAccount = :shipViaAccount
                    , source_inspection_required = :source_inspection_required
                    , source_inspection_completed = :source_inspection_completed
                    , source_inspection_waived = :source_inspection_waived
                    , pallet_count = :pallet_count
                    , container = :container
                    , container_due_date = :container_due_date
                    , tj_po_number = :tj_po_number
                    , tj_due_date = :tj_due_date
                    , last_mod_info = :last_mod_info
                    , g2e_comments = :g2e_comments
                    , shortages_review = :shortages_review
                    , recoveryDate = :recoveryDate
                    , lateReasonCode = :lateReasonCode
                WHERE so = :so
            ";
            $query = $this->db1->prepare($qry);
            $query->bindParam(":userName", $data['userName'], PDO::PARAM_STR);
            $query->bindParam(":so", $data['so'], PDO::PARAM_STR);
            $query->bindParam(":fs_install", $data['fs_install'], PDO::PARAM_STR);
            $query->bindParam(":lastModDate", $this->nowDateTime, PDO::PARAM_STR);
            $query->bindParam(":lastModUser", $this->sessionId, PDO::PARAM_INT);
            $query->bindParam(":fs_install_date", $data['fs_install_date'], PDO::PARAM_STR);
            $query->bindParam(":arrivalDate", $data['arrivalDate'], PDO::PARAM_STR);
            $query->bindParam(":shipViaAccount", $data['shipViaAccount'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_required", $data['source_inspection_required'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_completed", $data['source_inspection_completed'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_waived", $data['source_inspection_waived'], PDO::PARAM_STR);
            $query->bindParam(":container", $data['container'], PDO::PARAM_STR);
            $query->bindParam(":container_due_date", $data['container_due_date'], PDO::PARAM_STR);
            $query->bindParam(":pallet_count", $data['pallet_count'], PDO::PARAM_STR);
            $query->bindParam(":tj_po_number", $data['tj_po_number'], PDO::PARAM_STR);
            $query->bindParam(":tj_due_date", $data['tj_due_date'], PDO::PARAM_STR);
            $query->bindParam(":last_mod_info", $data['last_mod_info'], PDO::PARAM_STR);
            $query->bindParam(":g2e_comments", $data['g2e_comments'], PDO::PARAM_STR);
            $query->bindParam(":shortages_review", $data['shortages_review'], PDO::PARAM_STR);
            $query->bindParam(":recoveryDate", $data['recoveryDate'], PDO::PARAM_STR);
            $query->bindParam(":lateReasonCode", $data['lateReasonCode'], PDO::PARAM_STR);
            $query->execute();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function insertMisc($data)
    {
        try {
            $qry = "
                INSERT INTO eyefidb.workOrderOwner (recoveryDate) 
                VALUES (:recoveryDate) 
                ON DUPLICATE KEY UPDATE recoveryDate = value(recoveryDate);
            ";
            $query = $this->db1->prepare($qry);
            $query->bindParam(":recoveryDate", $data['recoveryDate'], PDO::PARAM_STR);
            $query->execute();

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

    public function updateById($data, $id)
    {
        $qry = "
            UPDATE eyefidb.graphicsDemand 
            SET active = :active
                , poNumber = :poNumber
                , graphicsWorkOrderNumber = :graphicsWorkOrderNumber
                , graphicsSalesOrder = :graphicsSalesOrder
                , lastModBy = :lastModBy
                , lastModDate = :lastModDate
                , woNumber = :woNumber
            WHERE id = :id
        ";
        $query = $this->db1->prepare($qry);
        $query->bindParam(":id", $id, PDO::PARAM_INT);
        $query->bindParam(":poNumber", $data['poNumber'], PDO::PARAM_STR);
        $query->bindParam(":active", $data['active'], PDO::PARAM_INT);
        $query->bindParam(":graphicsWorkOrderNumber", $data['graphicsWorkOrderNumber'], PDO::PARAM_STR);
        $query->bindParam(":graphicsSalesOrder", $data['graphicsSalesOrder'], PDO::PARAM_STR);
        $query->bindParam(":woNumber", $data['woNumber'], PDO::PARAM_STR);
        $query->bindParam(":lastModBy", $data['lastModBy'], PDO::PARAM_INT);
        $query->bindParam(":lastModDate", $data['lastModDate'], PDO::PARAM_STR);
        $query->execute();
        return $id;
    }

    public function insert($data)
    {
        $qry = "
            INSERT INTO eyefidb.graphicsDemand (
                so 
                , line 
                , parentComponent
                , uniqueId
                , part
                , createdBy
                , poNumber
                , woNumber
            ) VALUES (
                :so 
                , :line 
                , :parentComponent
                , :uniqueId
                , :part
                , :createdBy
                , :poNumber
                , :woNumber
            )
        ";
        $query = $this->db1->prepare($qry);
        $query->bindParam(":line", $data['line'], PDO::PARAM_INT);
        $query->bindParam(":so", $data['so'], PDO::PARAM_STR);
        $query->bindParam(":parentComponent", $data['parentComponent'], PDO::PARAM_STR);
        $query->bindParam(":part", $data['part'], PDO::PARAM_STR);
        $query->bindParam(":uniqueId", $data['uniqueId'], PDO::PARAM_STR);
        $query->bindParam(":createdBy", $data['createdBy'], PDO::PARAM_INT);
        $query->bindParam(":poNumber", $data['poNumber'], PDO::PARAM_STR);
        $query->bindParam(":woNumber", $data['woNumber'], PDO::PARAM_STR);
        $query->execute();
        return $this->db1->lastInsertId();
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

    public function createOrUpdate($data)
    {

        $obj = array();
        $statusInfo = isset($data['id']) ? $this->getById($data['id']) : false;

        if ($statusInfo) {
            $obj['idLast'] = $this->updateById($data, $data['id']);
        } else {
            $obj['idLast'] = $this->insert($data);
        }

        if ($data['woNumber'] != "") {
            $graphicsInfo = $this->getMaxStatusFromGraphicsScheduleByWorkOrderNumber($data['woNumber']);
            if ($graphicsInfo) {
                $obj['graphicsStatus'] = $graphicsInfo['status'];
                $obj['graphicsWorkOrderNumber'] = $graphicsInfo['graphicsWorkOrder'];
            } else {
                $obj['graphicsStatus'] = "No Status found";
                $obj['graphicsWorkOrderNumber'] = "No work order found";
            }
        } else if ($data['poNumber'] != "") {
            $graphicsInfo = $this->getGraphicsScheduleInfoByPoAndItemNumber($data['poNumber'], $data['part']);

            if ($graphicsInfo) {
                $obj['graphicsStatus'] = $graphicsInfo['status'];
                $obj['graphicsWorkOrderNumber'] = $graphicsInfo['graphicsWorkOrder'];
                $obj['graphicsSalesOrder'] = $graphicsInfo['graphicsSalesOrder'];
            } else {
                $obj['graphicsStatus'] = "No Status found";
                $obj['graphicsWorkOrderNumber'] = "No work order found";
                $obj['graphicsSalesOrder'] = "No sales order found";
            }
        } else {
            $obj['graphicsStatus'] = "";
            $obj['graphicsWorkOrderNumber'] = "";
            $obj['graphicsSalesOrder'] = "";
        }

        return $obj;
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
                , b.pt_phantom 
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
                    , max(pt_phantom) pt_phantom
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
        $productStructure = "
            SELECT t1.ps_par parent
            
                , t1.ps_comp parent_component
                , t1.ps_qty_per parent_comp_qty
                , max(t1.ps_end) parent_ps_end
                , a.pt_desc1 parent_desc
                , a.pt_um parent_um
                , a.pt_pm_code parent_pt_pm_code
                , a.pt_prod_line parent_pt_prod_line
                , a.pt_bom_code parent_bom_code
                , parent_pt_phantom
                
                , t2.ps_comp as parent_category 
                , t2.ps_qty_per parent_category_qty
                , max(t2.ps_end) parent_category_ps_end
                , d.pt_desc1 parent_category_desc
                , d.pt_um parent_category_um
                , d.pt_pm_code parent_sub_pt_pm_code
                , d.pt_prod_line parent_sub_pt_prod_line
                , d.pt_bom_code parent_sub_bom_code
                , parent_sub_pt_phantom
                
            from ps_mstr t1 
            LEFT JOIN ps_mstr t2 
                on t1.ps_comp = t2.ps_par
                    AND t2.ps_domain = 'EYE'
                    
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_um) pt_um
                    , max(pt_pm_code) pt_pm_code 
                    , max(pt_prod_line) pt_prod_line
                    , max(pt_bom_code) pt_bom_code
                    , max(pt_phantom) parent_pt_phantom
                from pt_mstr
                WHERE pt_domain = 'EYE'
                AND pt_part_type != 'GraphKit'
                group by pt_part
            ) a ON t1.ps_comp = a.pt_part
            
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_um) pt_um
                    , max(pt_pm_code) pt_pm_code
                    , max(pt_prod_line) pt_prod_line
                    , max(pt_bom_code) pt_bom_code
                    , max(pt_phantom) parent_sub_pt_phantom
                from pt_mstr
                WHERE pt_domain = 'EYE'
                    AND pt_part_type != 'GraphKit'
                group by pt_part
            ) d ON t2.ps_comp = d.pt_part
            
            
            WHERE t1.ps_par IN ($in)
                AND t1.ps_domain = 'EYE'
                AND ( ( d.pt_prod_line = 014 OR a.pt_prod_line = 014) )
            GROUP BY t1.ps_par 
            
                , t1.ps_comp 
                , t1.ps_qty_per 
                , a.pt_desc1 
                , a.pt_um 
                , a.pt_pm_code 
                , a.pt_prod_line
                , a.pt_bom_code
                , a.parent_pt_phantom
                
                , t2.ps_comp  
                , t2.ps_qty_per 
                , d.pt_desc1 
                , d.pt_um 
                , d.pt_pm_code 
                , d.pt_prod_line
                , d.pt_bom_code
                , parent_sub_pt_phantom
            ORDER BY t1.ps_comp
                , t2.ps_comp ASC
            WITH (NOLOCK)
        ";
        $productChildrenQuery = $this->db->prepare($productStructure);
        $productChildrenQuery->execute();
        return  $productChildrenQuery->fetchAll(PDO::FETCH_ASSOC);

    }

    public function getPartMaster($in)
    {
        $productStructure = "
            select pt_part
                , pt_pm_code
                , pt_phantom
            from pt_mstr
            WHERE pt_domain = 'EYE'
                and pt_part = '$in'
        ";
        $productChildrenQuery = $this->db->prepare($productStructure);
        $productChildrenQuery->execute();
        return  $productChildrenQuery->fetchAll();

    }

    public function getPartMastertest($part)
    {
        $productStructure = "
            select pt_part
                , pt_pm_code
                , pt_phantom
            from pt_mstr
            WHERE pt_domain = 'EYE'
                and pt_part = '$part'
        ";
        $productChildrenQuery = $this->db->prepare($productStructure);
        $productChildrenQuery->execute();
        return  $productChildrenQuery->fetch();

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
                        "PT_PART_TYPE" => $row1['PT_PART_TYPE'],
                        "pt_bom_code" => $row1['PT_PM_CODE'],
                        "pt_phantom" => $row1['PT_PHANTOM']
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
                            "sod_contr_id" => $row1['SOD_CONTR_ID'],
                            "pt_bom_code" => $row['PARENT_BOM_CODE'],
                            "pt_phantom" => $row['PARENT_PT_PHANTOM']
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
                            "code" => $row['PARENT_CATEGORY'] == 'EYE9951' ? 'M' : $row['PARENT_PT_PM_CODE'],
                            "so_ord_date" => $row1['SO_ORD_DATE'],
                            "parent_ps_end" => $row['PARENT_CATEGORY_PS_END'],
                            "so_ship" => $row1['SO_SHIP'],
                            "sod_contr_id" => $row1['SOD_CONTR_ID'],
                            "pt_bom_code" => $row['PARENT_SUB_BOM_CODE'],
                            "pt_phantom" => $row['PARENT_SUB_PT_PHANTOM']
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

            if($r['code'] == ""){
                //getPartMaster
                $isFound =  $this->getPartMastertest($r['part']);

                if($isFound['pt_pm_code'] != ""){
                    $r['code'] = $isFound['pt_pm_code'];
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
