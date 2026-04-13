<?php

namespace EyefiDb\Api\Shipping;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Shipping
{

    protected $db;
    public $sessionId;
    public $user_full_name;

    public function __construct($db, $dbQad)
    {

        $this->db = $dbQad;
        $this->db1 = $db;
        $this->nowDate = date("Y-m-d", time());
        $this->nowDateTime = date("Y-m-d H:i:s", time());

        $this->app_db_link = "dashboard.eye-fi.com/app/src/";
        $this->app_email_db_name = 'Eyefi Dashboard';
        $this->app_email_db_address = 'noreply@the-fi-company.com';
    }


    public function userTrans($userTrans)
    {
        try {
            foreach ($userTrans as $item) {
                $field = isset($item['field']) ? $item['field'] : "";
                $o = isset($item['o']) ? $item['o'] : "";
                $n = isset($item['n']) ? $item['n'] : "";
                $comment = isset($item['comment']) ? $item['comment'] : "";
                $so = isset($item['so']) ? $item['so'] : "";
                $type = isset($item['type']) ? $item['type'] : "";
                $partNumber = isset($item['partNumber']) ? $item['partNumber'] : "";

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
                    )
                ';
                $stmt = $this->db1->prepare($qry);
                $stmt->bindParam(':field', $field, PDO::PARAM_STR);
                $stmt->bindParam(':o', $o, PDO::PARAM_STR);
                $stmt->bindParam(':n', $n, PDO::PARAM_STR);
                $stmt->bindParam(':createDate', $this->nowDateTime, PDO::PARAM_STR);
                $stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
                $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
                $stmt->bindParam(':so', $so, PDO::PARAM_STR);
                $stmt->bindParam(':type', $type, PDO::PARAM_STR);
                $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
                $stmt->execute();
            }
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function AuthUsers()
    {
        return (object) array(
            'email' => (object) array(
                'allowEmailSend' => array(
                    'Jessica Francis', 'Ritz Dacanay', 'Christine Martin', 'Priscilla Vargas'
                ),
                'addAddress' => array(
                    'jessica.francis@the-fi-company.com', 'christine.martin@the-fi-company.com','priscilla.vargas@the-fi-company.com'
                ),
                'bcAddress' => array(
                    'ritz.dacanay@the-fi-company.com'
                )
            ),
            'edit' => array(
                'Juvenal Torres',
                'Darren McGraw',
                'Trang Tran',
                'Daniela Rumbos',
                'Ritz Dacanay',
                'Willie Jenkunprasuit',
                'Heidi Elya'
            )
        );
    }

    public function AuthUserCheck($accessSection)
    {
        if (in_array($this->user_full_name, $accessSection)) {
            return true;
        }
        return false;
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
                INSERT INTO eyefidb.workOrderOwner (
                    userName 
                    , so 
                    , fs_install
                    , createdDate
                    , createdBy
                    , fs_install_date
                    , arrivalDate
                    , shipViaAccount
                    , source_inspection_required
                    , source_inspection_completed
                    , source_inspection_waived
                    , pallet_count
                    , container
                    , container_due_date
                ) VALUES (
                    :userName 
                    , :so 
                    , :fs_install
                    , :createdDate
                    , :createdBy
                    , :fs_install_date
                    , :arrivalDate
                    , :shipViaAccount
                    , :source_inspection_required
                    , :source_inspection_completed
                    , :source_inspection_waived
                    , :pallet_count
                    , :container
                    , :container_due_date
                )
            ";
            $query = $this->db1->prepare($qry);
            $query->bindParam(":userName", $data['userName'], PDO::PARAM_STR);
            $query->bindParam(":so", $data['so'], PDO::PARAM_STR);
            $query->bindParam(":fs_install", $data['fs_install'], PDO::PARAM_STR);
            $query->bindParam(":createdDate", $this->nowDateTime, PDO::PARAM_STR);
            $query->bindParam(":createdBy", $this->sessionId, PDO::PARAM_INT);
            $query->bindParam(":fs_install_date", $data['fs_install_date'], PDO::PARAM_STR);
            $query->bindParam(":arrivalDate", $data['arrivalDate'], PDO::PARAM_STR);
            $query->bindParam(":shipViaAccount", $data['shipViaAccount'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_required", $data['source_inspection_required'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_completed", $data['source_inspection_completed'], PDO::PARAM_STR);
            $query->bindParam(":source_inspection_waived", $data['source_inspection_waived'], PDO::PARAM_STR);
            $query->bindParam(":container", $data['container'], PDO::PARAM_STR);
            $query->bindParam(":container_due_date", $data['container_due_date'], PDO::PARAM_STR);
            $query->bindParam(":pallet_count", $data['pallet_count'], PDO::PARAM_STR);
            $query->execute();

            $userTrans[] = array(
                'field' => 'New Sales Order Usr Input',
                'o' => '',
                'n' => 1,
                'comment' => '',
                'so' => $data['so'],
                'type' => 'Sales Order Shipping'
            );

            if (isset($data['userName']) && $data['userName'] != "") {
                $userTrans[] = array(
                    'field' => 'Updated Owner',
                    'o' => "",
                    'n' => $data['userName'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }

            /**
             * Save to transaction table
             */
            $this->userTrans($userTrans);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getMiscBySO($so)
    {
        try {
            $qry = "
                SELECT * 
                FROM eyefidb.workOrderOwner
                WHERE so = :so
            ";
            $query = $this->db1->prepare($qry);
            $query->bindParam(":so", $so, PDO::PARAM_STR);
            $query->execute();
            return $query->fetch();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function recordChanges($oldData, $data)
    {
        try {
            $userTrans = array();

            $r = $oldData;

            if ($r['userName'] != $data['userName']) {
                $userTrans[] = array(
                    'field' => 'Updated Owner',
                    'o' => $r['userName'],
                    'n' => $data['userName'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['fs_install'] != $data['fs_install']) {
                $userTrans[] = array(
                    'field' => 'Updated FS Install',
                    'o' => $r['fs_install'],
                    'n' => $data['fs_install'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['fs_install_date'] != $data['fs_install_date']) {
                $userTrans[] = array(
                    'field' => 'Updated FS Install Date',
                    'o' => $r['fs_install_date'],
                    'n' => $data['fs_install_date'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['arrivalDate'] != $data['arrivalDate']) {
                $userTrans[] = array(
                    'field' => 'Updated Arrival Date',
                    'o' => $r['arrivalDate'],
                    'n' => $data['arrivalDate'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['shipViaAccount'] != $data['shipViaAccount']) {
                $userTrans[] = array(
                    'field' => 'Updated Ship Via Account',
                    'o' => $r['shipViaAccount'],
                    'n' => $data['shipViaAccount'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['source_inspection_required'] != $data['source_inspection_required']) {
                $userTrans[] = array(
                    'field' => 'Updated Source Inspection',
                    'o' => $r['source_inspection_required'],
                    'n' => $data['source_inspection_required'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['source_inspection_completed'] != $data['source_inspection_completed']) {
                $userTrans[] = array(
                    'field' => 'Updated Source Inspection Completed',
                    'o' => $r['source_inspection_completed'],
                    'n' => $data['source_inspection_completed'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['source_inspection_waived'] != $data['source_inspection_waived']) {
                $userTrans[] = array(
                    'field' => 'Updated Source Inspection Waived',
                    'o' => $r['source_inspection_waived'],
                    'n' => $data['source_inspection_waived'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
            if ($r['pallet_count'] != $data['pallet_count']) {
                $userTrans[] = array(
                    'field' => 'Pallet count changed',
                    'o' => $r['pallet_count'],
                    'n' => $data['pallet_count'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }

            /**
             * Save to transaction table
             */
            $this->userTrans($userTrans);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function saveMisc($data)
    {
        $this->db1->beginTransaction();

        if (!$this->AuthUserCheck($this->AuthUsers()->edit)) {
            throw new PDOException("Access Denied. ", 401);
        }

        if ($data['so'] == "") {
            throw new PDOException("So not provided", 401);
        }

        try {

            /**
             * Check if record exists;
             */
            $old_data = $this->getMiscBySO($data['so']);

            /**
             * Update only if data exists;
             */
            if ($old_data) {
                $this->updateMisc($data);

                /**
                 * Record changes
                 */
                $this->recordChanges($old_data, $data);
            } else {

                /**
                 * Create new record if record not found in database
                 */
                $this->insertMisc($data);
            }

            /**
             * Commit if everything passed
             */
            $this->db1->commit();
        } catch (PDOException $e) {
            $this->db1->rollBack();
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getCommentsByOrderNumbers($in, $type = 'Sales Order')
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

    public function getFsIdInfoByCustomerOrderNumbers($inCO)
    {
        try {
            $fieldService = "
                select id, 
                    RequestDate, 
                    CoNumber 
                from eyefidb.fs_scheduler 
                where active = 1 
                AND CoNumber IN ($inCO)
                AND ( CoNumber != null OR CoNumber != '')
            ";
            $query = $this->db1->prepare($fieldService);
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

    public function getNotesInfoBySalesOrderNumbers($in)
    {
        try {
            $notes = "
                SELECT a.uniqueId
                    , notes
                    , a.createdDate
                    , date(a.createdDate) byDate
                    , concat(c.first, ' ', c.last) createdByName
                    , a.id
                    , a.type
                    , a.createdBy
                FROM eyefidb.notes a
                LEFT JOIN db.users c ON c.id = a.createdBy
                INNER JOIN (
                    SELECT uniqueId
                        , MAX(id) id
                        , MAX(date(createdDate)) createdDate
                    FROM eyefidb.notes
                    WHERE createdBy = :userId1
                    GROUP BY uniqueId
                ) b ON a.uniqueId = b.uniqueId AND a.id = b.id
                WHERE a.uniqueId IN ($in)
                and a.createdBy = :userId
                ORDER BY a.createdDate DESC
            ";
            $query = $this->db1->prepare($notes);
            $query->bindParam(':userId', $this->sessionId, PDO::PARAM_STR);
            $query->bindParam(':userId1', $this->sessionId, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getShippingInfo()
    {
        try {
            $mainQry = "
                select a.sod_nbr sod_nbr
                    , a.sod_due_date sod_due_date
                    , a.sod_due_date-c.so_ord_date leadTime
                    , a.sod_part sod_part
                    , a.sod_qty_ord sod_qty_ord
                    , a.sod_qty_ship sod_qty_ship
                    , a.sod_price sod_price
                    , a.sod_contr_id sod_contr_id
                    , a.sod_domain sod_domain
                    , a.sod_compl_stat sod_compl_stat
                    , a.sod_price*(a.sod_qty_ord-a.sod_qty_ship) openBalance
                    , a.sod_qty_ord-a.sod_qty_ship qtyOpen
                    , a.sod_qty_all sod_qty_all
                    , CASE 
                        WHEN b.pt_part IS NULL 
                            THEN a.sod_desc
                        ELSE b.fullDesc
                    END fullDesc
                    , c.so_cust so_cust
                    , a.sod_line sod_line
                    , c.so_ord_date so_ord_date
                    , c.so_ship so_ship
                    , case
                        when a.sod_due_date < curdate()
                            then 'Past Due'
                        when a.sod_due_date = curdate()
                            then 'Due Today'
                        when a.sod_due_date > curdate()
                            then 'Future Order'
                    end status
                    , case 
                        when a.sod_due_date < curdate() 
                            then 'badge badge-danger' 
                        when a.sod_due_date = curdate() 
                            then 'badge badge-warning' 
                        when a.sod_due_date > curdate() 
                            then 'badge badge-success' 
                    end statusClass
                    , sod_order_category sod_order_category
                    , a.sod_custpart cp_cust_part
                    , IFNULL(e.ld_qty_oh, 0) ld_qty_oh
                    , c.so_bol so_bol
                    , sod_cmtindx so_cmtindx
                    , pt_routing pt_routing
                    , curdate()-a.sod_due_date age
                    , a.sod_list_pr sod_list_pr
                    , f.cmt_cmmt 
                    , a.sod_part work_order_routing
                    , a.sod_acct
                    , c.so_shipvia so_shipvia
                from sod_det a
                
                left join (
                    select pt_part							
                        , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                        , max(pt_routing) pt_routing
                    from pt_mstr
                    where pt_domain = 'EYE'
                    group by pt_part		
                ) b ON b.pt_part = a.sod_part
                
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
                
                LEFT JOIN (
                    select a.ld_part
                        , sum(a.ld_qty_oh) ld_qty_oh
                    from ld_det a
                    JOIN loc_mstr b ON b.loc_loc = a.ld_loc 
                        AND b.loc_type = 'FG' 
                        AND loc_domain = 'EYE'
                    WHERE a.ld_domain = 'EYE'
                        AND ld_status != 'UA'
                    GROUP BY a.ld_part
                ) e ON e.ld_part = a.sod_part
                
                LEFT JOIN (
                    select cmt_cmmt
                        , cmt_indx
                    from cmt_det 
                    where cmt_domain = 'EYE' 
                ) f ON f.cmt_indx = a.sod_cmtindx
                    
                WHERE sod_domain = 'EYE'
                    AND sod_qty_ord != sod_qty_ship	
                    AND so_compl_date IS NULL
                ORDER BY a.sod_due_date ASC 
                WITH (NOLOCK)
            ";
            $query = $this->db->prepare($mainQry);
            $query->execute();
            $result = $query->fetchAll(PDO::FETCH_ASSOC);

            return $result;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function runOpenShippingReport()
    {
        try {
            $open_shipping_report = $this->getShippingInfo();
            return $this->modifyShippingReport($open_shipping_report);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function modifyShippingReport($result)
    {

        try {
            $in_array = array();
            $SOD_ORDER_CATEGORY_ARRAY = array();
            foreach ($result as $row) {
                $in_array[] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
                $SOD_ORDER_CATEGORY_ARRAY[] = $row['SOD_ORDER_CATEGORY'];
            }

            $in = "'" . implode("','", $in_array) . "'";
            $inCO = "'" . implode("','", $SOD_ORDER_CATEGORY_ARRAY) . "'";

            $recent_comments_info = $this->getCommentsByOrderNumbers($in);

            $field_service_install_Info = $this->getFsIdInfoByCustomerOrderNumbers($inCO);

            $misc_info = $this->getMiscInfoBySalesOrderNumbers($in);

            $recent_notes_info = $this->getNotesInfoBySalesOrderNumbers($in);
            foreach ($result as &$row) {

                $row['id'] = $row['SOD_NBR'] . $row['SOD_LINE'];
                $row['sales_order_line_number'] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];

                $row['CMT_CMMT'] = str_replace(';', "", $row['CMT_CMMT']);

                $row['recent_notes'] = new \stdClass();
                $row['recent_comments'] = new \stdClass();
                $row['misc'] = new \stdClass();
                $row['fs_install_info'] = new \stdClass();

                foreach ($misc_info as $misc_info_row) {
                    if ($row['sales_order_line_number'] == $misc_info_row['so']) {
                        $row['misc'] = $misc_info_row;
                    }
                }

                foreach ($recent_comments_info as $recent_comments_info_row) {
                    if ($row['sales_order_line_number'] == $recent_comments_info_row['orderNum']) {
                        $row['recent_comments'] = $recent_comments_info_row;
                    }
                }

                foreach ($recent_notes_info as &$recent_notes_info_row) {
                    if ($row['sales_order_line_number'] == $recent_notes_info_row['uniqueId']) {
                        $row['recent_notes'] = $recent_notes_info_row;
                    }
                }

                foreach ($field_service_install_Info as $field_service_install_Info_row) {
                    if ($row['SOD_ORDER_CATEGORY'] == $field_service_install_Info_row['CoNumber'] && $field_service_install_Info_row['CoNumber'] != "") {
                        $row['fs_install_info'] = $field_service_install_Info_row;
                    }
                }
            }
            return $result;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function getCONmberInfo($soNumber)
    {

        try {
            if ($soNumber == "") return [];

            $shipTo = "
                select sod_part
                    , sod_qty_ord
                    , sod_qty_ship
                    , sod_order_category
                from sod_det 
                where sod_order_category = :coNumber
            ";
            $query = $this->db->prepare($shipTo);
            $query->bindParam(":coNumber", $soNumber, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }
}
