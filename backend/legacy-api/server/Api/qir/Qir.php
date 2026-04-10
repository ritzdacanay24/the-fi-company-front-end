<?php

namespace EyefiDb\Api\qir;

use EyefiDb\Api\Upload\Upload;

use PDO;
use PDOException;

class Qir
{
    protected $db;
    public $sessionId;

    public function __construct($db)
    {
        $this->db = $db;
        $this->nowDate = date("Y-m-d H:i:s", time());

        $this->emailFrom = "Eyefi Dashboard <noreply@the-fi-company.com>";
        $this->app_qir_submission = "ritz.dacanay@the-fi-company.com";
        //$this->app_qir_submission = "ritz.dacanay@the-fi-company.com";
        $this->app_db_link = "https://dashboard.eye-fi.com/dist/v1";
        $this->app_qir_submission_activate = 1;

        $this->uploader = new Upload($this->db);
    }

    public function userTrans($userTransCapa)
    {
        foreach ($userTransCapa as $item) {
            $field = isset($item['field']) ? $item['field'] : "";
            $o = isset($item['o']) ? $item['o'] : "";
            $n = isset($item['n']) ? $item['n'] : "";
            $comment = isset($item['comment']) ? $item['comment'] : "";
            $so = isset($item['so']) ? $item['so'] : "";
            $type = isset($item['type']) ? $item['type'] : "";
            $partNumber = isset($item['partNumber']) ? $item['partNumber'] : "";
            $capaId = isset($item['capaId']) ? $item['capaId'] : 0;

            $qry = '
					INSERT INTO eyefidb.qa_capaTrans (
						field
						, o
						, n
						, createDate
						, comment
						, userId
						, so
						, type
						, partNumber
						, capaId
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
						, :capaId
					)
				';

            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':field', $field, PDO::PARAM_STR);
            $stmt->bindParam(':o', $o, PDO::PARAM_STR);
            $stmt->bindParam(':n', $n, PDO::PARAM_STR);
            $stmt->bindParam(':createDate', $this->nowDate, PDO::PARAM_STR);
            $stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
            $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
            $stmt->bindParam(':so', $so, PDO::PARAM_STR);
            $stmt->bindParam(':type', $type, PDO::PARAM_STR);
            $stmt->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
            $stmt->bindParam(':capaId', $capaId, PDO::PARAM_INT);
            $stmt->execute();
        }
    }

    public function ReadSingle($id)
    {
        $mainQry = "
				SELECT a.id
					, a.qir
					, a.capaId
					, a.eyefiPartNumber
					, a.customerPartNumber
					, a.purchaseOrder
					, a.failureType
					, CASE WHEN a.issue_comment_html IS NOT NULL THEN a.issue_comment_html ELSE a.issueComment END issueComment
					, a.stakeholder
					, case when a.assignedTo IS NULL THEN 'Not Assigned' ELSE a.assignedTo END assignedTo
					, a.priority
					, a.createdDate
					, date(a.createdDate) createDt
					, a.assignedDate 
					, a.respondBy
					, a.respondBy respondByDate
					, a.type
					, a.createdBy 
					, a.active
					, a.status
					, a.completedDate
					, a.completedBy
					, a.verifiedBy
					, a.verifiedDate
					, a.customerName
					, dateDiff(date(now()), a.createdDate) age
					, dateDiff(date(now()), a.assignedTo) assignedToAge
					, a.owner
					, a.requestSubmitted
					, a.qtyAffected                    
					, CASE WHEN a.email IS NOT NULL AND a.email != '' THEN a.email WHEN installer IS NOT NULL THEN a.installer ELSE concat(b.first, ' ', b.last) END userName 
					, a.type1
					, a.customerReportedDate
					, a.componentType
					, a.platformType
					, a.cl_input_main_id
					, a.supplierName
                    , a.qtyAffected1
					, a.casinoName
                    , a.typeSub
                    , a.fieldServiceSchedulerId
                    , a.installer
                    , a.qaComments
                    , concat(b.first, ' ', b.last) createdByName
                    , a.lotNumber
                    , a.eyefiSerialNumber
                    , a.dueDate
                    , a.ncr_id
				FROM eyefidb.qa_capaRequest a
				LEFT JOIN db.users b on a.createdBy = b.id
				WHERE a.active = 1
					AND a.qir = :qir
				ORDER BY a.createdDate ASC
			";


        $query = $this->db->prepare($mainQry);
        $query->bindParam(":qir", $id, PDO::PARAM_STR);
        $query->execute();
        $result = $query->fetch();

        if ($result) {
            $result['mainAttachmentsInfo'] =  $this->uploader->getAttachments($result['id'], 'CAPA Request', 'capa');
        }

        return array("details" => $result);
    }

    public function update($id, $post){
        $qry = "
            UPDATE eyefidb.qa_capaRequest
            set status = :status
                , assignedTo = :assignedTo
                , dueDate = :dueDate
            WHERE id = :id
        ";

        $query = $this->db->prepare($qry);
        $query->bindParam(":status", $post['status'], PDO::PARAM_STR);
        $query->bindParam(":assignedTo", $post['assignedTo'], PDO::PARAM_STR);
        $query->bindParam(":dueDate", $post['dueDate'], PDO::PARAM_STR);
        $query->bindParam(":id", $id, PDO::PARAM_STR);
        $query->execute();

        $assignedTo = $post['assignedTo'];
        $qir = $post['qir'];
        $date=date_create($post['dueDate']);

        $dueDate =  date_format($date,"m/d/Y");;
        if($assignedTo){
            //email to assigned user.
            $to = $assignedTo;
            $from = $this->emailFrom;
            $subject = "QIR $qir";
            //$link = $this->app_db_link . '/quality/qir-view/' . $qir;
            $link = $this->app_db_link . '/quality/quality-inspection-report?view=Investigation And Conclusion&qir=' . $qir;
            
            $body = "Hello $to, <br>";
            $body .= "This QIR $qir is assigned to you.  <br>";
            $body .= "Due Date: $dueDate  <br>";
            $body .= "Please click <a href='{$link}' target='_parent'>HERE</a> to view QIR. <br>";

            $headers  = "From: " . ($from) . "\r\n";
            $headers .= "Reply-To: " . ($to) . "\r\n";
            $headers .= "Return-Path: " . ($to) . "\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
            $headers .= "Content-Transfer-Encoding: 64bit\r\n";
            $headers .= "X-Priority: 3\r\n";
            $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

            mail($to, $subject, $body, $headers);

        }

    }

    public function EditNewRequest($post)
    {
        $qirTrans = array();
        $post['customerReportedDate'] = $post['customerReportedDate'] == "" ? null : $post['customerReportedDate'];
        $fieldServiceSchedulerId = isset($post['fieldServiceSchedulerId']) && $post['fieldServiceSchedulerId'] != "" ? $post['fieldServiceSchedulerId'] : null;
        $installer = isset($post['installer']) && $post['installer'] != "" ? $post['installer'] : null;

        $mainQry = "
				SELECT *
				FROM eyefidb.qa_capaRequest a
				WHERE a.id = :id
			";
        $query = $this->db->prepare($mainQry);
        $query->bindParam(":id", $post['id'], PDO::PARAM_INT);
        $query->execute();
        $row = $query->fetch();

        if ($row['type1'] != $post['type1']) {
            $qirTrans[] = array(
                'field' => 'Type change', 'o' => $row['type1'], 'n' => $post['type1'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['stakeholder'] != $post['stakeholder']) {
            $qirTrans[] = array(
                'field' => 'Stakeholder change', 'o' => $row['stakeholder'], 'n' => $post['stakeholder'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['priority'] != $post['priority']) {
            $qirTrans[] = array(
                'field' => 'Priority change', 'o' => $row['priority'], 'n' => $post['priority'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['failureType'] != $post['failureType']) {
            $qirTrans[] = array(
                'field' => 'Failure Type change', 'o' => $row['failureType'], 'n' => $post['failureType'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['CustomerPartNumber'] != $post['customerPartNumber']) {
            $qirTrans[] = array(
                'field' => 'Customer Part Number change', 'o' => $row['CustomerPartNumber'], 'n' => $post['customerPartNumber'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['qtyAffected'] != $post['qtyAffected']) {
            $qirTrans[] = array(
                'field' => 'Qty Affected change', 'o' => $row['qtyAffected'], 'n' => $post['qtyAffected'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['purchaseOrder'] != $post['purchaseOrder']) {
            $qirTrans[] = array(
                'field' => 'Purchase Order change', 'o' => $row['purchaseOrder'], 'n' => $post['purchaseOrder'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['eyefiPartNumber'] != $post['eyefiPartNumber']) {
            $qirTrans[] = array(
                'field' => 'Eyefi Part Number change', 'o' => $row['eyefiPartNumber'], 'n' => $post['eyefiPartNumber'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['issueComment'] != $post['issueComment']) {
            $qirTrans[] = array(
                'field' => 'Issue Comment change', 'o' => $row['issueComment'], 'n' => $post['issueComment'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['customerName'] != $post['customerName']) {
            $qirTrans[] = array(
                'field' => 'Customer Name change', 'o' => $row['customerName'], 'n' => $post['customerName'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['active'] != $post['active']) {
            $qirTrans[] = array(
                'field' => 'Active change', 'o' => $row['active'], 'n' => $post['active'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['customerReportedDate'] != $post['customerReportedDate']) {
            $qirTrans[] = array(
                'field' => 'Customer Reported Date change', 'o' => $row['customerReportedDate'], 'n' => $post['customerReportedDate'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['componentType'] != $post['componentType']) {
            $qirTrans[] = array(
                'field' => 'Component Type change', 'o' => $row['componentType'], 'n' => $post['componentType'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['platformType'] != $post['platformType']) {
            $qirTrans[] = array(
                'field' => 'Platform Type change', 'o' => $row['platformType'], 'n' => $post['platformType'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['status'] != $post['status']) {
            $qirTrans[] = array(
                'field' => 'Status change', 'o' => $row['status'], 'n' => $post['status'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['supplierName'] != $post['supplierName']) {
            $qirTrans[] = array(
                'field' => 'Supplier Name change', 'o' => $row['supplierName'], 'n' => $post['supplierName'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['qtyAffected1'] != $post['qtyAffected1']) {
            $qirTrans[] = array(
                'field' => 'Qty Affected 1 Changed', 'o' => $row['qtyAffected1'], 'n' => $post['qtyAffected1'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['casinoName'] != $post['casinoName']) {
            $qirTrans[] = array(
                'field' => 'Casino Name Changed', 'o' => $row['casinoName'], 'n' => $post['casinoName'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['typeSub'] != $post['typeSub']) {
            $qirTrans[] = array(
                'field' => 'Type Sub Changed', 'o' => $row['typeSub'], 'n' => $post['typeSub'], 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['fieldServiceSchedulerId'] != $fieldServiceSchedulerId) {
            $qirTrans[] = array(
                'field' => 'FSID Changed', 'o' => $row['fieldServiceSchedulerId'], 'n' => $fieldServiceSchedulerId, 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        if ($row['installer'] != $installer) {
            $qirTrans[] = array(
                'field' => 'Installer Changed', 'o' => $row['installer'], 'n' => $installer, 'comment' => '', 'so' => $post['id'], 'type' => 'CAPA'
            );
        }

        $issueComment = $this->removeHtml($post['issueComment']);

        $qry = "
				UPDATE eyefidb.qa_capaRequest
				set type1 = :type
					, stakeholder = :stakeholder
					, priority = :priority
					, failureType = :failureType
					, customerPartNumber = :customerPartNumber
					, qtyAffected = :qtyAffected
					, purchaseOrder = :purchaseOrder
					, eyefiPartNumber = :eyefiPartNumber 
					, issueComment = :issueComment
					, issue_comment_html = :issue_comment_html
					, customerName = :customerName
					, active = :active
					, customerReportedDate = :customerReportedDate
					, componentType = :componentType
					, platformType = :platformType
					, status = :status 
					, supplierName = :supplierName
                    , qtyAffected1 = :qtyAffected1
					, casinoName = :casinoName 
					, typeSub = :typeSub
					, fieldServiceSchedulerId = :fieldServiceSchedulerId
					, installer = :installer
                    , qaComments = :qaComments
                    , lotNumber = :lotNumber
				WHERE id = :id
			";

        $query = $this->db->prepare($qry);
        $query->bindParam(":type", $post['type1'], PDO::PARAM_STR);
        $query->bindParam(":stakeholder", $post['stakeholder'], PDO::PARAM_STR);
        $query->bindParam(":priority", $post['priority'], PDO::PARAM_STR);
        $query->bindParam(":failureType", $post['failureType'], PDO::PARAM_STR);
        $query->bindParam(":customerPartNumber", $post['customerPartNumber'], PDO::PARAM_STR);
        $query->bindParam(":qtyAffected", $post['qtyAffected'], PDO::PARAM_STR);
        $query->bindParam(":purchaseOrder", $post['purchaseOrder'], PDO::PARAM_STR);
        $query->bindParam(":eyefiPartNumber", $post['eyefiPartNumber'], PDO::PARAM_STR);
        $query->bindParam(":issueComment", $issueComment, PDO::PARAM_STR);
        $query->bindParam(":issue_comment_html", $post['issueComment'], PDO::PARAM_STR);
        $query->bindParam(":customerName", $post['customerName'], PDO::PARAM_STR);
        $query->bindParam(":active", $post['active'], PDO::PARAM_INT);
        $query->bindParam(":id", $post['id'], PDO::PARAM_INT);
        $query->bindParam(":customerReportedDate", $post['customerReportedDate'], PDO::PARAM_STR);
        $query->bindParam(":componentType", $post['componentType'], PDO::PARAM_STR);
        $query->bindParam(":platformType", $post['platformType'], PDO::PARAM_STR);
        $query->bindParam(":status", $post['status'], PDO::PARAM_STR);
        $query->bindParam(":supplierName", $post['supplierName'], PDO::PARAM_STR);
        $query->bindParam(":qtyAffected1", $post['qtyAffected1'], PDO::PARAM_INT);
        $query->bindParam(":casinoName", $post['casinoName'], PDO::PARAM_STR);
        $query->bindParam(":typeSub", $post['typeSub'], PDO::PARAM_STR);
        $query->bindParam(":qaComments", $post['qaComments'], PDO::PARAM_STR);
        $query->bindParam(":fieldServiceSchedulerId", $fieldServiceSchedulerId, PDO::PARAM_INT);
        $query->bindParam(":installer", $installer, PDO::PARAM_STR);
        $query->bindParam(":lotNumber", $post['lotNumber'], PDO::PARAM_STR);
        $query->execute();

        $this->userTrans($qirTrans);
    }

    public function DeleteAttachment($id)
    {
        $qry = "
				UPDATE eyefidb.attachments 
				SET active = 0 
				where id = :id
			";
        $query = $this->db->prepare($qry);
        $query->bindParam(":id", $id, PDO::PARAM_INT);
        $query->execute();

        $qirTrans[] = array(
            'field' => 'Main attachment deleted', 'o' => 1, 'n' => 0, 'comment' => '', 'so' => $id, 'type' => 'CAPA'
        );

        $this->userTrans($qirTrans);
    }

    public function removeHtml($comment)
    {
        $newComment = strip_tags($comment);
        $newComment = html_entity_decode($newComment);

        $newComment = str_replace('Â', '', $newComment);
        $newComment = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $newComment);

        return $newComment;
    }

    public function SaveNewRequest($post)
        {
        $this->db->beginTransaction();

        try {
            $year = date("y");
            $monthNo = date('m');

            if ($this->sessionId == -1) {
                $confirmationCode = "SUB" . $year . "" . $monthNo;
            } else {
                $confirmationCode = $post['customerName'] . "" . $year . "" . $monthNo;
            }

            $confirmationCode = str_replace(' ', '', $confirmationCode);

            $clInputId = !isset($post['cl_input_main_id']) || !$post['cl_input_main_id'] || $post['cl_input_main_id'] == '' ? 0 : $post['cl_input_main_id'];

            $issueComment = $this->removeHtml($post['issueComment']);

            $eyefiSerialNumber = isset($post['eyefiSerialNumber']) ? $post['eyefiSerialNumber'] : null;
            $fieldServiceSchedulerId = isset($post['fieldServiceSchedulerId']) && $post['fieldServiceSchedulerId'] != "" ? $post['fieldServiceSchedulerId'] : null;
            $email = isset($post['email']) ? $post['email'] : null;
            $installer = isset($post['installer']) && $post['installer'] != "" ? $post['installer'] : null;

            
            $type1 = isset($post['type1']) ? $post['type1'] : null;
            $stakeholder = isset($post['stakeholder']) ? $post['stakeholder'] : null;
            $priority = isset($post['priority']) ? $post['priority'] : null;
            $failureType = isset($post['failureType']) ? $post['failureType'] : null;
            $customerPartNumber = isset($post['customerPartNumber']) ? $post['customerPartNumber'] : null;
            $qtyAffected = isset($post['qtyAffected']) ? $post['qtyAffected'] : null;
            $purchaseOrder = isset($post['purchaseOrder']) ? $post['purchaseOrder'] : null;
            $eyefiPartNumber = isset($post['eyefiPartNumber']) ? $post['eyefiPartNumber'] : null;
            $issueCommentHtml = isset($post['issueComment']) ? $post['issueComment'] : null;
            $customerName = isset($post['customerName']) ? $post['customerName'] : null;
            $customerReportedDate = isset($post['customerReportedDate']) ? $post['customerReportedDate'] : null;
            $componentType = isset($post['componentType']) ? $post['componentType'] : null;
            $platformType = isset($post['platformType']) ? $post['platformType'] : null;
            $supplierName = isset($post['supplierName']) ? $post['supplierName'] : null;
            $qtyAffected1 = isset($post['qtyAffected1']) ? $post['qtyAffected1'] : null;
            $casinoName = isset($post['casinoName']) ? $post['casinoName'] : null;
            $typeSub = isset($post['typeSub']) ? $post['typeSub'] : null;
            $qaComments = isset($post['qaComments']) ? $post['qaComments'] : null;
            $lotNumber = isset($post['lotNumber']) ? $post['lotNumber'] : null;
            $assignedTo = isset($post['assignedTo']) ? $post['assignedTo'] : null;

            $qry = "
					INSERT INTO eyefidb.qa_capaRequest(
						type1
						, stakeholder
						, priority
						, failureType
						, customerPartNumber
						, qtyAffected
						, purchaseOrder
						, eyefiPartNumber
						, issueComment
						, issue_comment_html
						, customerName
						, createdDate
						, createdBy
						, customerReportedDate
						, componentType
						, platformType
						, cl_input_main_id
						, supplierName
                        , qtyAffected1
						, casinoName
                        , typeSub
                        , eyefiSerialNumber
                        , fieldServiceSchedulerId
                        , email
                        , installer
                        , qaComments
                        , lotNumber
                        , assignedTo
					)
					VALUES (
						:type1
						, :stakeholder
						, :priority
						, :failureType
						, :customerPartNumber
						, :qtyAffected
						, :purchaseOrder
						, :eyefiPartNumber
						, :issueComment
						, :issue_comment_html
						, :customerName
						, :createdDate
						, :createdBy
						, :customerReportedDate
						, :componentType
						, :platformType
						, :cl_input_main_id
						, :supplierName
                        , :qtyAffected1
						, :casinoName
						, :typeSub
                        , :eyefiSerialNumber
                        , :fieldServiceSchedulerId
                        , :email
                        , :installer
                        , :qaComments
                        , :lotNumber
                        , :assignedTo
					)
				";

            $query = $this->db->prepare($qry);

            $query->bindParam(":type1", $type1, PDO::PARAM_STR);
            $query->bindParam(":stakeholder", $stakeholder, PDO::PARAM_STR);
            $query->bindParam(":priority", $priority, PDO::PARAM_STR);
            $query->bindParam(":failureType", $failureType, PDO::PARAM_STR);
            $query->bindParam(":customerPartNumber", $customerPartNumber, PDO::PARAM_STR);
            $query->bindParam(":qtyAffected", $qtyAffected, PDO::PARAM_STR);
            $query->bindParam(":purchaseOrder", $purchaseOrder, PDO::PARAM_STR);
            $query->bindParam(":eyefiPartNumber", $eyefiPartNumber, PDO::PARAM_STR);
            $query->bindParam(":issueComment", $issueComment, PDO::PARAM_STR);
            $query->bindParam(":issue_comment_html", $issueCommentHtml, PDO::PARAM_STR);
            $query->bindParam(":customerName", $customerName, PDO::PARAM_STR);
            $query->bindParam(":createdDate", $this->nowDate, PDO::PARAM_STR);
            $query->bindParam(":createdBy", $this->sessionId, PDO::PARAM_INT);
            $query->bindParam(":customerReportedDate", $customerReportedDate, PDO::PARAM_STR);
            $query->bindParam(":componentType", $componentType, PDO::PARAM_STR);
            $query->bindParam(":platformType", $platformType, PDO::PARAM_STR);
            $query->bindParam(":cl_input_main_id", $clInputId, PDO::PARAM_INT);
            $query->bindParam(":supplierName", $supplierName, PDO::PARAM_STR);
            $query->bindParam(":qtyAffected1", $qtyAffected1, PDO::PARAM_INT);
            $query->bindParam(":casinoName", $casinoName, PDO::PARAM_STR);
            $query->bindParam(":typeSub", $typeSub, PDO::PARAM_STR);
            $query->bindParam(":qaComments", $qaComments, PDO::PARAM_STR);
            $query->bindParam(":eyefiSerialNumber", $eyefiSerialNumber, PDO::PARAM_STR);
            $query->bindParam(":fieldServiceSchedulerId", $fieldServiceSchedulerId, PDO::PARAM_STR);
            $query->bindParam(":email", $email, PDO::PARAM_STR);
            $query->bindParam(":installer", $installer, PDO::PARAM_STR);
            $query->bindParam(":lotNumber", $lotNumber, PDO::PARAM_STR);
            $query->bindParam(":assignedTo", $assignedTo, PDO::PARAM_STR);
            $query->execute();
            $lastId = $this->db->lastInsertId();
            $updatedId = $confirmationCode . $lastId;

            $fullQir = $customerName . $updatedId;

            $qry = "
					UPDATE eyefidb.qa_capaRequest 
					SET qir = :qir 
					where id = :id
				";
            $query = $this->db->prepare($qry);
            $query->bindParam(":id", $lastId, PDO::PARAM_INT);
            $query->bindParam(":qir", $updatedId, PDO::PARAM_STR);
            $query->execute();

            $qirTrans[] = array(
                'field' => 'New QIR Submited', 'o' => 0, 'n' => $lastId, 'comment' => '', 'so' => $lastId, 'type' => 'CAPA'
            );

            $this->userTrans($qirTrans);

            if($assignedTo){
                //email to assigned user.
                $to = $assignedTo;
                $from = $this->emailFrom;
                $subject = "QIR $updatedId";
                $link = $this->app_db_link . '/quality/qir-view/' . $updatedId;
                
                $body = "Hello $to, <br>";
                $body .= "This QIR $updatedId is assigned to you.  <br>";
                $body .= "Please click <a href='{$link}' target='_parent'>HERE</a> to view QIR. <br>";

                $headers  = "From: " . ($from) . "\r\n";
                $headers .= "Reply-To: " . ($to) . "\r\n";
                $headers .= "Return-Path: " . ($to) . "\r\n";
                $headers .= "MIME-Version: 1.0\r\n";
                $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
                $headers .= "Content-Transfer-Encoding: 64bit\r\n";
                $headers .= "X-Priority: 3\r\n";
                $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

                mail($to, $subject, $body, $headers);

            }

            $this->send_email($updatedId,$post,'nick.walter@the-fi-company.com, juvenal.torres@the-fi-company.com');

            $this->db->commit();
            return array('updatedId' => $lastId, 'qir' => $updatedId, 'fullQir' => $fullQir);
        } catch (PDOException $e) {
            $this->db->rollBack();
            http_response_code(400);
            return array('error' => $e->getMessage());
        }
    }

    public function send_email($updatedId, $post, $to)
    {

        $to       =  $to == false || $to == 'false' ? 'quality@eye-fi.com, nick.walter@the-fi-company.com, juvenal.torres@the-fi-company.com' : $to;
        $cc         = $this->app_qir_submission;
        $subject   = "New QIR Submitted " . $updatedId . " Stakeholder " . $post['stakeholder'];
        $from     = $this->emailFrom;
        $link       = 'https://dashboard.eye-fi.com/dist/web/dashboard/quality/qir/edit?id=' . $updatedId;



        $body = '<html><body style="padding:50px">';

        $body .= "Please do not reply to this email. To view this qir, click on the direct link to <a href='{$link}' target='_parent'>Quality Inspection Report</a>. <br><br>";
        $body .= '' . $updatedId . '.  The QIR info and the issue statement is included below. <br>';
        $body .= '<br>';
        $body .= 'Created Date:  ' . $this->nowDate . '<br>';
        $body .= 'Stakeholder:  ' . $post['stakeholder'] . '<br>';
        $body .= 'Failure Type:  ' . $post['failureType'] . '<br>';
        $body .= 'Customer Name:  ' . $post['customerName'] . '<br>';
        $body .= 'Component Type:  ' . $post['componentType'] . '<br>';
        $body .= 'Type:  ' . $post['type1'] . '<br>';
        $body .= 'Part Number:  ' . $post['eyefiPartNumber'] . '<br>';
        $body .= 'Qty Affected:  ' . $post['qtyAffected'] . '<br>';
        $body .= 'Severity:  ' . $post['priority'] . '<br>';

        $body .= 'Issue statement: <br>';
        $body .= $post['issueComment'] . '<br>';

        $body .= "<p> <a href='{$link}' target='_parent'>View QIR</a> </p>";
        $body .= '<br>';
        $body .= '<hr>';
        $body .= "*Please note that you must be logged into the EyeFi Dashboard before clicking on the  link.<br><br>";
        $body .= "Thank you <br>";
        $body .= "</body></html>";

        $headers  = "From: " . ($from) . "\r\n";
        $headers .= "Cc: $cc\r\n";
        $headers .= "Reply-To: " . ($to) . "\r\n";
        $headers .= "Return-Path: " . ($to) . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        $headers .= "Content-Transfer-Encoding: 64bit\r\n";
        $headers .= "X-Priority: 3\r\n";
        $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

        if ($to !== "" && $from !== "") {
            mail($to, $subject, $body, $headers);
        }
    }

    public function update_by_id($id, $tableName, $data)
    {

        $errors = new \stdClass();
        if (empty($id)) {
            $errors->noId  = "No id found";
        }
        if (is_null($id)) {
            $errors->idIsNull  = "No id Is null";
        }
        if (empty($data)) {
            $errors->dataEmpty  = "dataEmpty";
        }

        $properties = array_filter(get_object_vars($errors));
        if (!empty($properties)) {
            return $errors;
            die();
        }

        $statement = "UPDATE " . $tableName . " SET ";
        $params = array();
        foreach ($data as $key => $value) {
            if ($key != 'id') {
                $statement .= "$key = :$key, ";
                $params[$key] = $value;
            }
        }
        $params["id"] = $id;
        $statement = substr($statement, 0, -2) . " WHERE id = :id";
        $stmt = $this->db->prepare($statement);
        $stmt->execute($params);

        $obj = array(
            "updated" => $stmt->rowCount()
        );

        return $obj;
    }

    

    public function __destruct()
    {
        $this->db = null;
    }
}
