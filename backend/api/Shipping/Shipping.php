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
    public $app_email_db_address;

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
                    'Ritz Dacanay', 'Christine Martin', 'Ralph Capote'
                ),
                'addAddress' => array(
                    'christine.martin@the-fi-company.com', 'ralph.capote@the-fi-company.com'
                ),
                'bcAddress' => array(
                    'ritz.dacanay@the-fi-company.com'
                )
            ),
            'edit' => array(
                'Monica Hubbard',
                'Juvenal Torres',
                'Nick Walter',
                'Bryon Jones',
                'Greg Nix',
                'Darren McGraw',
                'Ritz Dacanay',
                'Daniela Rumbos',
                'Heidi Elya',
                'Dominic Yadao',
                'Eye-Fi Logistics',
                'Angelica Lopez'
            )
        );
    }

    public function AuthUserCheck($accessSection)
    {
        $access = emailNotification('shipping_dashboard_access_rights', 'user_ids');

        $access = explode(',', $access);

        if (in_array($this->sessionId, $access)) {
            return true;
        }
        return false;
    }

    public function updateMisc($data)
    {
        $username = ISSET($data['userName']) ? $data['userName']: null;
        $lateReasonCodePerfDate = ISSET($data['lateReasonCodePerfDate']) ? $data['lateReasonCodePerfDate']: null;
        $shipping_db_status = ISSET($data['shipping_db_status']) ? $data['shipping_db_status']: null;
        $clear_to_build_status = ISSET($data['clear_to_build_status']) ? $data['clear_to_build_status']: null;
        $hot_order = ISSET($data['hot_order']) ? $data['hot_order']: null;
        $lateReasonCodeComment = ISSET($data['lateReasonCodeComment']) ? $data['lateReasonCodeComment']: null;

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
                    , supplyReview = :supplyReview
                    , lateReasonCodePerfDate = :lateReasonCodePerfDate
                    , shipping_db_status = :shipping_db_status
                    , clear_to_build_status = :clear_to_build_status
                    , hot_order = :hot_order
                    , lateReasonCodeComment = :lateReasonCodeComment
                WHERE so = :so
            ";
            $query = $this->db1->prepare($qry);
            $query->bindParam(":userName", $username, PDO::PARAM_STR);
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
            $query->bindParam(":supplyReview", $data['supplyReview'], PDO::PARAM_STR);
            $query->bindParam(":lateReasonCodePerfDate", $lateReasonCodePerfDate, PDO::PARAM_STR);
            $query->bindParam(":shipping_db_status", $shipping_db_status, PDO::PARAM_STR);
            $query->bindParam(":clear_to_build_status", $clear_to_build_status, PDO::PARAM_STR);
            $query->bindParam(":hot_order", $hot_order, PDO::PARAM_STR);
            $query->bindParam(":lateReasonCodeComment", $lateReasonCodeComment, PDO::PARAM_STR);
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
                    , last_mod_info
                    , tj_po_number
                    , tj_due_date
                    , g2e_comments
                    , shortages_review
                    , recoveryDate
                    , lateReasonCode
                    , supplyReview
                    , lateReasonCodePerfDate
                    , shipping_db_status
                    , clear_to_build_status
                    , hot_order
                    , lateReasonCodeComment
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
                    , :last_mod_info
                    , :tj_po_number
                    , :tj_due_date
                    , :g2e_comments
                    , :shortages_review
                    , :recoveryDate
                    , :lateReasonCode
                    , :supplyReview
                    , :lateReasonCodePerfDate
                    , :shipping_db_status
                    , :clear_to_build_status
                    , :hot_order
                    , :lateReasonCodeComment
                )
            ";

            $username = ISSET($data['userName']) ? $data['userName']: null;
            $lateReasonCodePerfDate = ISSET($data['lateReasonCodePerfDate']) ? $data['lateReasonCodePerfDate']: null;
            $shipping_db_status = ISSET($data['shipping_db_status']) ? $data['shipping_db_status']: null;
            $clear_to_build_status = ISSET($data['clear_to_build_status']) ? $data['clear_to_build_status']: null;
            $hot_order = ISSET($data['hot_order']) ? $data['hot_order']: null;
            $lateReasonCodeComment = ISSET($data['lateReasonCodeComment']) ? $data['lateReasonCodeComment']: null;

            $query = $this->db1->prepare($qry);
            $query->bindParam(":userName", $username, PDO::PARAM_STR);
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
            $query->bindParam(":tj_po_number", $data['tj_po_number'], PDO::PARAM_STR);
            $query->bindParam(":tj_due_date", $data['tj_due_date'], PDO::PARAM_STR);
            $query->bindParam(":last_mod_info", $data['last_mod_info'], PDO::PARAM_STR);
            $query->bindParam(":g2e_comments", $data['g2e_comments'], PDO::PARAM_STR);
            $query->bindParam(":shortages_review", $data['shortages_review'], PDO::PARAM_STR);
            $query->bindParam(":recoveryDate", $data['recoveryDate'], PDO::PARAM_STR);
            $query->bindParam(":lateReasonCode", $data['lateReasonCode'], PDO::PARAM_STR);
            $query->bindParam(":supplyReview", $data['supplyReview'], PDO::PARAM_STR);
            $query->bindParam(":lateReasonCodePerfDate", $lateReasonCodePerfDate, PDO::PARAM_STR);
            $query->bindParam(":shipping_db_status", $shipping_db_status, PDO::PARAM_STR);
            $query->bindParam(":clear_to_build_status", $clear_to_build_status, PDO::PARAM_STR);
            $query->bindParam(":hot_order", $hot_order, PDO::PARAM_STR);
            $query->bindParam(":lateReasonCodeComment", $lateReasonCodeComment, PDO::PARAM_STR);
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

            if(ISSET($data['userName'])){
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
            }
            
            if(ISSET($data['fs_install'])){
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
            }
            
            if(ISSET($data['fs_install_date'])){
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
        }
        if(ISSET($data['arrivalDate'])){
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
        }
        if(ISSET($data['shipViaAccount'])){
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
        }
        
        if(ISSET($data['source_inspection_required'])){
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
        }
        if(ISSET($data['source_inspection_completed'])){
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
        }
        if(ISSET($data['source_inspection_waived'])){
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
        }
        if(ISSET($data['pallet_count'])){
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
        }
        if(ISSET($data['recoveryDate'])){
            if ($r['recoveryDate'] != $data['recoveryDate']) {
                $userTrans[] = array(
                    'field' => 'Recovery date changed',
                    'o' => $r['recoveryDate'],
                    'n' => $data['recoveryDate'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
        }
        if(ISSET($data['lateReasonCode'])){
            if ($r['lateReasonCode'] != $data['lateReasonCode']) {
                $userTrans[] = array(
                    'field' => 'Late Reason Code changed',
                    'o' => $r['lateReasonCode'],
                    'n' => $data['lateReasonCode'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
        }
        if(ISSET($data['supplyReview'])){
            if ($r['supplyReview'] != $data['supplyReview']) {
                $userTrans[] = array(
                    'field' => 'Supply Review changed',
                    'o' => $r['supplyReview'],
                    'n' => $data['supplyReview'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
        }
        if(ISSET($data['lateReasonCodePerfDate'])){
            if ($r['lateReasonCodePerfDate'] != $data['lateReasonCodePerfDate']) {
                $userTrans[] = array(
                    'field' => 'Late Reason Code Perf date changed',
                    'o' => $r['lateReasonCodePerfDate'],
                    'n' => $data['lateReasonCodePerfDate'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
        }
        if(ISSET($data['clear_to_build_status'])){
            if ($r['clear_to_build_status'] != $data['clear_to_build_status']) {
                $userTrans[] = array(
                    'field' => 'Clear To Build Status changed',
                    'o' => $r['clear_to_build_status'],
                    'n' => $data['clear_to_build_status'],
                    'comment' => '',
                    'so' => $data['so'],
                    'type' => 'Sales Order Shipping'
                );
            }
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

                $this->db1->commit();
                return $data;
            } else {

                /**
                 * Create new record if record not found in database
                 */
                $this->insertMisc($data);


                $this->db1->commit();
                return $this->getMiscBySO($data['so']);
            }

            /**
             * Commit if everything passed
             */
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
                    WHERE orderNum IN ($in)
                    AND active = 1
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

    public function getMentionComments($in)
    {
        try {
            $comments = "
                SELECT group_concat(comments) all_comments, orderNum 
                FROM comments 
                WHERE orderNum IN ($in) 
                AND active = 1
                GROUP BY orderNum
            ";
            $query = $this->db1->prepare($comments);
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
                    request_date, 
                    co_number 
                from eyefidb.fs_scheduler 
                where active = 1 
                AND co_number IN ($inCO)
                AND ( co_number != null OR co_number != '')
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
                            AND uniqueId IN ($in)
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
                    , LTRIM(RTRIM(c.so_ship)) so_ship
                    , LTRIM(RTRIM(case
                        when a.sod_due_date < curdate()
                            then 'Past Due'
                        when a.sod_due_date = curdate()
                            then 'Due Today'
                        when a.sod_due_date > curdate()
                            then 'Future Order'
                    end)) status
                    , RTRIM(LTRIM(case 
                        when a.sod_due_date < curdate() 
                            then 'badge badge-danger' 
                        when a.sod_due_date = curdate() 
                            then 'badge badge-warning' 
                        when a.sod_due_date > curdate() 
                            then 'badge badge-success' 
                    end)) statusClass
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
                    , RTRIM(LTRIM(c.so_shipvia)) so_shipvia
                    , a.sod_nbr || '-' || RTRIM(LTRIM(TO_CHAR(a.sod_line))) sales_order_line_number
                    , b.pt_desc1
                    , b.pt_desc2
                    , a.sod_per_date
                    , a.sod_type
                    , c.oid_so_order_date
                    , c.oid_so_order_time
                    , oid_so_mstr
                    , a.sod_req_date
                    , a.sod_req_date-a.sod_due_date req_due_diff
                    , wo_nbr
                    , pt_rev
                from sod_det a
                
                left join (
                    select pt_part			
                        , max(pt_desc1) pt_desc1
                        , max(pt_desc2) pt_desc2				
                        , max(CONCAT(pt_desc1, pt_desc2)) fullDesc
                        , max(pt_routing) pt_routing
                        , max(pt_rev) pt_rev
                    from pt_mstr
                    where pt_domain = 'EYE'
                    group by pt_part		
                ) b ON b.pt_part = a.sod_part
                
                join (
                    select so_nbr	
                        , so_cust
                        , so_ord_date
                        , so_ship
                        , so_bol
                        , so_cmtindx
                        , so_compl_date
                        , so_shipvia
                        , LEFT(TO_CHAR(oid_so_mstr), 8) oid_so_order_date 
                        , RIGHT(TO_CHAR(ROUND(oid_so_mstr,0)), 10) oid_so_order_time
                        , oid_so_mstr
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

                left join (
                    select max(wo_nbr) wo_nbr
                        , wo_so_job
                    from wo_mstr
                    group by wo_so_job
                ) wo ON wo.wo_so_job = a.sod_nbr
                    
                WHERE sod_domain = 'EYE'
                    AND sod_qty_ord != sod_qty_ship	
                    AND so_compl_date IS NULL
                    AND sod_project = ''
            ";

            // if(
            //     $this->sessionId != 3 && 
            //     $this->sessionId != 62 && 
            //     $this->sessionId != 416
            // ){
            //     $mainQry .= "
            //         AND sod_project = ''
            //     ";
            // }
            
            $mainQry .= "
                ORDER BY a.sod_due_date ASC 
                WITH (NOLOCK)
            ";

            $query = $this->db->prepare($mainQry);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function ownerChanges()
    {
        $q = "
            SELECT so, count(*) hits
            FROM eyefidb.userTrans a 
            where a.type = 'Sales Order Shipping'  
                and date(createDate) = date(now())
                and field != 'New Sales Order Usr Input'
            group by so
        ";
        $query = $this->db1->prepare($q);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get owner production status map (owner name => is_production boolean)
     */
    public function getOwnerProductionStatusMap()
    {
        try {
            $q = "
                SELECT name, is_production
                FROM eyefidb.owners
                WHERE is_active = 1
            ";
            $query = $this->db1->prepare($q);
            $query->execute();
            $owners = $query->fetchAll(PDO::FETCH_ASSOC);
            
            // Create map with uppercase owner names as keys
            $map = array();
            foreach ($owners as $owner) {
                $owner_name_upper = strtoupper(trim($owner['name']));
                // Convert string "0"/"1" to boolean
                $map[$owner_name_upper] = ($owner['is_production'] == 1 || $owner['is_production'] === '1' || $owner['is_production'] === true);
            }
            
            return $map;
        } catch (PDOException $e) {
            // Return empty map on error to prevent breaking the entire report
            error_log('Error fetching owner production status: ' . $e->getMessage());
            return array();
        }
    }

    public function getProductionCommitDateChangeCount($so)
    {
        $q = "
            select count(*) hits
            from eyefidb.userTrans  
            WHERE so = :so
                and field = 'Recovery date changed'
        ";
        $query = $this->db1->prepare($q);
        $query->bindParam(":so", $so, PDO::PARAM_STR);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }


    public function shippingChanges($in)
    {
        try {
            $q = "
                SELECT *, concat(so, '-', line) so_line, date(created_date) recorded_date
                FROM eyefidb.osor_changes 
                WHERE concat(so, '-', line) IN ($in)
                ORDER BY osor_changes.id DESC
            ";
            $query = $this->db1->prepare($q);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function shippingChangesAll()
    {
        try {
            $q = "
                SELECT *
                FROM eyefidb.osor_changes 
                ORDER BY osor_changes.id DESC
            ";
            $query = $this->db1->prepare($q);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
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
            //$SOD_ORDER_CATEGORY_ARRAY = array();
            foreach ($result as $row) {
                $in_array[] = $row['SOD_NBR'] . '-' . $row['SOD_LINE'];
                //$SOD_ORDER_CATEGORY_ARRAY[] = $row['SOD_ORDER_CATEGORY'];
            }

            $in = "'" . implode("','", $in_array) . "'";
            //$inCO = "'" . implode("','", $SOD_ORDER_CATEGORY_ARRAY) . "'";

            $recent_comments_info = $this->getCommentsByOrderNumbers($in);

            //$field_service_install_Info = $this->getFsIdInfoByCustomerOrderNumbers($inCO);

            $misc_info = $this->getMiscInfoBySalesOrderNumbers($in);

            $recent_notes_info = $this->getNotesInfoBySalesOrderNumbers($in);

            $recent_owner_changes = $this->ownerChanges();

            $all_mention_comments = $this->getMentionComments($in);
            
            // Get owner production status map
            $owner_production_map = $this->getOwnerProductionStatusMap();

            //$shipping_changes = $this->shippingChanges($in);

            foreach ($result as &$row) {

                $row['id'] = $row['SOD_NBR'] . $row['SOD_LINE'];
                $row['sales_order_line_number'] = $row['SALES_ORDER_LINE_NUMBER'];

                $row['CMT_CMMT'] = str_replace(';', "", $row['CMT_CMMT']);

                $row['SOD_CONTR_ID'] = preg_replace('/[^a-zA-Z0-9_-]/', '', $row['SOD_CONTR_ID']); 
                $row['CMT_CMMT'] = preg_replace('/[^a-zA-Z0-9_-]/', ' ', $row['CMT_CMMT']); 

                
                $row['recent_notes'] = new \stdClass();
                $row['recent_comments'] = new \stdClass();
                $row['misc'] = new \stdClass();
                //$row['fs_install_info'] = new \stdClass();
                $row['recent_owner_changes'] = new \stdClass();
                $row['all_mention_comments'] = new \stdClass();
                //$row['shipping_changes'] = [];

                //oder date time 

                //$time = strtotime($row['OID_SO_ORDER_DATE']);
                //$ms = $row['OID_SO_ORDER_TIME'];
                //$row['oid_ordered_dateTime'] = date("Y-m-d", $time ) . ' '. gmdate("g:i:s A", $ms);

                foreach ($misc_info as $misc_info_row) {
                    if ($row['sales_order_line_number'] == $misc_info_row['so']) {
                        $row['misc'] = $misc_info_row;
                        
                        // Add owner production status and owner_name to misc object
                        if (!empty($misc_info_row['userName'])) {
                            $owner_name_upper = strtoupper(trim($misc_info_row['userName']));
                            $row['misc']['owner_is_production'] = isset($owner_production_map[$owner_name_upper]) ? $owner_production_map[$owner_name_upper] : false;
                            $row['misc']['owner_name'] = $misc_info_row['userName']; // Also set owner_name for consistency
                        } else {
                            $row['misc']['owner_is_production'] = false;
                            $row['misc']['owner_name'] = null;
                        }
                        
                        // Also set at root level for easier access
                        $row['owner_name'] = $misc_info_row['userName'] ?? null;
                        $row['owner_is_production'] = $row['misc']['owner_is_production'];
                    }
                }

                foreach ($recent_owner_changes as $recent_owner_changes_row) {
                    if ($row['sales_order_line_number'] == $recent_owner_changes_row['so']) {
                        $row['recent_owner_changes'] = $recent_owner_changes_row;
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

                foreach ($all_mention_comments as &$all_mention_comments_row) {
                    if ($row['sales_order_line_number'] == $all_mention_comments_row['orderNum']) {
                        $row['all_mention_comments'] = $all_mention_comments_row;
                    }
                }

                // foreach ($field_service_install_Info as $field_service_install_Info_row) {
                //     if ($row['SOD_ORDER_CATEGORY'] == $field_service_install_Info_row['co_number'] && $field_service_install_Info_row['co_number'] != "") {
                //         $row['fs_install_info'] = $field_service_install_Info_row;
                //     }
                // }
                // foreach ($shipping_changes as $shipping_changes_row) {
                //     if ($row['sales_order_line_number'] == $shipping_changes_row['so_line']) {
                //         $row['shipping_changes'][] = $shipping_changes_row;
                //     }
                // }
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

    public function shippingChangesReport($dateFrom)
    {

        $shipTo = "
            select data
            from eyefidb.shipping_changes 
            where date(created_date) = :dateFrom
        ";
        $query = $this->db1->prepare($shipTo);
        $query->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $query->execute();
        $results = $query->fetch(PDO::FETCH_ASSOC);

        if ($results) {
            return array(
                "results" => json_decode($results['data']),
                "minMaxDates" => $this->shippingChangesReportMinMax()
            );
        } else {
            return [];
        }
    }

    public function shippingChangesReportMinMax()
    {

        $shipTo = "
            SELECT max(date(created_date)) max_date,
            min(date(created_date)) min_date 
            FROM eyefidb.shipping_changes
        ";
        $query = $this->db1->prepare($shipTo);
        $query->execute();
        return $query->fetch(PDO::FETCH_ASSOC);
    }

    public function getLineNumbers()
    {

        try {
            if ($_GET['so_number'] == "") return [];

            $shipTo = "
select case when sod_custpart <> '' THEN  sod_custpart else a.sod_part END sod_part
                    , a.sod_qty_ord
                    , a.sod_qty_ship
                    , a.sod_order_category
                    , b.pt_desc1
                    , b.pt_desc2
                    , a.sod_line
                    , c.so_rmks
                    , c.so_po
                    , case when c.so_ship = 'NV.PROTO' THEN 'R200' ELSE 'Z024' END to_loc
                from sod_det a
                left join (
                    select pt_part			
                        , max(pt_desc1) pt_desc1
                        , max(pt_desc2) pt_desc2		
                    from pt_mstr
                    where pt_domain = 'EYE'
                    group by pt_part		
                ) b ON b.pt_part = a.sod_part
                join so_mstr c on c.so_nbr = a.sod_nbr and so_domain = 'EYE' AND so_cust = 'INTGAM'
                where a.sod_nbr = :sod_nbr and a.sod_qty_ord > 0 and sod_domain = 'EYE'
                order by a.sod_line ASC
            ";
            $query = $this->db->prepare($shipTo);
            $query->bindParam(":sod_nbr", $_GET['so_number'], PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function automatedIGTTransfer($data){


        //download to serve then add as attachment
        try {
        $this->generateIGTransferHTML($data);

        $file = "/var/www/html/attachments/igtTransfer/igtTransfer.docx";
		$mail = new PHPMailer(true);
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
		$mail->Priority = 2;
		$mail->isHTML(true);
            $mail->CharSet = 'UTF-8';		
        $mail->Subject = "test";

        $mail->addAddress('ritz.dacanay@the-fi-company.com', 'Ritz Dacanay');     //Add a recipient

        $mail->addAttachment($file);         //Add attachments

        $mail->Body =  'sdfasdf';

		$mail->send();
    } catch (Exception $e) {
            echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
        }
        
    }
    
    public function generateIGTransferHTML($data){
        $file = "/var/www/html/attachments/igtTransfer/igtTransfer.html";
        // Open the file to get existing content
        // Append a new person to the file
        $current = '
            <!doctype html><html>
            <head><meta charset="utf-8">
            <title>new file</title>
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">

            </head><body>
            
            <div id="workOrder" >
  <div class="row">
    <div class="col-lg-12">

      <div class="row">
        <div class="col-lg-6 mb-5  text-center" style="float:left">
          <img src="https://dashboard.eye-fi.com/attachments/igt.png" style="width:300px">
        </div>
        <div class="col-lg-6 mb-5 text-center" style="float:right">
          <h2 style="text-transform: uppercase;"><b>Product Transfer Form</b></h2>
          <p style="color:blue">IGT Internal transaction: 311 to {{to_loc}}</p>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-7 mb-3 text-center">
          <div style="margin-left:10px;position:absolute;bottom:3px;text-align: left;left:120px">
            <p class="pb-0 mb-0" *ngIf="transfer_reference"><b>Transfer Reference:</b> <span
                style="text-decoration: underline;"> {{transfer_reference}}</span> </p>
            <p class="pb-0 mb-0" *ngIf="!transfer_reference"><b>Transfer Reference:</b> _________________________ </p>
            <p class="pb-0 mb-0" *ngIf="description"><b>Description:</b> <span style="text-decoration: underline;">
                {{description}}</span></p>
            <p class="pb-0 mb-0" *ngIf="!description"><b>Description:</b> _____________________________ </p>
          </div>
        </div>
        <div class="col-lg-5 mb-3">
          Date: <span style="text-decoration: underline;">{{date}}</span>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-12 mb-4">
          <table class="table table-bordered table-sm">
            <thead style="background-color:#E0E0E0;font-weight: bold;">
              <tr>
                <th>SO Line #</th>
                <th>PART#</th>
                <th>DESCRIPTION</th>
                <th>QTY</th>
                <th>FROM / LOC</th>
                <th>TO / LOC</th>
                <th>Pallet #</th>
                <th>S/N</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of data">
                <td>{{row.so_line}}</td>
                <td>{{row.part}}</td>
                <td>{{row.description}}</td>
                <td>{{row.qty}}</td>
                <td>{{row.from_loc}}</td>
                <td>{{row.to_loc}}</td>
                <td>{{row.pallet_number}}</td>
                <td>{{row.sn}}</td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>

      <div class="row">
        <div class="col-lg-12 mb-3">
          <div style="margin-left:200px">
            <p>Eyefi Signature: ____________________________</p>
            <p>Print Name: _________________________________</p>
            <p>Date: <span style="text-decoration: underline;">{{date}}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>



            </body></html>
        ';
        // Write the contents back to the file
        file_put_contents($file,$current);
    }

    
}
