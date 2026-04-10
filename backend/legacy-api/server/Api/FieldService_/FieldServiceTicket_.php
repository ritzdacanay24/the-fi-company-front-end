<?php

namespace EyefiDb\Api\FieldService_;

use PDO;
use PDOException;
use PHPMailer\PHPMailer\PHPMailer;

use EyefiDb\Api\Upload\Upload;

class FieldServiceTicket_
{

    protected $db;
    public $sessionId;

    public function __construct($db, $dbQad = false)
    {
        $this->db = $db;
        $this->dbQad = $dbQad;
        $this->nowDate = date("Y-m-d H:i:s", time());
        $this->app_email_error_from = 'noreply@the-fi-company.com';

        $this->uploader = new Upload($this->db);
    }


    public function sendEmail()
    {

        $mainQry = "
            select group_concat(email) emails from db.users where area = 'Field Service' and active = 1
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $data = $query->fetch(PDO::FETCH_ASSOC);

        // $subscribers = explode(",", $subscribers);
        $toEmail = $data['emails']; // your email address;


        $link = 'https://dashboard.eye-fi.com/dist/v1/field-service-tech-schedule/field-service-tech-schedule?height=233';

        $to         = $toEmail;
        $subject       = "Field service tech schedule";
        $from       = $this->app_email_error_from;

        $body  = 'Hello Team, <br><br>';
        $body .= 'Please click <a href="' . $link . '">here</a> to view your schedule<br> <br>';
        $body .= '<br><br>';
        $body .= '<html><body>';

        $body .= '<br><hr>';
        $body .= 'This is an automated email. Please do not respond. <br>';
        $body .= 'Thank you.';

        $body .= "</body></html>";

        $headers = 'From: ' . MAIL_NAME . " <" . MAIL_EMAIL . ">\r\n" .
            'Reply-To:' . MAIL_EMAIL . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
        $headers .= "Content-Transfer-Encoding: 64bit\r\n";
        $headers .= "X-Priority: 3\r\n";
        $headers .= "X-Mailer: PHP" . phpversion() . "\r\n";

        $finalMessage = wordwrap($body, 100, "\n");

        mail($to, $subject, $finalMessage, $headers);
    }

    public function getCONmberInfo($soNumber)
    {

        $shipTo = "
			select sod_part
				, sod_qty_ord
				, sod_qty_ship
				, sod_order_category
			from sod_det 
			where sod_order_category = :coNumber
				
		";
        $query = $this->dbQad->prepare($shipTo);
        $query->bindParam(":coNumber", $soNumber, PDO::PARAM_STR);
        $query->execute();
        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    public function FS_USER_TRANS($trans)
    {

        foreach ($trans as $item) {
            $field = isset($item['field']) ? $item['field'] : "";
            $o = isset($item['o']) ? $item['o'] : "";
            $n = isset($item['n']) ? $item['n'] : "";
            $createDate = $this->nowDate;
            $comment = isset($item['comment']) ? $item['comment'] : "";
            $userId = $this->sessionId;
            $uniqueId = isset($item['uniqueId']) ? $item['uniqueId'] : "";
            $type = isset($item['type']) ? $item['type'] : "";
            $workOrderId = isset($item['workOrderId']) ? $item['workOrderId'] : 0;

            $qry = '
					INSERT INTO eyefidb.fs_userTrans (
						field
						, o
						, n
						, createDate
						, comment
						, userId
						, uniqueId
						, type
						, workOrderId
					) 
					VALUES( 
						:field
						, :o
						, :n
						, :createDate
						, :comment
						, :userId
						, :uniqueId
						, :type
						, :workOrderId
					)
				';

            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':field', $field, PDO::PARAM_STR);
            $stmt->bindParam(':o', $o, PDO::PARAM_STR);
            $stmt->bindParam(':n', $n, PDO::PARAM_STR);
            $stmt->bindParam(':createDate', $createDate, PDO::PARAM_STR);
            $stmt->bindParam(':comment', $comment, PDO::PARAM_STR);
            $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
            $stmt->bindParam(':uniqueId', $uniqueId, PDO::PARAM_INT);
            $stmt->bindParam(':type', $type, PDO::PARAM_STR);
            $stmt->bindParam(':workOrderId', $workOrderId, PDO::PARAM_INT);
            $stmt->execute();
        }
    }

    public function SettingsForm()
    {

        $mainQry = "
				select * 
				from eyefidb.fs_scheduler_settings
                where active = 1
                and (type = 'Work Order Project Type' OR type = 'Service Type')
			";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $r1 = $query->fetchAll(PDO::FETCH_ASSOC);

        $result = array();
        foreach ($r1 as $element) {
            $elementType = ucwords($element['type']);
            $elementType = str_replace(' ', '', $elementType);
            $result[$elementType][] = $element;
        }

        return $result;
    }

    public function SurveyComplete($details, $data, $post)
    {

        $jobNumber = uniqid();
        $qry = "
				INSERT INTO eyefidb.customerSatisfactionsSurvey (
					fs_workOrder_id
					, question
					, rating
					, comments
					, dateSubmitted
					, createdBy
					, vendorName
					, vendorLeadTechName
					, locationOfService
					, jobNumber
				) VALUES (
					:fs_workOrder_id
					, :question
					, :rating
					, :comments
					, :dateSubmitted
					, :createdBy
					, :vendorName
					, :vendorLeadTechName
					, :locationOfService
					, :jobNumber
				
				)
			";
        $stmt = $this->db->prepare($qry);

        $stmt->bindParam(':fs_workOrder_id', $data['id'], PDO::PARAM_INT);
        $stmt->bindParam(':vendorName', $post['vendorName'], PDO::PARAM_STR);
        $stmt->bindParam(':vendorLeadTechName', $post['vendorLeadTechName'], PDO::PARAM_STR);
        $stmt->bindParam(':locationOfService', $post['locationOfService'], PDO::PARAM_STR);
        $stmt->bindParam(':comments', $post['comments'], PDO::PARAM_STR);
        $stmt->bindParam(':createdBy', $this->sessionId, PDO::PARAM_INT);
        $stmt->bindParam(':dateSubmitted', $this->nowDate, PDO::PARAM_STR);
        $stmt->bindParam(':jobNumber', $jobNumber, PDO::PARAM_STR);

        foreach ($details as $row) {
            $stmt->bindParam(':question', $row['question'], PDO::PARAM_STR);
            $stmt->bindParam(':rating', $row['value'], PDO::PARAM_STR);
            $stmt->execute();
        }
    }

    public function CheckWhatChangedOnWorkOrderDetails($id)
    {
        $qry = '
				SELECT id 
					, workOrderId 
					, proj_type 
					, description 
					, DATE_FORMAT(projectStart, "%Y-%m-%d %H:%i") projectStart
					, DATE_FORMAT(projectFinish, "%Y-%m-%d %H:%i") projectFinish
					, totalHours
					, createdDate 
					, userId 
					, active 
					, seq
				FROM eyefidb.fs_workOrderProject_copy a
				WHERE id = :id
			';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function WorkOrderDetail($post, $modifyingType)
    {
        $this->db->beginTransaction();
        $fsTrans = array();

        try {

            $qry = "
                UPDATE eyefidb.fs_workOrderProject_copy
                SET proj_type = :proj_type
                    , description = :description
                    , projectStart = :projectStart
                    , projectFinish = :projectFinish
                    , totalHours = :totalHours
                    , brStart = :brStart
                    , brEnd = :brEnd
                    , flight_hrs_delay = :flight_hrs_delay
                    , seq = :seq
                WHERE id = :id
            ";
            $stmt = $this->db->prepare($qry);

            $seq = $post['seq'] ? $post['seq'] : null;

            $projectStart = $post['projectStart'] ? $post['projectStart'] : null;
            $projectFinish = $post['projectFinish'] ? $post['projectFinish'] : null;
            $brStart = $post['brStart'] ? $post['brStart'] : null;
            $brEnd = $post['brEnd'] ? $post['brEnd'] : null;
            $flight_hrs_delay = $post['flight_hrs_delay'] ? $post['flight_hrs_delay'] : null;

            if ($modifyingType == 'true') {

                $results1 = $this->CheckWhatChangedOnWorkOrderDetails($post['id']);

                if ($results1) {
                    //start Transactions
                    if (isset($results1['proj_type']) && $results1['proj_type'] != $post['proj_type']) {
                        $fsTrans[] = array(
                            'field' => 'Project Type changed', 'o' => $results1['proj_type'], 'n' => $post['proj_type'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                    if (isset($results1['description']) && $results1['description'] != $post['description']) {
                        $fsTrans[] = array(
                            'field' => 'Description changed', 'o' => $results1['description'], 'n' => $post['description'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                    if (isset($results1['projectStart']) && $results1['projectStart'] != $projectStart) {
                        $fsTrans[] = array(
                            'field' => 'Project Start changed', 'o' => $results1['projectStart'], 'n' => $post['projectStart'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                    if (isset($results1['projectFinish']) && $results1['projectFinish'] != $projectFinish) {
                        $fsTrans[] = array(
                            'field' => 'Project Finish changed', 'o' => $results1['projectFinish'], 'n' => $post['projectFinish'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                    if (isset($results1['totalHours']) && $results1['totalHours'] != $post['totalHours']) {
                        $fsTrans[] = array(
                            'field' => 'Total Hours changed', 'o' => $results1['totalHours'], 'n' => $post['totalHours'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                    if (isset($results1['seq']) && $results1['seq'] != $seq) {
                        $fsTrans[] = array(
                            'field' => 'SEQ changed', 'o' => $results1['seq'], 'n' => $seq, 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                }
            }
            
            $stmt->bindParam(':proj_type', $post['proj_type'], PDO::PARAM_STR);
            $stmt->bindParam(':description', $post['description'], PDO::PARAM_STR);
            $stmt->bindParam(':projectStart', $projectStart, PDO::PARAM_STR);
            $stmt->bindParam(':projectFinish', $projectFinish, PDO::PARAM_STR);
            $stmt->bindParam(':brStart', $brStart, PDO::PARAM_STR);
            $stmt->bindParam(':brEnd', $brEnd, PDO::PARAM_STR);
            $stmt->bindParam(':totalHours', $post['totalHours'], PDO::PARAM_STR);
            $stmt->bindParam(':flight_hrs_delay', $flight_hrs_delay, PDO::PARAM_STR);
            $stmt->bindParam(':seq', $seq, PDO::PARAM_INT);
            $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
            $status = $stmt->execute();

            $this->FS_USER_TRANS($fsTrans);
            $this->db->commit();

            return array('details' => $status, 'updatedId' => $post['id']);
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
    }

    public function AddWorkDetails($post)
    {

        $qry = "
            INSERT INTO eyefidb.fs_workOrderProject_copy(
                workOrderId
                , userId
                , createdDate
                , seq
                , parent_id
                , proj_type
                , projectStart
                , projectFinish
                , flight_hrs_delay
                , brStart
                , brEnd
            ) 
            values(
                :workOrderId
                , :userId
                , :createdDate
                , :seq
                , :parent_id
                , :proj_type
                , :projectStart
                , :projectFinish
                , :flight_hrs_delay
                , :brStart
                , :brEnd
            )
        ";
        $seq = 0;
        $parent_id = null;
        
        $projectStart = $post['projectStart'] ? $post['projectStart'] : null;
        $projectFinish = $post['projectFinish'] ? $post['projectFinish'] : null;
        $brStart = $post['brStart'] ? $post['brStart'] : null;
        $brEnd = $post['brEnd'] ? $post['brEnd'] : null;
        $flight_hrs_delay = $post['flight_hrs_delay'] ? $post['flight_hrs_delay'] : null;


        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':workOrderId', $post['workOrderId'], PDO::PARAM_INT);
        $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
        $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
        $stmt->bindParam(':seq', $seq, PDO::PARAM_STR);
        $stmt->bindParam(':parent_id', $parent_id, PDO::PARAM_INT);
        $stmt->bindParam(':proj_type', $post['proj_type'], PDO::PARAM_STR);
        $stmt->bindParam(':projectStart', $projectStart, PDO::PARAM_STR);
        $stmt->bindParam(':projectFinish', $projectFinish, PDO::PARAM_STR);
        $stmt->bindParam(':flight_hrs_delay', $flight_hrs_delay, PDO::PARAM_STR);
        $stmt->bindParam(':brStart', $brStart, PDO::PARAM_STR);
        $stmt->bindParam(':brEnd', $brEnd, PDO::PARAM_STR);
        $stmt->execute();
        $updatedId = $this->db->lastInsertId();
        return array('updatedId' => $updatedId);
    }


    public function DeleteWorkDetails($id, $modifyingType, $workOrderId)
    {
        $this->db->beginTransaction();
        $fsTrans = array();

        try {

            $qry = "
					DELETE FROM eyefidb.fs_workOrderProject_copy
					WHERE id = :id
				";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($modifyingType == 'true') {
                $fsTrans[] = array(
                    'field' => 'Work Order Project Deleted', 'o' => 0, 'n' => 1, 'comment' => 'Updated after submission', 'uniqueId' => $id, 'type' => 'Field Service Work Order', 'workOrderId' => $workOrderId
                );
            }

            $this->FS_USER_TRANS($fsTrans);
            $this->db->commit();

            $results = $stmt->execute() ? true : false;
            return array('results' => $results);
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
    }

    public function StartOver($workOrderTicketId)
    {
        

        $this->db->beginTransaction();

        try {
            $qry = "
                delete from fs_workOrder where id = '".$workOrderTicketId."';
            ";
            $this->db->exec($qry);
            
            $qry = "
                delete FROM fs_workOrderDetail where workOrderId = '".$workOrderTicketId."';
            ";
            $this->db->exec($qry);

            $qry = "
                delete FROM fs_workOrderMisc where workOrderId = '".$workOrderTicketId."';
            ";
            $this->db->exec($qry);

            $qry = "
                delete FROM fs_workOrderProject_copy where workOrderId = '".$workOrderTicketId."';
            ";
            $this->db->exec($qry);

            $qry = "
                delete FROM fs_workOrderTrip_copy where workOrderId = '".$workOrderTicketId."';
            ";
            $this->db->exec($qry);


            $this->db->commit();
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
        
    }



    public function DeleteMiscDetail($id, $modifyingType)
    {
        $this->db->beginTransaction();
        $fsTrans = array();

        try {

            $qry = "
					DELETE FROM eyefidb.fs_workOrderMisc
					WHERE id = :id
				";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);

            if ($modifyingType == 'true') {
                $fsTrans[] = array(
                    'field' => 'Work Order Misc Deleted', 'o' => 0, 'n' => 1, 'comment' => 'Updated after submission', 'uniqueId' => $id, 'type' => 'Field Service Work Order'
                );
            }


            $this->FS_USER_TRANS($fsTrans);
            $this->db->commit();

            $results = $stmt->execute() ? true : false;
            return array('results' => $results);
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
    }

    public function UpdateTripExpense($data)
    {
        $cycleSql = "
            INSERT INTO eyefidb.fs_workOrderTrip_copy (id, name, cost, workOrderId, vendor_name) 
            VALUES(:id, :name, :cost, :workOrderId, :vendor_name) ON 
            DUPLICATE KEY UPDATE id=VALUES(id), 
            name=VALUES(name), 
            cost=VALUES(cost), 
            workOrderId=VALUES(workOrderId),
            vendor_name=VALUES(vendor_name)
        ";
        $query = $this->db->prepare($cycleSql);
        $query->bindParam(":id", $data['id'], PDO::PARAM_STR);
        $query->bindParam(":name", $data['name'], PDO::PARAM_STR);
        $query->bindParam(":cost", $data['cost'], PDO::PARAM_STR);
        $query->bindParam(":workOrderId", $data['workOrderId'], PDO::PARAM_STR);
        $query->bindParam(":vendor_name", $data['vendor_name'], PDO::PARAM_STR);
        $query->execute();
        $lastId = $data['id'] ? $data['id'] : $this->db->lastInsertId();
        return array('lastId' => $lastId);
    }



    public function AddMiscDetail($workOrderId)
    {

        $qry = "
				INSERT INTO eyefidb.fs_workOrderMisc(
					workOrderId
				) 
				values(
					:workOrderId
				)
			";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':workOrderId', $workOrderId, PDO::PARAM_INT);
        $stmt->execute();
        $updatedId = $this->db->lastInsertId();
        return array('updatedId' => $updatedId);
    }

    public function CheckWhatChangedOnModifyMisc($id)
    {
        $qry = '
				SELECT id 
					, workOrderId 
					, type 
					, customerAsset 
					, eyefiAsset
				FROM eyefidb.fs_workOrderMisc a
				WHERE id = :id
			';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function UpdateMiscDetail($post, $modifyingType)
    {

        $this->db->beginTransaction();
        $fsTrans = array();

        try {

            $qry = "
					UPDATE eyefidb.fs_workOrderMisc
					SET type = :type
						, customerAsset = :customerAsset
						, eyefiAsset = :eyefiAsset
					WHERE id = :id
				";
            $stmt = $this->db->prepare($qry);

            if ($modifyingType == 'true') {

                $results1 = $this->CheckWhatChangedOnModifyMisc($post['id']);

                if ($results1) {
                    //start Transactions
                    if (isset($results1['type']) && $results1['type'] != $post['type']) {
                        $fsTrans[] = array(
                            'field' => 'Misc Type changed', 'o' => $results1['type'], 'n' => $post['type'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                    if (isset($results1['customerAsset']) && $results1['customerAsset'] != $post['customerAsset']) {
                        $fsTrans[] = array(
                            'field' => 'Customer Asset changed', 'o' => $results1['customerAsset'], 'n' => $post['customerAsset'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                    if (isset($results1['eyefiAsset']) && $results1['eyefiAsset'] != $post['eyefiAsset']) {
                        $fsTrans[] = array(
                            'field' => 'Eyefi Asset changed', 'o' => $results1['eyefiAsset'], 'n' => $post['eyefiAsset'], 'comment' => 'Updated after submission', 'uniqueId' => $post['id'], 'type' => 'Field Service Work Order', 'workOrderId' => $post['workOrderId']
                        );
                    }
                }
            }

            $stmt->bindParam(':type', $post['type'], PDO::PARAM_STR);
            $stmt->bindParam(':customerAsset', $post['customerAsset'], PDO::PARAM_STR);
            $stmt->bindParam(':eyefiAsset', $post['eyefiAsset'], PDO::PARAM_STR);
            $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
            $results = $stmt->execute();

            $this->FS_USER_TRANS($fsTrans);
            $this->db->commit();

            return array('results11' => $results);
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
    }

    public function CheckWhatChangedOnGeneralInfo($id)
    {
        $qry = '
				SELECT *
				FROM eyefidb.fs_workOrder a
				WHERE id = :id
			';
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch();
    }

    public function UpdateOrderInfo($post)
    {
        $dateSigned = $post['dateSigned'] ? $post['dateSigned'] : null;

        if ($post['submitted'] == 1) {
            $post['submitted'] = 1;
            $post['dateSubmitted'] = $this->nowDate;
        } else {
            $post['dateSubmitted'] = null;
            $post['submitted'] = 0;
        }
        $this->db->beginTransaction();

        try {

            $qry = "
					UPDATE eyefidb.fs_workOrder
					SET customerName1 = :customerName1
						, signature = :signature
						, phone = :phone
						, survey = :survey
						, email = :email
						, workCompleted = :workCompleted
						, workCompletedComment = :workCompletedComment
						, sendResults = :sendResults
						, techSignature = :techSignature
						, comments = :comments
						, dateSigned = :dateSigned
						, submitted = :submitted
						, dateSubmitted = :dateSubmitted
						, customerSignatureImage = :customerSignatureImage
                        , technicianSignatureImage = :technicianSignatureImage
                        , repairComment = :repairComment
                        , partReceivedByName = :partReceivedByName 
                        , partReceivedBySignature = :partReceivedBySignature
                        , partLocation = :partLocation
					WHERE id = :id
				";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':customerName1', $post['customerName1'], PDO::PARAM_STR);
            $stmt->bindParam(':signature', $post['signature'], PDO::PARAM_STR);
            $stmt->bindParam(':phone', $post['phone'], PDO::PARAM_STR);
            $stmt->bindParam(':survey', $post['survey'], PDO::PARAM_STR);
            $stmt->bindParam(':email', $post['email'], PDO::PARAM_STR);
            $stmt->bindParam(':workCompleted', $post['workCompleted'], PDO::PARAM_STR);
            $stmt->bindParam(':workCompletedComment', $post['workCompletedComment'], PDO::PARAM_STR);
            $stmt->bindParam(':sendResults', $post['sendResults'], PDO::PARAM_STR);
            $stmt->bindParam(':techSignature', $post['techSignature'], PDO::PARAM_STR);
            $stmt->bindParam(':comments', $post['comments'], PDO::PARAM_STR);
            $stmt->bindParam(':dateSigned', $dateSigned, PDO::PARAM_STR);
            $stmt->bindParam(':submitted', $post['submitted'], PDO::PARAM_INT);
            $stmt->bindParam(':dateSubmitted', $post['dateSubmitted'], PDO::PARAM_STR);
            $stmt->bindParam(':customerSignatureImage', $post['customerSignatureImage'], PDO::PARAM_STR);
            $stmt->bindParam(':technicianSignatureImage', $post['technicianSignatureImage'], PDO::PARAM_STR);
            $stmt->bindParam(':repairComment', $post['repairComment'], PDO::PARAM_STR);
            $stmt->bindParam(':partReceivedByName', $post['partReceivedByName'], PDO::PARAM_STR);
            $stmt->bindParam(':partReceivedBySignature', $post['partReceivedBySignature'], PDO::PARAM_STR);
            $stmt->bindParam(':partLocation', $post['partLocation'], PDO::PARAM_STR);
            $stmt->bindParam(':id', $post['id'], PDO::PARAM_INT);
            $results = $stmt->execute();

            $this->db->commit();

            return array('results' => $results);
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
    }

    public function getAttachments($uniqueId)
    {

        $mainQry = "
			select type
                , value name
                , receipt_value
            from eyefidb.fs_scheduler_settings a
			where a.type = 'Receipt Options'
		";
        $query = $this->db->prepare($mainQry);
        $query->execute();
        $receiptOptions = $query->fetchAll(PDO::FETCH_ASSOC);

        $data =  $this->uploader->getAttachments($uniqueId, 'Field Service', 'fieldService');


        $images = array();
        $receipts = array();

        foreach ($data as $row) {
            if ($row['mainId'] != 0) {
                $receipts[] = $row;
            } else {
                $images[] = $row;
            }
        }

        return array("images" => $images, "receipts" => $receipts, "receiptOptions" => $receiptOptions);
    }

    public function CheckIfWorkOrderAlreadyCreated($fs_scheduler_id)
    {
        $qry = "
            SELECT fs_scheduler_id
                , id
            FROM eyefidb.fs_workOrder a
            WHERE fs_scheduler_id = :fs_scheduler_id
        ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':fs_scheduler_id', $fs_scheduler_id, PDO::PARAM_STR);
        $stmt->execute();
        $results = $stmt->fetch();

        return $results['id'];
    }

    public function createTicket($fs_scheduler_id)
    {

        $workOrderCheck = $this->CheckIfWorkOrderAlreadyCreated($fs_scheduler_id);
        if ($workOrderCheck) {
            return array('updatedId' => $workOrderCheck);
        }

        $this->db->beginTransaction();

        try {
            $qry = "
					INSERT INTO eyefidb.fs_workOrder(
						userId
						, createdDate
						, fs_scheduler_id
					) 
					values(
						:userId
						, :createdDate
						, :fs_scheduler_id
					)
				";
            $stmt = $this->db->prepare($qry);
            $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
            $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);
            $stmt->bindParam(':fs_scheduler_id', $fs_scheduler_id, PDO::PARAM_STR);
            $stmt->execute();
            $updatedId = $this->db->lastInsertId();

            $this->db->commit();

            return array('updatedId' => $updatedId);
        } catch (PDOException $e) {
            $this->db->rollBack();
        }
    }

    public function fs_workOrderProject_copy($updatedId)
    {

        $qry = "
        INSERT INTO eyefidb.fs_workOrderProject_copy(
            workOrderId
            , userId
            , createdDate
            , proj_type
            , seq
        ) 
        values(
            :workOrderId
            , :userId
            , :createdDate
            , :proj_type
            , :seq
        )
    ";
        $stmt = $this->db->prepare($qry);
        $stmt->bindParam(':workOrderId', $updatedId, PDO::PARAM_STR);
        $stmt->bindParam(':userId', $this->sessionId, PDO::PARAM_INT);
        $stmt->bindParam(':createdDate', $this->nowDate, PDO::PARAM_STR);

        $workInfo = ['Travel To Site', 'Unpack/Offload', 'Install', 'Clean-up/Post Installation', 'Travel From Site'];
        $oo = 0;
        for ($kk = 0; $kk < count($workInfo); $kk++) {
            $oo++;
            $stmt->bindParam(':proj_type', array_values($workInfo)[$kk], PDO::PARAM_STR);
            $stmt->bindParam(':seq', $oo, PDO::PARAM_INT);
            $stmt->execute();
        }
    }

    public function sendTechSchedule($post)
    {
        $sql = "INSERT INTO eyefidb.fs_scheduler_tech_scheduler (date_from, date_to, token) VALUES(:date_from,:date_to,:token) ON DUPLICATE KEY UPDATE    
            date_from = VALUES(date_from), date_to = VALUES(date_to), token = VALUES(token)";

        $stmt = $this->db->prepare($sql);
        $stmt->bindParam(':date_from', $post['date_from'], PDO::PARAM_STR);
        $stmt->bindParam(':date_to', $post['date_to'], PDO::PARAM_STR);
        $stmt->bindParam(':token', $post['token'], PDO::PARAM_STR);
        return $stmt->execute();
    }


    public function __destruct()
    {
        $this->db = null;
    }
}
