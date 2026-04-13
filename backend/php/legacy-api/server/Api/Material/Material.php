<?php

/******** NOT IN USE */

namespace EyefiDb\Api\Material;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

/**
 * Main material class
 * Includes crud operations
 * Inclues sending email
 */
class Material
{

    /**
     * Undocumented variable
     *
     * @var [type]
     */
    public $sessionId;
    public $full_name;

    public function __construct($db, $dbQad)
    {
        $this->db = $db;
        $this->db1 = $dbQad;
        $this->nowDate = date("Y-m-d H:i:s", time());

        $this->app_material_request_form_hot_emails = 'eyefilogistics@the-fi-company.com';
        $this->app_material_request_form_hot_emails1 = 'darren.mcgraw@the-fi-company.com';
        $this->app_material_request_form_hot_emails2 = 'bryon.jones@the-fi-company.com';
        //$this->app_material_request_form_hot_emails3 = 'ritz.dacanay@the-fi-company.com';

        $this->nowDateTime = date("Y-m-d", time());
    }

    /**
     * Record material transactions
     *
     * @param [type] $userTrans
     * @return void
     */
    public function transaction($userTrans)
    {

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
            $uniqueId = isset($item['uniqueId']) ? $item['uniqueId'] : NULL;

            $qry = '
                INSERT INTO eyefidb.mrf_trans (
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
                    , uniqueId
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
                    , :uniqueId
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
            $stmt->bindParam(':uniqueId', $uniqueId, PDO::PARAM_INT);
            $stmt->execute();
        }
    }

    public function checkKeys($keys, $data)
    {
        $entries = $keys;
        $allPassed = true;

        foreach ($entries as $entry) {
            if (!isset($data[$entry])) {
                if (!array_key_exists($entry, $data)) {
                    echo ' ' . $entry;
                    $allPassed = false;
                }
            }
        }

        return $allPassed;
    }
    /**
     * Update header details
     * Ensure all the 
     *
     * @param [object] $data
     * @return object
     */
    public function updateHeaderDetails($data)
    {
        /**
         * Keys are required before updating header details
         */
        $entries = array(
            "requestor",
            "lineNumber",
            "pickList",
            "dueDate",
            "specialInstructions",
            "active",
            "deleteReason",
            "deleteReasonDate",
            "deleteReasonBy",
            "pickedCompletedDate",
            "priority",
            "validated",
            "id",
            "isCableRequest"
        );

        if (!$this->checkKeys($entries, $data)) {
            throw new PDOException(' Missing update keys', 500);
        }

        try {

            $qry = "
                UPDATE eyefidb.mrf
                SET requestor = :requestor
                    , lineNumber = :lineNumber
                    , pickList = :pickList
                    , dueDate = :dueDate
                    , specialInstructions = :specialInstructions
                    , active = :active 
                    , deleteReason = :deleteReason
                    , deleteReasonDate = :deleteReasonDate
                    , deleteReasonBy = :deleteReasonBy
                    , pickedCompletedDate = :pickedCompletedDate
                    , priority = :priority
                    , validated = :validated
                    , assemblyNumber = :assemblyNumber
                    , isCableRequest = :isCableRequest
                WHERE id = :id
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(':requestor', $data['requestor'], PDO::PARAM_STR);
            $query->bindParam(':lineNumber', $data['lineNumber'], PDO::PARAM_STR);
            $query->bindParam(':pickList', $data['pickList'], PDO::PARAM_STR);
            $query->bindParam(':dueDate', $data['dueDate'], PDO::PARAM_STR);
            $query->bindParam(':specialInstructions', $data['specialInstructions'], PDO::PARAM_STR);
            $query->bindParam(':active', $data['active'], PDO::PARAM_INT);
            $query->bindParam(':deleteReason', $data['deleteReason'], PDO::PARAM_STR);
            $query->bindParam(':deleteReasonDate', $data['deleteReasonDate'], PDO::PARAM_STR);
            $query->bindParam(':deleteReasonBy', $data['deleteReasonBy'], PDO::PARAM_STR);
            $query->bindParam(':pickedCompletedDate', $data['pickedCompletedDate'], PDO::PARAM_STR);
            $query->bindParam(':priority', $data['priority'], PDO::PARAM_STR);
            $query->bindParam(':validated', $data['validated'], PDO::PARAM_STR);
            $query->bindParam(':assemblyNumber', $data['assemblyNumber'], PDO::PARAM_STR);
            $query->bindParam(':isCableRequest', $data['isCableRequest'], PDO::PARAM_STR);
            $query->bindParam(':id', $data['id'], PDO::PARAM_INT);
            $query->execute();

            return $query->rowCount() ? 1 : 0;
        } catch (PDOException $e) {
            http_response_code(500);
            return $e->getMessage();
        }
    }

    /**
     * Update line details
     *
     * @param [array] $data
     * @return array
     */
    public function updateLineDetails($data)
    {

        /**
         * Keys are required before updating header details
         */
        $entries = array(
            'trType',
            'ac_code',
            'locationPickFrom',
            'reasonCode',
            'notes',
            'qty',
            'active',
            'deleteReason',
            'deleteReasonDate',
            'deleteReasonBy',
            'printedBy',
            'printedDate',
            'pickCompletedDate',
            'qtyPicked',
            'id'
        );

        if (!$this->checkKeys($entries, $data[0])) {
            throw new PDOException(' Missing update keys', 500);
        }

        try {
            $qry = "
                UPDATE eyefidb.mrf_det
                SET trType = :trType
                    , ac_code = :ac_code
                    , locationPickFrom = :locationPickFrom
                    , reasonCode = :reasonCode
                    , notes = :notes
                    , qty = :qty
                    , active = :active 
                    , deleteReason = :deleteReason
                    , deleteReasonDate = :deleteReasonDate
                    , deleteReasonBy = :deleteReasonBy
                    , printedBy = :printedBy
                    , printedDate = :printedDate
                    , pickCompletedDate = :pickCompletedDate
                    , qtyPicked = :qtyPicked
                WHERE id = :id
            ";
            $query = $this->db->prepare($qry);

            foreach ($data as $item) {
                $query->bindParam(':trType', $item['trType'], PDO::PARAM_STR);
                $query->bindParam(':ac_code', $item['ac_code'], PDO::PARAM_STR);
                $query->bindParam(':locationPickFrom', $item['locationPickFrom'], PDO::PARAM_STR);
                $query->bindParam(':reasonCode', $item['reasonCode'], PDO::PARAM_STR);
                $query->bindParam(':notes', $item['notes'], PDO::PARAM_STR);
                $query->bindParam(':qty', $item['qty'], PDO::PARAM_STR);
                $query->bindParam(':active', $item['active'], PDO::PARAM_INT);
                $query->bindParam(':deleteReason', $item['deleteReason'], PDO::PARAM_STR);
                $query->bindParam(':deleteReasonDate', $item['deleteReasonDate'], PDO::PARAM_STR);
                $query->bindParam(':deleteReasonBy', $item['deleteReasonBy'], PDO::PARAM_STR);
                $query->bindParam(':printedBy', $item['printedBy'], PDO::PARAM_STR);
                $query->bindParam(':printedDate', $item['printedDate'], PDO::PARAM_STR);
                $query->bindParam(':pickCompletedDate', $item['pickCompletedDate'], PDO::PARAM_STR);
                $query->bindParam(':qtyPicked', $item['qtyPicked'], PDO::PARAM_STR);
                $query->bindParam(':id', $item['id'], PDO::PARAM_INT);
                $query->execute();
            }

            return $query->rowCount() ? 1 : 0;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
            $this->db->rollBack();
        }
    }

    /**
     * Create header material request
     *
     * @param [type] $data
     * @return void
     */
    public function createMaterialRequest($data)
    {

        try {
            $qry = "
                INSERT INTO eyefidb.mrf(
                    requestor
                    , lineNumber
                    , pickList
                    , dueDate
                    , specialInstructions
                    , createdBy
                    , createdDate
                    , priority
                    , validated
                    , assemblyNumber
                    , isCableRequest
                ) 
                VALUES(
                    :requestor
                    , :lineNumber
                    , :pickList
                    , :dueDate
                    , :specialInstructions
                    , :createdBy
                    , :createdDate
                    , :priority
                    , :validated
                    , :assemblyNumber
                    , :isCableRequest
                )
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(':requestor', $data['requestor'], PDO::PARAM_STR);
            $query->bindParam(':lineNumber', $data['lineNumber'], PDO::PARAM_STR);
            $query->bindParam(':pickList', $data['pickList'], PDO::PARAM_STR);
            $query->bindParam(':dueDate', $data['dueDate'], PDO::PARAM_STR);
            $query->bindParam(':specialInstructions', $data['specialInstructions'], PDO::PARAM_STR);
            $query->bindParam(':createdBy', $data['createdBy'], PDO::PARAM_INT);
            $query->bindParam(':createdDate', $data['createdDate'], PDO::PARAM_STR);
            $query->bindParam(':priority', $data['priority'], PDO::PARAM_INT);
            $query->bindParam(':validated', $data['validated'], PDO::PARAM_STR);
            $query->bindParam(':assemblyNumber', $data['assemblyNumber'], PDO::PARAM_STR);
            $query->bindParam(':isCableRequest', $data['isCableRequest'], PDO::PARAM_STR);
            $query->execute();
            return $this->db->lastInsertId();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Send email when a material request is submitted
     *
     * @param [type] $lastInsertId
     * @param [type] $data
     * @param [type] $details
     * @param [type] $callBackLink
     * @return void
     */
    public function sendEmail($lastInsertId, $data, $details, $callBackLink)
    {
        //send email if only request is urgent
        $mail = new PHPMailer(true);
        $mail->setFrom('noreply@eye-fi.com', MAIL_NAME);
        $mail->addAddress('ritz.dacanay@the-fi-company.com');

        $addresses = explode(',', emailNotification('create_material_request'));
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }


        // $mail->addAddress($this->app_material_request_form_hot_emails);
        // $mail->addAddress($this->app_material_request_form_hot_emails1);
        // $mail->addAddress($this->app_material_request_form_hot_emails2);
        //$mail->addAddress($this->app_material_request_form_hot_emails3);

        $mail->isHTML(true);
            $mail->CharSet = 'UTF-8';
        $mail->Subject = "Material Request Submitted - MRF#" . $lastInsertId;

        $link = $callBackLink;

        $mail->Body = '<html><body style="padding:50px">';

        $mail->Body .= "Please do not reply to this email. To view this MRF, click on the direct link to <a href='{$link}'>Material Request Validation</a>. <br><br>";
        $mail->Body .= 'Material request has been submitted MRF#' . $lastInsertId . '.  The Material Request info and the details are included below. <br>';
        $mail->Body .= '<br>';
        $mail->Body .= 'Created Date:  ' . $data['createdDate'] . '<br>';
        $mail->Body .= 'Due Date:  ' . $data['dueDate'] . '<br>';
        $mail->Body .= 'Work Order:  ' . $data['pickList'] . '<br>';
        $mail->Body .= 'Priority:  ' . $data['priority'] . '<br>';
        $mail->Body .= 'Requestor:  ' . $data['requestor'] . '<br><br>';
        $mail->Body .= 'Special Instructions:  <br><br> ' . $data['specialInstructions'] . '<br><br>';

        $mail->Body .= '<table border="1" rules="all" style="border-color: #666;" cellpadding="5">';
        $mail->Body .= "<tr style='background: #eee;'>";
        $mail->Body .= "<td><strong>Part Number</strong></td>";
        $mail->Body .= "<td><strong>Qty Requested</strong></td>";
        $mail->Body .= "<td><strong>Reason Code</strong></td>";
        $mail->Body .= "</tr>";

        foreach ($details as $row) {
            $mail->Body .= "<tr> \r\n";
            $mail->Body .= "<td>" . $row['partNumber'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['qty'] . "</td> \r\n";
            $mail->Body .= "<td>" . $row['reasonCode'] . "</td> \r\n";
            $mail->Body .= "</tr> \r\n";
        }

        $mail->Body .= "</table>";

        $mail->Body .= '<br>';
        $mail->Body .= '<hr>';
        $mail->Body .= "*Please note that you must be logged into the EyeFi Dashboard before clicking on the  link.<br><br>";
        $mail->Body .= "Thank you <br>";
        $mail->Body .= "</body></html>";

        //send email only if shortages are found
        $mail->send();
    }

    /**
     * Create line details
     *
     * @param [type] $mrf_id
     * @param [type] $details
     * @return void
     */
    public function createLineDetails($mrf_id, $details)
    {

        try {
            $qry = "
                INSERT INTO eyefidb.mrf_det(
                    mrf_id
                    , partNumber
                    , qty
                    , createdDate
                    , createdBy
                    , reasonCode
                    , ac_code
                    , trType
                    , cost
                )  VALUES (
                    :mrf_id
                    , :partNumber
                    , :qty
                    , :createdDate
                    , :createdBy
                    , :reasonCode
                    , :ac_code
                    , :trType
                    , :cost
                )
            ";
            $query = $this->db->prepare($qry);

            foreach ($details as $item) {

                //auto fill per mary tavita
                //set account and transaction type
                $tr_type = null;
                $ac_code = null;
                if ($item['reasonCode'] == 'Rework' || $item['reasonCode'] == 'IGT Rework') {
                    $ac_code = '';
                    $tr_type = 'ISS-WO';
                } else if ($item['reasonCode'] == 'Proto') {
                    $ac_code = '67500';
                    $tr_type = 'ISS-UNP';
                } else if ($item['reasonCode'] == 'Service') {
                    $ac_code = '52115';
                    $tr_type = 'ISS-UNP';
                } else if ($item['reasonCode'] == 'Kitting') {
                    $ac_code = '50001';
                    $tr_type = 'ISS-UNP';
                }

                $pt = strtoupper($item['partNumber']);

                $query->bindParam(':mrf_id', $mrf_id, PDO::PARAM_INT);
                $query->bindParam(':partNumber', $pt, PDO::PARAM_STR);
                $query->bindParam(':qty', $item['qty'], PDO::PARAM_STR);
                $query->bindParam(':createdDate', $item['createdDate'], PDO::PARAM_STR);
                $query->bindParam(':createdBy', $item['createdBy'], PDO::PARAM_INT);
                $query->bindParam(':reasonCode', $item['reasonCode'], PDO::PARAM_STR);
                $query->bindParam(':cost', $item['cost'], PDO::PARAM_STR);
                $query->bindParam(':ac_code', $ac_code, PDO::PARAM_STR);
                $query->bindParam(':trType', $tr_type, PDO::PARAM_STR);
                $query->execute();
            }
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }


    

    /**
     * This method will create the material header, line details, and send email
     *
     * @param [type] $post
     * @return void
     */
    public function generateMaterialRequest($post, $sendEmail = true)
    {

        $this->db->beginTransaction();

        try {
            //auto fill per mary tavita
            //send to validation queue if below criteria is met

            $post['validated'] = null;
            $auto_fill_found = 0;
            $auto_fill_check = 0;


            //dont forget to add transaction type and account code on line 300
            foreach ($post['details'] as $item) {
                if (
                    // $item['reasonCode'] == 'Rework' ||
                    // $item['reasonCode'] == 'IGT Rework' ||
                    $item['reasonCode'] == 'Proto' ||
                    $item['reasonCode'] == 'Service' ||
                    $item['reasonCode'] == 'Kitting'
                ) {
                    $auto_fill_found = 1;
                } else {
                    $auto_fill_check = 1;
                }
            }

            //if found in auto fill and does not have any other reason codes than set queue to 20
            if ($auto_fill_found > 0 && $auto_fill_check == 0) {
                $post['validated'] = $this->nowDate;
            }

            $lastInsertId = $this->createMaterialRequest($post);
            $this->createLineDetails($lastInsertId, $post['details']);

            if ($sendEmail)
                $sendEmail = $this->sendEmail($lastInsertId, $post, $post['details'], $post['callbackUrl'] . $lastInsertId);

            $this->db->commit();

            return $lastInsertId;
        } catch (PDOException $e) {
            http_response_code(500);
            $this->db->rollBack();
            die($e->getMessage());
        }
    }

    /**
     * Get max comment by type
     *
     * @param string $type
     */
    public function comments($type = 'Material Request')
    {
        try {
            $comments = "
				SELECT a.orderNum
					, a.comments
					, a.createdDate
					, date(a.createdDate) byDate
				FROM eyefidb.comments a
				INNER JOIN (
					SELECT orderNum
						, MAX(id) id
						, MAX(date(createdDate)) createdDate
					FROM eyefidb.comments
					GROUP BY orderNum
				) b ON a.orderNum = b.orderNum AND a.id = b.id
				WHERE type = :type
                AND active = 1
			";
            $query = $this->db->prepare($comments);
            $query->bindParam(':type', $type, PDO::PARAM_STR);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Get material request line details by id
     *
     * @param [number] $id
     */
    public function getLineDetailsById($id)
    {
        try {
            $qry = "
                SELECT a.*, 
                    b.id shortagesId,
                    b.supplyCompleted,
                    b.receivingCompleted,
                    b.deliveredCompleted,
                    b.productionIssuedDate,
                    b.poNumber
                FROM eyefidb.mrf_det a
                LEFT JOIN eyefidb.shortageRequest b on b.mrfId = a.mrf_id 
                    and b.mrf_line = a.id
                WHERE a.mrf_id = :id
                ORDER BY a.id ASC
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(':id', $id, PDO::PARAM_INT);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Get material header details by id
     *
     * @param [number] $id
     */
    public function getheaderDetailById($id)
    {

        try {
            $qry = "
                SELECT a.*
                FROM eyefidb.mrf a			
                WHERE a.id = :id
                ORDER BY a.id DESC
            ";
            $query = $this->db->prepare($qry);
            $query->bindParam(':id', $id, PDO::PARAM_INT);
            $query->execute();
            return $query->fetch();
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * This method will generate the open material request validation report
     *
     * @param [number] $id
     * @return void
     */
    public function getHeaderAndLineDetailsById($id)
    {

        try {
            $headerDetails = $this->getheaderDetailById($id);
            $lineDetails = $this->getLineDetailsById($id);
            $comments = $this->comments();


            foreach ($lineDetails as &$row) {
                $row['COMMENTS'] = false;
                $row['COMMENTSMAX'] = '';
                $row['COMMENTSCLASS'] = "";
                $row['headerInfo'] = new \stdClass;

                //comments
                foreach ($comments as $rowComments) {
                    $row['uniqueId'] = $row['mrf_id'] . '-' . $row['id'];
                    if ($row['uniqueId'] == $rowComments['orderNum']) {
                        $row['COMMENTS'] = true;
                        $row['COMMENTSMAX'] = $rowComments['comments'];

                        ///color the comments 
                        if ($rowComments['byDate'] == $this->nowDateTime) {
                            $row['COMMENTSCLASS'] = "text-success";
                        } else {
                            $row['COMMENTSCLASS'] = "text-info";
                        }
                    }
                }

                $row['headerInfo'] = $headerDetails;
                
            }

            $headerDetails['details'] = $lineDetails;

            return $headerDetails;
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Get all data
     *
     * @return void
     */
    public function getOpenValidationReport()
    {

        try {
            $qry = "
                SELECT a.*
                    , b.detailOpenCount
                FROM eyefidb.mrf a
                JOIN (
                    SELECT count(mrf_id) detailOpenCount
                        , mrf_id
                    FROM eyefidb.mrf_det
                    WHERE active = 1
                    GROUP BY mrf_id
                ) b ON b.mrf_id = a.id			
                WHERE detailOpenCount > 0
                    AND a.validated IS NULL
                    AND active = 1
                ORDER BY 
                    CASE 	
                        WHEN priority = 'true'
                            THEN 'HOT ORDER'
                        ELSE 'Standard Order'
                    END, 
                    a.dueDate, 
                    a.createdDate
            ";
            $query = $this->db->prepare($qry);
            $query->execute();
            return $query->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Search qad database by item
     *
     */
    public function searchItemByQadPartNumber($data)
    {

        $data = json_decode($data, true);
        $items = array();

        foreach ($data as $row) {
            $items[] = strtoupper($row['partNumber']);
        }

        $in  = str_repeat('?,', count($items) - 1) . '?';

        $mainQry = "
            select sum(cast(in_qty_oh as numeric(36,2))) qtyOnHand  
                , sum(cast(in_qty_All as numeric(36,2))) totalAvail 
                , max(fullDesc) fullDesc
                ,  max(cast(sct_cst_tot as numeric(36,2))) sct_cst_tot
                , UPPER(b.in_part) in_part
            from in_mstr b 
            left join (
                select max(pt_desc1 || ' ' || pt_desc2) fullDesc
                    , pt_part pt_part
                from pt_mstr 
                where pt_domain = 'EYE'
                GROUP BY pt_part
            ) a ON b.in_part = a.pt_part
            left join (
                select upper(sct_part) sct_part
                    , max(sct_cst_tot) sct_cst_tot
                from sct_det
                WHERE sct_sim = 'Standard' 
                    and sct_domain = 'EYE' 
                    and sct_site  = 'EYE01'
                group by upper(sct_part)
            ) sct ON sct.sct_part = b.in_part
            WHERE b.in_part IN ($in)
                AND in_domain = 'EYE'
            group by UPPER(b.in_part)
            WITH (NOLOCK)
        ";
        $query = $this->db1->prepare($mainQry);
        $query->execute($items);
        $results = $query->fetchAll(PDO::FETCH_ASSOC);

        foreach ($data as &$row1) {
            $row1['message'] = '---ITEM NOT FOUND---';
            $row1['hasError'] = true;
            $row1['availableQty'] = 0;
            $row1['description'] = '';
            $row1['cost'] = 0;
            $item = strtoupper($row1['partNumber']);
            foreach ($results as $row) {
                if ($item == $row['IN_PART']) {
                    $row1['message'] = '';
                    $row1['hasError'] = false;
                    $row1['availableQty'] = $row['QTYONHAND'];
                    $row1['description'] = $row['FULLDESC'];
                    $row1['cost'] = $row['SCT_CST_TOT'];
                }
            }
        }

        return $data;
    }

    public function pickSheetPrint($mrfId, $data)
    {
        $message = "Printing...";
        $isPrintedFound = false;

        /**
         * Valdiation
         * Check if request isn't already printed
         * Prevent duplicate picking
         */
        $isPrintedResults = $this->getLineDetailsById($mrfId);

        if (count($isPrintedResults) > 0) {

            foreach ($isPrintedResults as $row) {
                if ($row['printedDate'] != null) {

                    $isPrintedFound = $row['printedBy'];

                    break;
                }
            }
        }

        if ($isPrintedFound) {
            $message = 'This MR was printed by ' . $isPrintedFound . '. Unable to print. ';

            return array("message" => $message, "printed" => 0);
        }

        /**
         * If not printed, proceed
         */
        try {

            /**
             * If everything pass validation, update printedBy and printed date
             */
            $message = $this->updateLineDetails($data);

            return array("message" => $message, "printed" => 1);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    /**
     * Get open picks
     */
    public function getOpenPicks()
    {

        try {
            $commentInfo = $this->comments();

            $qry = "
                SELECT a.*
                    , b.printedBy
                    , b.printedDate
                    , b.notes
                    , TIMESTAMPDIFF(SECOND, b.printedDate, now()) timeDiff
                FROM eyefidb.mrf a
                LEFT JOIN (
                    SELECT max(printedBy) printedBy
                        , max(printedDate) printedDate
                        , max(notes) notes
                        , mrf_id
                    FROM eyefidb.mrf_det 
                    where qty != qtyPicked
                    GROUP BY mrf_id
                    ORDER BY printedDate DESC
                ) b ON b.mrf_id = a.id			
                WHERE a.validated IS NOT NULL
                    AND pickedCompletedDate IS NULL
                    AND a.active = 1
                ORDER BY 
                    CASE 	
                        WHEN priority = 'true'
                            THEN 1
                    END DESC, 
                    a.createdDate ASC
            ";
            $query = $this->db->prepare($qry);
            $query->execute();
            $results = $query->fetchAll(PDO::FETCH_ASSOC);

            $ids = array();
            foreach ($results as $row) {
                $ids[] = $row['id'];
            }

            $inIds = "'" . implode("','", $ids) . "'";

            if ($results) {
                $qryDetails = "
                    SELECT *
                        , qty openQty
                        , upper(partNumber) partNumber
                    FROM eyefidb.mrf_det 
                    WHERE mrf_id IN ($inIds)
                ";
                $queryDetails = $this->db->prepare($qryDetails);
                $queryDetails->execute();
                $lineDetails = $queryDetails->fetchAll(PDO::FETCH_ASSOC);

                $items = array();

                foreach ($lineDetails as $row) {
                    $items[] = $row['partNumber'];
                }

                $in  = str_repeat('?,', count($items) - 1) . '?';

                $qadDetails = "
                    SELECT CAST(a.ld_loc AS CHAR(25)) ld_loc
                        , a.ld_part ld_part
                        , cast(a.ld_qty_oh as numeric(36,0)) ld_qty_oh
                        , a.ld_qty_all ld_qty_all
                        , a.ld_qty_oh-a.ld_qty_all availableQty
                    FROM ld_det a
                    WHERE a.ld_part IN ($in)
                        AND a.ld_domain = 'EYE'
                        AND a.ld_qty_oh > 0 
                        AND a.ld_loc NOT IN ('INTGRTD', 'JIAXING', 'QACOMP')
                    WITH (noLock)
                ";
                $queryQADDetails = $this->db1->prepare($qadDetails);
                $queryQADDetails->execute($items);
                $locationDetails = $queryQADDetails->fetchAll(PDO::FETCH_ASSOC);

                $qadDetails = "
                    SELECT upper(pt_part) pt_part
                        , pt_desc1
                    FROM pt_mstr
                    WHERE pt_domain = 'EYE'
                        AND pt_part IN ($in)
                    GROUP BY pt_part
                        , pt_desc1
                    WITH (noLock)
                ";
                $queryQADDetails = $this->db1->prepare($qadDetails);
                $queryQADDetails->execute($items);
                $desc = $queryQADDetails->fetchAll(PDO::FETCH_ASSOC);

                foreach ($results as &$row) {

                    //count the total count from each from row
                    $row['shortFound'] = 0;

                    foreach ($lineDetails as $row1) {

                        //only pull information if the header matches the detail id
                        if ($row['id'] == $row1['mrf_id']) {
                            $row1['totalAvail'] = 0;
                            $row1['itemDescription'] = "";
                            $row1['COMMENTS'] = false;
                            $row1['COMMENTSMAX'] = '';
                            $row1['COMMENTSCLASS'] = "";

                            //comments
                            foreach ($commentInfo as &$rowComments) {
                                $row1['uniqueId'] = $row1['mrf_id'] . '-' . $row1['id'];
                                if ($row1['uniqueId'] == $rowComments['orderNum']) {
                                    $row1['COMMENTS'] = true;
                                    $row1['COMMENTSMAX'] = $rowComments['comments'];

                                    ///color the comments 
                                    if ($rowComments['byDate'] == $this->nowDateTime) {
                                        $row1['COMMENTSCLASS'] = "text-success";
                                    } else {
                                        $row1['COMMENTSCLASS'] = "text-info";
                                    }
                                }
                            }

                            foreach ($desc as $rowDesc) {
                                if ($rowDesc['PT_PART'] == $row1['partNumber']) {
                                    $row1['itemDescription'] = $rowDesc['pt_desc1'];
                                }
                            }

                            foreach ($locationDetails as &$row2) {

                                $row1['shortDetail'] = true;

                                //only pull information if it matches part number
                                if ($row2['LD_PART'] == $row1['partNumber']) {

                                    $row1['totalAvail'] = $row2['AVAILABLEQTY'] + $row1['totalAvail'];
                                    $row['shortFound'] = $row1['openQty'] + $row['shortFound'];

                                    // only display locations if there is open qty for picking
                                    if ($row1['openQty'] > 0) {
                                        $row1['locations'][] = $row2;
                                    }

                                    //display if we have inventory
                                    if ($row1['openQty'] < $row2['AVAILABLEQTY']) {
                                        $row1['shortDetail'] = false;
                                    }
                                }
                            }
                            $row['details'][] = $row1;
                        }
                    }
                }
            }
            return array('result' => $results);
        } catch (PDOException $e) {
            http_response_code(500);
            die($e->getMessage());
        }
    }

    public function pickComplete($data, $details, $shortages, $shortageInstance)
    {

        $isPrintedResults = $this->getLineDetailsById($data['id']);

        if (count($isPrintedResults) > 0) {

            foreach ($isPrintedResults as $row) {
                if ($row['printedDate'] != null) {

                    $isPrintedFound = $row['printedBy'];

                    break;
                }
            }
        }

        if ($isPrintedFound != $data['printedBy']) {
            $message = 'This MR was printed by ' . $isPrintedFound . '. Unable to proceed.';

            return array("message" => $message, "printed" => 0);
        }

        $this->db->beginTransaction();

        try {

            /**
             * Update header to show picked complete
             */

            $this->updateHeaderDetails($data);

            /**
             * Update picked qty
             */

            $this->updateLineDetails($details);

            if (count($shortages) > 0) {

                /**
                 * Create shortage if shortages are found
                 * Must match the shortages params
                 * header and line details are stored in one table
                 */
                $shortItems = array();
                foreach ($shortages as $row) {
                    /**
                     * Only process material shortages if not found in the shortage log
                     */
                    $isShortageCreated = $shortageInstance->isShortagesCreatedFromMaterialRequest($row['id']);

                    if (!$isShortageCreated) {
                        $shortItems[] = array(
                            "woNumber" => $data['pickList'],
                            "lineNumber" => $data['lineNumber'],
                            "dueDate" => $data['dueDate'],
                            "reasonPartNeeded" => 'Material request shortages',
                            "priority" => null,
                            "assemblyNumber" => $data['assemblyNumber'],
                            "mrfId" =>  $data['id'],
                            "createdBy" => $this->sessionId,

                            "partNumber" =>  $row['partNumber'],
                            "qty" =>  $row['shortageQty'],
                            "comments" =>  '',
                            "partDesc" =>  $row['itemDescription'],
                            "graphicsShortage" =>  'false',
                            "mrf_line" =>  $row['id'],
                        );
                    }
                }

                $shortageInstance->createShortages($shortItems);
            }


            $this->db->commit();

            return array("message" => 'Pick complete', "printed" => 1);
        } catch (PDOException $e) {
            http_response_code(500);
            $this->db->rollBack();
            die($e->getMessage());
        }
    }

    /**
     * Report             
     *
     * @param [type] $dateFrom
     * @param [type] $dateTo
     * @return void
     */
    public function getReport($dateFrom, $dateTo)
    {
        $qry = "
            SELECT a.reasonCode
                , sum(a.cost) cost
                , sum(a.cost*a.qtyPicked) extCost
            FROM eyefidb.mrf_det a 
            JOIN (
                select id
                from eyefidb.mrf
                WHERE active = 1
            ) b ON b.id = a.mrf_id
            where date(createdDate) between :dateFrom AND :dateTo
            group by a.reasonCode
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $chartData = array();
        foreach ($results as $row) {
            $chartData['reasonCode'][] = $row['reasonCode'];
            $chartData['value'][] = $row['extCost'];
        }

        $qry = "
            SELECT a.partNumber 
                , a.qty 
                , a.createdDate 
                , a.createdBy 
                , a.qtyPicked
                , a.pickCompletedDate
                , a.trType 
                , ac_code 
                , a.reasonCode 
                , a.active
                , b.active headerActive
                , a.cost 
                , b.requestor 
                , b.lineNumber 
                , b.pickList 
                , b.dueDate 
                , b.id mrf_id
            FROM eyefidb.mrf_det a 
            LEFT JOIN (
                select id
                    , picklist
                    , dueDate
                    , requestor
                    , pickedCompletedDate
                    , lineNumber
                    , active
                from eyefidb.mrf
            ) b ON b.id = a.mrf_id
            where date(createdDate) between :dateFrom AND :dateTo
            ORDER BY b.id DESC
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":dateFrom", $dateFrom, PDO::PARAM_STR);
        $stmt->bindParam(":dateTo", $dateTo, PDO::PARAM_STR);
        $stmt->execute();
        $details = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array(
            'chartData' => $chartData, 'details' => $details
        );
    }

    /**
     * Undocumented function
     */
    public function __destruct()
    {
        $this->db = null;
    }
}
