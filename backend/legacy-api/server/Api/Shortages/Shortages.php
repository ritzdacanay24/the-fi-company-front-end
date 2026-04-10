<?php

namespace EyefiDb\Api\Shortages;

use PDO;
use PDOException;

class Shortages
{

    protected $db;
    public $sessionId;

    public function __construct($db, $dbQad)
    {

        $this->db = $db;
        $this->db1 = $dbQad;

        $this->nowDate = date("Y-m-d H:i:s", time());
        $this->dateNow = date("Y-m-d", time());
    }

    public function authUsers()
    {
        return (object) array(
            'accessRights' => array(
                'Bryon Jones',
                'Darren McGraw',
                'Ritz Dacanay',
                'Greg Nix',
                'Monica Hubbard',
                'Heidi Elya'
            ),
            'accessRightsProduction' => array(
                'Greg Nix',
                'Ritz Dacanay',
                'Monica Hubbard',
                'Bryon Jones'
            ),
            'accessRightsReceiving' => array(
                'Greg Nix',
                'Ritz Dacanay',
                'Monica Hubbard',
                'Bryon Jones'
            )
        );
    }

    public function authCheck($accessSection)
    {
        if (in_array($this->full_name, $accessSection)) {
            return true;
        }
        return false;
    }

    /**
     * Check if material shortages are created in the shortage log
     *
     * @param [type] $mrLineNumber
     * @return boolean
     */
    public function isShortagesCreatedFromMaterialRequest($mrLineNumber)
    {

        $mainQry = "
            select a.mrfId
                , a.id
            from eyefidb.shortageRequest a
            WHERE a.mrf_line = :mrf_line
        ";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(':mrf_line', $mrLineNumber, PDO::PARAM_STR);
        $query->execute();
        $isFound = $query->fetch();

        if ($isFound) {
            return true;
        } else {
            return false;
        }
    }

    public function getWorkOrderStatus($in)
    {

        $mainQry = "
        select a.wo_status, a.wo_nbr, ld_qty_oh, wod_part 
            from wo_mstr a 
        left join ( 
            select a.wod_nbr, a.wod_part, ld_qty_oh 
            from wod_det a   
            left join ( 
            select ld_part, sum(ld_qty_oh) ld_qty_oh 
            from ld_det  
            where ld_domain = 'EYE' 
            and ld_qty_oh > 0
            group by ld_part 
            ) b ON b.ld_part = a.wod_part  
            where a.wod_domain = 'EYE'  
        ) b ON b.wod_nbr = a.wo_nbr
            where a.wo_domain = 'EYE'    
            and a.wo_nbr IN ($in)   

        ";
        $query = $this->db1->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createShortages($data)
    {

        $jobNumber = time();

        try {

            $qry = "
                INSERT INTO eyefidb.shortageRequest(
                    woNumber
                    , lineNumber
                    , dueDate
                    , reasonPartNeeded
                    , priority
                    , partNumber
                    , qty
                    , createdBy
                    , jobNumber 
                    , comments
                    , partDesc
                    , assemblyNumber
                    , graphicsShortage
                    , mrfId
                    , mrf_line
                ) 
                VALUES(
                    :woNumber
                    , :lineNumber
                    , :dueDate
                    , :reasonPartNeeded
                    , :priority
                    , :partNumber
                    , :qty
                    , :createdBy
                    , :jobNumber
                    , :comments
                    , :partDesc
                    , :assemblyNumber
                    , :graphicsShortage
                    , :mrfId
                    , :mrf_line
                )
            ";
            $query = $this->db->prepare($qry);

            foreach ($data as $item) {

                $mrf_line = isset($item['mrf_line']) && $item['mrf_line'] && !empty($item['mrf_line']) ? $item['mrf_line'] : null;
                $mrfId = isset($item['mrfId']) && $item['mrfId'] && !empty($item['mrfId']) ? $item['mrfId'] : null;

                $query->bindParam(':woNumber', $item['woNumber'], PDO::PARAM_STR);
                $query->bindParam(':lineNumber', $item['lineNumber'], PDO::PARAM_STR);
                $query->bindParam(':dueDate', $item['dueDate'], PDO::PARAM_STR);
                $query->bindParam(':reasonPartNeeded', $item['reasonPartNeeded'], PDO::PARAM_STR);
                $query->bindParam(':priority', $item['priority'], PDO::PARAM_STR);
                $query->bindParam(':partNumber', $item['partNumber'], PDO::PARAM_STR);
                $query->bindParam(':qty', $item['qty'], PDO::PARAM_INT);
                $query->bindParam(':createdBy', $item['createdBy'], PDO::PARAM_INT);
                $query->bindParam(':jobNumber', $jobNumber, PDO::PARAM_STR);
                $query->bindParam(':comments', $item['comments'], PDO::PARAM_STR);
                $query->bindParam(':partDesc', $item['partDesc'], PDO::PARAM_STR);
                $query->bindParam(':assemblyNumber', $item['assemblyNumber'], PDO::PARAM_STR);
                $query->bindParam(':graphicsShortage', $item['graphicsShortage'], PDO::PARAM_STR);
                $query->bindParam(':mrfId', $mrfId, PDO::PARAM_STR);
                $query->bindParam(':mrf_line', $mrf_line, PDO::PARAM_INT);
                $query->execute();
                $this->db->lastInsertId();
            }
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function throwError($message, $responseCode)
    {
        http_response_code($responseCode);
        echo $message;
        die();
    }

    public function updateProductionIssue($data)
    {

        // if (!$this->authCheck($this->authUsers()->accessRightsProduction)) {
        //     $this->throwError('Access Denied', 403);
        // }

        $this->updateData($data);
    }

    public function updateData($data)
    {
        $qry = "
        UPDATE eyefidb.shortageRequest
        SET jobNumber = :jobNumber
            , woNumber = :woNumber
            , lineNumber = :lineNumber
            , dueDate = :dueDate
            , reasonPartNeeded = :reasonPartNeeded
            , priority = :priority
            , partNumber = :partNumber
            , qty = :qty
            , createdBy = :createdBy
            , createdDate = :createdDate
            , active = :active
            , status = :status
            , deleted_main_date = :deleted_main_date
            , deleted_main_user = :deleted_main_user
            , active_line = :active_line
            , comments = :comments
            , partDesc = :partDesc
            , buyer = :buyer
            , assemblyNumber = :assemblyNumber
            , supplyCompleted = :supplyCompleted
            , receivingCompleted = :receivingCompleted
            , deliveredCompleted = :deliveredCompleted
            , supplyCompletedBy = :supplyCompletedBy
            , receivingCompletedBy = :receivingCompletedBy
            , deliveredCompletedBy = :deliveredCompletedBy
            , productionIssuedDate = :productionIssuedDate
            , productionIssuedBy = :productionIssuedBy
            , graphicsShortage = :graphicsShortage
            , poNumber = :poNumber
            , supplier = :supplier
            , mrfId = :mrfId
            , mrf_line = :mrf_line
        WHERE id = :id
    ";
        $query = $this->db->prepare($qry);
        $query->bindParam(':jobNumber', $data['jobNumber'], PDO::PARAM_STR);
        $query->bindParam(':woNumber', $data['woNumber'], PDO::PARAM_STR);
        $query->bindParam(':lineNumber', $data['lineNumber'], PDO::PARAM_STR);
        $query->bindParam(':dueDate', $data['dueDate'], PDO::PARAM_STR);
        $query->bindParam(':reasonPartNeeded', $data['reasonPartNeeded'], PDO::PARAM_STR);
        $query->bindParam(':priority', $data['priority'], PDO::PARAM_STR);
        $query->bindParam(':partNumber', $data['partNumber'], PDO::PARAM_STR);
        $query->bindParam(':qty', $data['qty'], PDO::PARAM_INT);
        $query->bindParam(':createdBy', $data['createdBy'], PDO::PARAM_INT);
        $query->bindParam(':createdDate', $data['createdDate'], PDO::PARAM_STR);
        $query->bindParam(':active', $data['active'], PDO::PARAM_INT);
        $query->bindParam(':status', $data['status'], PDO::PARAM_STR);
        $query->bindParam(':deleted_main_date', $data['deleted_main_date'], PDO::PARAM_STR);
        $query->bindParam(':deleted_main_user', $data['deleted_main_user'], PDO::PARAM_STR);
        $query->bindParam(':active_line', $data['active_line'], PDO::PARAM_INT);
        $query->bindParam(':comments', $data['comments'], PDO::PARAM_STR);
        $query->bindParam(':partDesc', $data['partDesc'], PDO::PARAM_STR);
        $query->bindParam(':buyer', $data['buyer'], PDO::PARAM_STR);
        $query->bindParam(':assemblyNumber', $data['assemblyNumber'], PDO::PARAM_STR);
        $query->bindParam(':supplyCompleted', $data['supplyCompleted'], PDO::PARAM_STR);
        $query->bindParam(':receivingCompleted', $data['receivingCompleted'], PDO::PARAM_STR);
        $query->bindParam(':deliveredCompleted', $data['deliveredCompleted'], PDO::PARAM_STR);
        $query->bindParam(':productionIssuedDate', $data['productionIssuedDate'], PDO::PARAM_STR);
        $query->bindParam(':supplyCompletedBy', $data['supplyCompletedBy'], PDO::PARAM_INT);
        $query->bindParam(':receivingCompletedBy', $data['receivingCompletedBy'], PDO::PARAM_INT);
        $query->bindParam(':deliveredCompletedBy', $data['deliveredCompletedBy'], PDO::PARAM_INT);
        $query->bindParam(':productionIssuedBy', $data['productionIssuedBy'], PDO::PARAM_INT);
        $query->bindParam(':graphicsShortage', $data['graphicsShortage'], PDO::PARAM_STR);
        $query->bindParam(':poNumber', $data['poNumber'], PDO::PARAM_STR);
        $query->bindParam(':supplier', $data['supplier'], PDO::PARAM_STR);
        $query->bindParam(':mrfId', $data['mrfId'], PDO::PARAM_STR);
        $query->bindParam(':mrf_line', $data['mrf_line'], PDO::PARAM_INT);
        $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
        return $query->execute();
    }

    public function update($data)
    {

        // if (!$this->authCheck($this->authUsers()->accessRights)) {
        //     $this->throwError('Access Denied', 403);
        // }

        $this->updateData($data);
    }

    public function getComments($in, $type = 'Shortage Request')
    {
        $comments = "
            SELECT a.orderNum
                , comments_html comments_html
                , comments comments
                , a.createdDate
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
        $query = $this->db->prepare($comments);
        $query->bindParam(':type', $type, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOpenShortagesReport()
    {
        $mainQry = "
            select a.*,
                concat(b.first, ' ', b.last) fullName,
                c.status statusGraphics,
                c.graphicsWorkOrder graphicsWorkOrder
            from eyefidb.shortageRequest a
            LEFT JOIN db.users b ON b.id = a.createdBy
            LEFT JOIN (
                SELECT purchaseOrder
                    , customerPartNumber
                    , max(c.name) status
                    , max(graphicsWorkOrder) graphicsWorkOrder
                FROM eyefidb.graphicsSchedule a
                LEFT JOIN eyefidb.graphicsQueues c
                    ON c.queueStatus = a.status
                WHERE a.active = 1
                GROUP BY purchaseOrder
                    , customerPartNumber
            ) c ON c.purchaseOrder = a.poNumber
                AND c.customerPartNumber = a.partNumber
            WHERE a.active = 1
            AND (
                a.productionIssuedDate IS NULL
            )
            ORDER BY a.priority DESC, a.dueDate ASC
        ";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getWorkOrdersInArray($details)
    {
        $in_array = array();
        foreach ($details as $row) {
            $in_array[] = $row['id'];
        }

        return "'" . implode("','", $in_array) . "'";
    }

    public function completeButtons()
    {
    }


    public function getMiscInfoBySalesOrderNumbers($in)
    {
        try {
            $comments = "
                SELECT *
                FROM eyefidb.workOrderOwner a
                WHERE a.so IN ($in)
            ";
            $query = $this->db->prepare($comments);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }


    public function getShortages()
    {

        $details = $this->getOpenShortagesReport();

        $in = $this->getWorkOrdersInArray($details);

        $commentInfo = $this->getComments($in);


        $misc_info = $this->getMiscInfoBySalesOrderNumbers($in);

        $in_array = array();
        foreach ($details as $row) {
            if($row['woNumber'] != "")
            $in_array[] = $row['woNumber'];
        }

        $in_array =  array_unique($in_array);

        $inWorkOrder = "'" . implode("','", $in_array) . "'";

        $getWorkOrderStatusInfo = $this->getWorkOrderStatus($inWorkOrder);
        //$getWorkOrderStatusInfo = [];
        $chart['chart1'] = 0;
        $chart['chart2'] = 0;
        $chart['chart3'] = 0;
        $chart['chart4'] = 0;

        foreach ($details as &$row) {
            $row['wo_status'] = '-';
            $row['ld_qty_oh'] = 'N';
            
            $row['misc'] = new \stdClass();

            foreach ($misc_info as $misc_info_row) {
                if ($row['id'] == $misc_info_row['so']) {
                    $row['misc'] = $misc_info_row;
                }
            }

            foreach ($getWorkOrderStatusInfo as $row1) {
                if (
                    trim($row['woNumber']) == trim($row1['WO_NBR']) 
                ) {
                    $row['wo_status'] = $row1['WO_STATUS'];
                }
                if (
                    trim($row['woNumber']) == trim($row1['WO_NBR']) &&
                    trim($row['partNumber']) == trim($row1['WOD_PART'])
                ) {
                    $row['ld_qty_oh'] = $row1['LD_QTY_OH'] == "" || $row1['LD_QTY_OH'] == null ? 'N' : 'Y';
                }
            }

            $row['recent_comments'] = new \stdClass();
            foreach ($commentInfo as $row1) {
                if ($row['id'] == $row1['orderNum']) {
                    $row['recent_comments'] = $row1;
                }
            }


            //stats
            if (!$row['supplyCompleted']) {
                $chart['chart1']++;
            }
            if ($row['supplyCompleted'] && !$row['deliveredCompleted']) {
                $chart['chart2']++;
            }
            if ($row['supplyCompleted'] && $row['deliveredCompleted'] && !$row['receivingCompleted']) {
                $chart['chart3']++;
            }
            if ($row['supplyCompleted'] && $row['deliveredCompleted'] && $row['receivingCompleted'] && !$row['productionIssuedDate']) {
                $chart['chart4']++;
            }
        }

        return array(
            "details" => $details,
            "authUsers" => $this->authUsers(),
            "chartData" => $chart,
            "getWorkOrderStatusInfo" => $getWorkOrderStatusInfo,
            "d" => $in_array,
            "in" => $misc_info
        );
    }

    public function __destruct()
    {
        $this->db = null;
    }
}
