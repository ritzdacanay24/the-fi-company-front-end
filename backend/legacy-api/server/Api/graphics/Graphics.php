<?php

namespace EyefiDb\Api\Graphics;

use PDO;
use PDOException;

class Graphics
{

    protected $db;
    protected $dbQad;
    public $sessionId;

    public function __construct($db, $dbQad)
    {
        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date(" Y-m-d H:i:s", time());
    }

    public function userTransaction($userTrans)
    {

        if (is_array($userTrans) || is_object($userTrans)) {
            foreach ($userTrans as $item) {
                $field = isset($item['field']) ? $item['field'] : "";
                $o = isset($item['o']) ? $item['o'] : "";
                $n = isset($item['n']) ? $item['n'] : "";
                $comment = isset($item['comment']) ? $item['comment'] : "";
                $so = isset($item['so']) ? $item['so'] : "";
                $type = isset($item['type']) ? $item['type'] : "";
                $partNumber = isset($item['partNumber']) ? $item['partNumber'] : "";
                $userId = isset($item['userId']) ? $item['userId'] : $this->sessionId;
                $reasonCode = isset($item['reasonCode']) ? $item['reasonCode'] : "";

                $qry = '
                    INSERT INTO eyefidb.userTrans (
                        field
                        , o
                        , n
                        , createDate
                        , comment
                        , userId
                        , so
                        , type
                        , partNumber
                        , reasonCode
                    ) 
                    VALUES( 
                        :field
                        , :o
                        , :n
                        , :createDate
                        , :comment
                        , :userId
                        , :so
                        , :type
                        , :partNumber
                        , :reasonCode
                    )
                ';
                $stmt = $this->db->prepare($qry);
                $stmt->bindParam(':field', $field, PDO::PARAM_STR);
                $stmt->bindParam(':o', $o, PDO::PARAM_STR);
                $stmt->bindParam(':n', $n, PDO::PARAM_STR);
                $stmt->bindParam(':createDate', $this->nowDate, PDO::PARAM_STR);
                $stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
                $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
                $stmt->bindParam(':so', $so, PDO::PARAM_STR);
                $stmt->bindParam(':type', $type, PDO::PARAM_STR);
                $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
                $stmt->bindParam(':reasonCode', $reasonCode, PDO::PARAM_STR);
                $stmt->execute();
            }
        }
    }

    public function updateWorkOrderById($post)
    {
        try {
            $qry = "
                UPDATE eyefidb.graphicsSchedule
                SET orderNum = :orderNum,
                    graphicsWorkOrder = :graphicsWorkOrder,
                    graphicsSalesOrder = :graphicsSalesOrder,
                    status = :status,
                    itemNumber = :itemNumber,
                    description = :description,
                    customer = :customer,
                    dueDate = :dueDate,
                    origDueDate = :origDueDate,
                    shippedOn = :shippedOn,
                    customerPartNumber = :customerPartNumber,
                    qty = :qty,
                    allocQty = :allocQty,
                    qtyShipped = :qtyShipped,
                    pendingQtyShip = :pendingQtyShip,
                    purchaseOrder = :purchaseOrder,
                    userId = :userId,
                    createdDate = :createdDate,
                    priority = :priority,
                    partials = :partials,
                    active	 = :active,
                    lastUpdate = :lastUpdate,
                    packingSlipNumber = :packingSlipNumber,
                    material = :material,
                    materialSize = :materialSize,
                    materialLocation = :materialLocation,
                    instructions = :instructions,
                    plexOrdered = :plexOrdered,
                    plexRequired = :plexRequired,
                    prototypeCheck = :prototypeCheck,
                    criticalOrder = :criticalOrder,
                    graphicsWorkOrderString = :graphicsWorkOrderString
                WHERE id = :id
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':orderNum', $post['orderNum'], PDO::PARAM_STR);
            $stmt->bindParam(':graphicsWorkOrder', $post['graphicsWorkOrder'], PDO::PARAM_STR);
            $stmt->bindParam(':graphicsSalesOrder', $post['graphicsSalesOrder'], PDO::PARAM_INT);
            $stmt->bindParam(':status', $post['status'], PDO::PARAM_INT);
            $stmt->bindParam(':itemNumber', $post['itemNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':description', $post['description'], PDO::PARAM_STR);
            $stmt->bindParam(':customer', $post['customer'], PDO::PARAM_STR);
            $stmt->bindParam(':dueDate', $post['dueDate'], PDO::PARAM_STR);
            $stmt->bindParam(':origDueDate', $post['origDueDate'], PDO::PARAM_STR);
            $stmt->bindParam(':shippedOn', $post['shippedOn'], PDO::PARAM_STR);
            $stmt->bindParam(':customerPartNumber', $post['customerPartNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':qty', $post['qty'], PDO::PARAM_INT);
            $stmt->bindParam(':allocQty', $post['allocQty'], PDO::PARAM_INT);
            $stmt->bindParam(':qtyShipped', $post['qtyShipped'], PDO::PARAM_INT);
            $stmt->bindParam(':pendingQtyShip', $post['pendingQtyShip'], PDO::PARAM_INT);
            $stmt->bindParam(':purchaseOrder', $post['purchaseOrder'], PDO::PARAM_STR);
            $stmt->bindParam(':userId', $post['userId'], PDO::PARAM_INT);
            $stmt->bindParam(':createdDate', $post['createdDate'], PDO::PARAM_STR);
            $stmt->bindParam(':priority', $post['priority'], PDO::PARAM_STR);
            $stmt->bindParam(':partials', $post['partials'], PDO::PARAM_STR);
            $stmt->bindParam(':active', $post['active'], PDO::PARAM_INT);
            $stmt->bindParam(':lastUpdate', $post['lastUpdate'], PDO::PARAM_STR);
            $stmt->bindParam(':packingSlipNumber', $post['packingSlipNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':material', $post['material'], PDO::PARAM_STR);
            $stmt->bindParam(':materialSize', $post['materialSize'], PDO::PARAM_STR);
            $stmt->bindParam(':materialLocation', $post['materialLocation'], PDO::PARAM_STR);
            $stmt->bindParam(':instructions', $post['instructions'], PDO::PARAM_STR);
            $stmt->bindParam(':plexOrdered', $post['plexOrdered'], PDO::PARAM_STR);
            $stmt->bindParam(':plexRequired', $post['plexRequired'], PDO::PARAM_STR);
            $stmt->bindParam(':prototypeCheck', $post['prototypeCheck'], PDO::PARAM_STR);
            $stmt->bindParam(':criticalOrder', $post['criticalOrder'], PDO::PARAM_STR);
            $stmt->bindParam(':graphicsWorkOrderString', $post['graphicsWorkOrderString'], PDO::PARAM_STR);
            $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->rowCount();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function moveOrder($post)
    {
        $this->db->beginTransaction();

        try {

            $workOrderInfo = $this->getWorkOrderById($post['id']);

            $updatedId = $this->updateWorkOrderById($post);

            $userTrans[] = array(
                'field' => $workOrderInfo['queueStatus'] . ' completed',
                'o' => $workOrderInfo['status'],
                'n' => $post['status'],
                'comment' => '',
                'so' => $post['orderNum'],
                'type' => 'Graphics complete',
                'userId' => $post['userId']
            );

            $this->userTransaction($userTrans);

            $this->db->commit();

            return  $updatedId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function insert($data)
    {

        $priority = isset($data['priority']) && $data['priority'] == 'true' ? 10 : 50;
        $partials = isset($data['partials']) && $data['partials'] == 'true' ? 1 : 0;
        $prototypeCheck = isset($data['protoTypeCheck']) && $data['protoTypeCheck'] == 'true' ? 1 : 0;
        $plexRequired = isset($data['plexRequired']) && $data['plexRequired'] == 'true' ? 1 : 0;
        $criticalOrder = isset($data['criticalOrder']) && $data['criticalOrder'] == 'true' ? 1 : 0;

        try {
            $qry = "
                INSERT INTO eyefidb.graphicsSchedule(
                    itemNumber
                    , description
                    , customer
                    , qty
                    , dueDate
                    , customerPartNumber
                    , purchaseOrder
                    , userId
                    , createdDate
                    , priority
                    , status
                    , partials
                    , prototypeCheck
                    , origDueDate
                    , graphicsWorkOrder
                    , instructions
                    , plexRequired
                    , graphicsSalesOrder
                    , criticalOrder
                ) values (
                    :itemNumber
                    , :description
                    , :customer
                    , :qty
                    , :dueDate
                    , :customerPartNumber
                    , :purchaseOrder
                    , :userId
                    , :createdDate
                    , :priority
                    , 0
                    , :partials
                    , :prototypeCheck
                    , :origDueDate
                    , :graphicsWorkOrder
                    , :instructions
                    , :plexRequired
                    , :graphicsSalesOrder
                    , :criticalOrder
                )
            ";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':itemNumber', $data['itemNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':description', $data['description'], PDO::PARAM_STR);
            $stmt->bindParam(':customer', $data['customer'], PDO::PARAM_STR);
            $stmt->bindParam(':qty', $data['qty'], PDO::PARAM_STR);
            $stmt->bindParam(':dueDate', $data['dueDate'], PDO::PARAM_STR);
            $stmt->bindParam(':origDueDate', $data['dueDate'], PDO::PARAM_STR);
            $stmt->bindParam(':customerPartNumber', $data['customerPartNumber'], PDO::PARAM_STR);
            $stmt->bindParam(':purchaseOrder', $data['purchaseOrder'], PDO::PARAM_STR);
            $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
            $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
            $stmt->bindParam(':priority', $priority, PDO::PARAM_STR);
            $stmt->bindParam(':partials', $partials, PDO::PARAM_INT);
            $stmt->bindParam(':prototypeCheck', $prototypeCheck, PDO::PARAM_INT);
            $stmt->bindParam(':graphicsWorkOrder', $data['graphicsWorkOrder'], PDO::PARAM_STR);
            $stmt->bindParam(':instructions', $data['instructions'], PDO::PARAM_STR);
            $stmt->bindParam(':plexRequired', $plexRequired, PDO::PARAM_STR);
            $stmt->bindParam(':graphicsSalesOrder', $data['graphicsSalesOrder'], PDO::PARAM_INT);
            $stmt->bindParam(':criticalOrder', $criticalOrder, PDO::PARAM_STR);
            $stmt->execute();
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getWorkOrderById($id)
    {
        $mainQry = "
            SELECT a.*,
                concat(b.first, ' ', b.last) userCreated,
                c.name queueStatus
            FROM eyefidb.graphicsSchedule a
            LEFT JOIN db.users b
                ON b.id = a.userId
            LEFT JOIN eyefidb.graphicsQueues c
                ON c.queueStatus = a.status
            WHERE a.id = :id
            LIMIT 1
        ";
        $stmt = $this->db->prepare($mainQry);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function completeOrder($post)
    {
        $this->db->beginTransaction();
        $userTrans = array();
        try {
            $updatedId = $this->updateWorkOrderById($post);


            if ($post['shipComplete'] == 1) {
                $userTrans[] = array(
                    'field' => 'Ship completed',
                    'o' => 900,
                    'n' => 900,
                    'comment' => '',
                    'so' => $post['orderNum'],
                    'type' => 'Graphics complete',
                    'userId' => $post['userId']
                );
            }

            $userTrans[] = array(
                'field' => 'Shipment qty',
                'o' => "",
                'n' => $post['qtyShipped'],
                'comment' => "",
                'so' => $post['orderNum'],
                'type' => 'Graphics',
                'userId' => $post['userId']
            );
            
            $this->userTransaction($userTrans);

            $this->db->commit();

            return  $updatedId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function createWorkOrder($data)
    {
        $this->db->beginTransaction();

        try {
            /**
             * Create work order
             */
            $insertId = $this->insert($data);

            /**
             * Get work order info
             */
            $workOrderInfo = $this->getWorkOrderById($insertId);

            /**
             * Update work order with 'G' and update database
             */
            $orderNumber = 'G' . $insertId;
            $workOrderInfo['orderNum'] = $orderNumber;

            $this->updateWorkOrderById($workOrderInfo);

            $this->db->commit();

            return $insertId;
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getGraphicsInventoryByItemNumber($searchInventory)
    {

        $inventory = '
            SELECT Product productDescription
                , SKU_Number clientItem
                , Account_Vendor accountVendor
            FROM eyefidb.graphicsInventory a
            WHERE a.ID_Product = :itemNumber
        ';

        $stmt = $this->db->prepare($inventory);
        $stmt->bindParam(':itemNumber', $searchInventory, PDO::PARAM_STR);
        $stmt->execute();
        $result = $stmt->fetch();

        if ($result) {
            $result['productDescription'] = preg_replace('/[\x00-\x1F\x7F-\xFF]/', '', $result['productDescription']);
            return $result;
        } else {
            return array("results" => false);
        }
    }

    public function getQueues()
    {
        $mainQry = '
            SELECT a.id
                , a.name
                , a.path
                , a.queueStatus
                , a.seq
                , "false" disabled
            FROM eyefidb.graphicsQueues a
            WHERE a.queueStatus != 999
                AND a.active = 1
            ORDER BY a.seq ASC
        ';
        $query = $this->db->prepare($mainQry);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getOpenOrders()
    {

        $mainQry = '
            SELECT a.id
                , a.orderNum
                , a.itemNumber
                , a.customer
                , a.qty
                , a.dueDate
                , now() now
                , REPLACE(a.customerPartNumber, "\n", "") customerPartNumber
                , a.purchaseOrder
                , a.userId
                , a.createdDate
                , a.status
                , a.priority
                , a.active
                , datediff(a.dueDate, date(now())) age
                , holds.hits holdCount				
                , packingSlipNumber
                , a.material
                , case when a.materialSize = "" then "None" else a.materialSize end materialSize
                , a.materialLocation
                , partials
                , a.qty - a.qtyShipped openQty
                , a.qtyShipped 
                , a.instructions
                , concat(b.first, " ", b.last) userName
                , c.name queueStatus
                , CASE
                    WHEN datediff(a.dueDate, date(now())) < 0
                        THEN "pastDue"
                    WHEN datediff(a.dueDate, date(now())) = 0
                        THEN "dueToday"
                    WHEN datediff(a.dueDate, date(now())) > 0
                        THEN "future"
                    ELSE "black"
                END colorClass
                , CASE 
                    WHEN DATE(a.dueDate) = DATE(now())
                        THEN TIMESTAMPDIFF(SECOND, now(), a.createdDate) + a.priority + -999999999
                    WHEN DATE(a.dueDate) < DATE(now())
                        THEN TIMESTAMPDIFF(SECOND, now(), a.createdDate)
                    WHEN DATE(a.dueDate) > DATE(now())
                        THEN TIMESTAMPDIFF(SECOND, a.createdDate, now()) + a.priority + 999999999
                END customOrderBy
                , CASE 
                    WHEN a.status = 900 AND a.qty - a.qtyShipped != 0
                        THEN "Pending Ship"
                    WHEN  a.qty - a.qtyShipped = 0
                        THEN "Shipped Complete"
                    WHEN a.qty - a.qtyShipped != a.qty
                        THEN "Shipped Partials"
                    ELSE ""
                END shipStatus
                , issues.hits issueCount
                , a.plexRequired
                , a.plexOrdered
                , a.graphicsWorkOrder
                , concat("WO", "", a.graphicsWorkOrder) graphicsWorkOrder1
                , a.prototypeCheck
                , CASE WHEN a.qty - a.qtyShipped = 0 THEN 1 ELSE 0 END shipComplete
                , a.shippedOn
                , date(a.shippedOn) shippedOnDate
                , TIMESTAMPDIFF(MINUTE, a.createdDate, a.shippedOn) shipProcessingTime
                , a.allocQty 
                , CASE 
                    WHEN a.criticalOrder = 1
                        THEN "orangered"
                    WHEN issues.hits > 0 
                        THEN "bg-dark"
                    WHEN holds.hits > 0 
                        THEN "bg-info"
                    WHEN a.allocQty 
                        THEN "bg-warning"
                    WHEN a.priority = 10 
                        THEN "pastDue"
                    WHEN a.dueDate < curDate()
                        THEN "pastDue"
                    WHEN a.dueDate = curDate() 
                        THEN "dueToday"
                    WHEN a.dueDate > curDate()
                        THEN "future"
                END "classColors"
                , CASE 
                    WHEN issues.hits > 0 
                        THEN "Damage/Reject found"
                    WHEN holds.hits > 0 
                        THEN "Hold found"
                    WHEN a.priority = 10 
                        THEN "Hot order"
                    WHEN datediff(a.dueDate, date(now())) < 0 
                        THEN "Past due order"
                    WHEN datediff(a.dueDate, date(now())) = 0 
                        THEN "Due today order"
                    WHEN datediff(a.dueDate, date(now())) > 0 
                        THEN "Future order"
                    ELSE "Default"
                END "title"
                , a.criticalOrder
                , a.description
                , comments.hits commentCount
                , a.ordered_date
            FROM eyefidb.graphicsSchedule a
            
            LEFT JOIN (
                SELECT count(*) hits
                    , orderNum
                FROM eyefidb.holds 
                WHERE active = 1
                group by orderNum
            ) holds ON a.orderNum = holds.orderNum	
            
            LEFT JOIN db.users b
                ON b.id = a.userId
                
            LEFT JOIN eyefidb.graphicsQueues c
                ON c.queueStatus = a.status
                    AND c.active = 1
                
            LEFT JOIN (
                SELECT count(*) hits
                    , so
                FROM eyefidb.graphicsIssues 
                WHERE active = 1
                group by so
            ) issues ON a.orderNum = issues.so	
            
            LEFT JOIN (
                SELECT count(*) hits
                    , orderNum
                FROM eyefidb.comments 
                WHERE active = 1 and type = "Graphics"
                group by orderNum
            ) comments ON a.graphicsWorkOrder = comments.orderNum

            WHERE a.active = 1
                AND a.qty - a.qtyShipped != 0

            ORDER BY a.criticalOrder DESC
                , a.priority ASC
                , a.dueDate ASC
        ';
        $stmt = $this->db->prepare($mainQry);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getGraphicProductionOrders()
    {
        $queues = $this->getQueues();
        $queueName = $queues;
        $openOrders = $this->getOpenOrders();
        $totalOrders = count($openOrders);

        $in_array = array();
        foreach ($openOrders as $row) {
            $in_array[] = $row['graphicsWorkOrder'];
        }
        $in = "'" . implode("','", $in_array) . "'";

        $mainQry = "
            select a.wo_routing
                , a.wo_line
                , a.wo_nbr
                , a.wo_ord_date
                , wo_qty_ord
                , wo_qty_comp
                , wo_part
                , wo_due_date actual_due_date
                , wo_status
                , CONCAT(pt_desc1, pt_desc2) fullDesc
                , wo_rmks
                , CASE 
                        WHEN DAYOFWEEK ( a.wo_due_date ) IN (1)
                            THEN a.wo_due_date - 2
                            WHEN DAYOFWEEK ( a.wo_due_date ) IN (2, 3)
                                THEN a.wo_due_date - 4
                            WHEN DAYOFWEEK ( a.wo_due_date ) IN (4)
                                THEN a.wo_due_date - 2
                            ELSE a.wo_due_date - 2
                        END  wo_due_date 
            from wo_mstr a 
            
            LEFT JOIN ( 
                select pt_part
                    , max(pt_desc1) pt_desc1
                    , max(pt_desc2) pt_desc2
                from pt_mstr
                WHERE pt_domain = 'EYE'
                group by pt_part
            ) b ON b.pt_part = a.wo_part

            where wo_domain = 'EYE' 
            and wo_nbr IN ($in)
        ";
        $query = $this->dbQad->prepare($mainQry);
        $query->execute();
        $wo_info =  $query->fetchAll(PDO::FETCH_ASSOC);


        foreach ($queues as &$queue_row) {
            $queue_status = $queue_row['queueStatus'];
            $queue_row['orderStatus'] = array();
            foreach ($openOrders as $openOrders_row) {
                $status = $openOrders_row['status'];

                $openOrders_row['wo_mstr'] = null;
                
                foreach ($wo_info as $wo_info_row) {
                    if ($openOrders_row['graphicsWorkOrder'] == $wo_info_row['WO_NBR']) {
                        $openOrders_row['wo_mstr'] = $wo_info_row;
                        $openOrders_row['itemNumber'] = $wo_info_row['WO_PART'];
                        $openOrders_row['ordered_date'] = $wo_info_row['WO_ORD_DATE'];
                        $openOrders_row['qty'] = $wo_info_row['WO_QTY_ORD'];
                        $openOrders_row['dueDate'] = $wo_info_row['WO_DUE_DATE'];
                        $openOrders_row['actual_due_date'] = $wo_info_row['ACTUAL_DUE_DATE'];
                        $openOrders_row['wo_status'] = $wo_info_row['WO_STATUS'];
                    }
                }

                if ($queue_status == $status) {
                    $queue_row['orderStatus'][] = $openOrders_row;
                }
            }
        }

        return array(
            "totalOrders" => $totalOrders,
            "queues" => $queues,
            "queueNames" => $queueName
        );
    }
}
