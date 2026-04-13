<?php

use PHPMailer\PHPMailer\PHPMailer;
class MrbRequest
{

	protected $db;
	public $sessionId;

	public function __construct($db, $dbQad)
	{

		$this->db = $db;
		$this->db1 = $dbQad;
		$this->nowDate = date("Y-m-d H:i:s", time());
		$this->app_email_error_from = 'noreply@the-fi-company.com';
	}

	public function getById($id)
	{
		$qirSearch = '
				SELECT id, RIGHT(mrbNumber,3) mrbNumber, DATE_FORMAT(createdDate,"%y") year, DATE_FORMAT(createdDate,"%m") month
				FROM eyefidb.mrb_request
				where mrbNumber IS NOT NULL
				ORDER BY id DESC
				LIMIT 1

			';
		$qirSearchQuery = $this->db->prepare($qirSearch);
		$qirSearchQuery->execute();
		return $qirSearchQuery->fetch(PDO::FETCH_ASSOC);
	}

	public function getMrbById($id)
	{

		$qirSearch = "
				SELECT qirNumber 
					, itemCost pt_price
					, disposition 
					, status 
					, comments 
					, failureType 
					, componentType 
					, type type1
					, partNumber eyefiPartNumber
					, partDescription fulldesc
					, dateReported customerReportedDate
					, qtyRejected qtyAffected
					, wo_so purchaseOrder
					, id
					, rma
					, active
					, a.mrbNumber
					, a.lotNumber
					, a.firstApproval
					, a.secondApproval
				FROM eyefidb.mrb_request a
				WHERE id = :id
				LIMIT 1
			";
		$qirSearchQuery = $this->db->prepare($qirSearch);
		$qirSearchQuery->bindParam(':id', $id, PDO::PARAM_STR);
		$qirSearchQuery->execute();
		$row = $qirSearchQuery->fetch();

		if ($row) {
			return $obj = array(
				"failureType" => $row['failureType'],
				"qirNumber" => $row['qirNumber'],
				"componentType" => $row['componentType'],
				"type" => $row['type1'],
				"partNumber" => $row['eyefiPartNumber'],
				"partDescription" => $row['fulldesc'],
				"itemCost" => $row['pt_price'],
				"dateReported" => $row['customerReportedDate'],
				"qtyRejected" => $row['qtyAffected'],
				"wo_so" => $row['purchaseOrder'],
				"id" => $row['id'],
				"disposition" => $row['disposition'],
				"comments" => $row['comments'],
				"rma" => $row['rma'],
				"status" => $row['status'],
				"mrbFound" =>  "true",
				"found" => true,
				"active" => $row['active'],
				"mrbNumber" => $row['mrbNumber'],
				"lotNumber" => $row['lotNumber'],
				"firstApproval" => $row['firstApproval'],
				"secondApproval" => $row['secondApproval']
			);
		}
	}


	public function generateMRBNumber($previous_sequence, $previous_year, $previous_month)
	{

		/** Need to find ount the last number */

		/**
		 * For the QIR number, can this be set up as a field that is automatically populated when a new MRB record is raised?  
		 * Maybe in the format YYMMxxx where YY is the year, MM is the month and xxx is a sequential number.  
		 * So 2109001 would be the first one raised in September 2021?  
		 * Then when we get to October the format becomes 2110xxx and we start again at number 1 – so the first one for October would be 2110001, etc.  
		 * I prefer that this is not a free text field so that we have consistency of numbering.
		 */

		//start

		//get current year
		$current_year = date('y');

		//get current month
		$current_month = date('m');

		//get current sequence 
		$previous_sequence = $previous_sequence;

		//sequence should start counting up in current month/year and reset when new month arrives.

		//compare previous month and year with current month and year.

		//if previous month and year is equal to current month and year. Increment sequence number

		$new_sequence = '001';
		if ($current_year != $previous_year && $current_month != $previous_month) {
			$new_sequence = '001';
		} else if ($current_year == $previous_year && $current_month == $previous_month) {
			$new_sequence = str_pad($previous_sequence + 1, 3, "0", STR_PAD_LEFT);;
		}

		return $current_year . $current_month . $new_sequence;

		//else set new month and year and sequence set to 0

		// End

	}

	public function QirNumberSearch($qir)
	{

		$obj = array();
		// if mrb not found
		$qirSearch = "
				SELECT *
				FROM eyefidb.qa_capaRequest
				WHERE qir = :qir
				LIMIT 1
			";
		$qirSearchQuery = $this->db->prepare($qirSearch);
		$qirSearchQuery->bindParam(':qir', $qir, PDO::PARAM_STR);
		$qirSearchQuery->execute();
		$row = $qirSearchQuery->fetch();
		$eyePartNumber = $row['eyefiPartNumber'];

		if ($row) {

			$p = str_replace('/', '', $eyePartNumber);
			$p = str_replace(' ', '', $p);
			
			$qirSearch = "
					SELECT pt_part
						, b.sct_cst_tot pt_price
						, CONCAT(pt_desc1, pt_desc2) fullDesc
					FROM pt_mstr a
					left join sct_det b ON a.pt_part = b.sct_part AND sct_sim = 'Standard' and sct_domain = 'EYE' 
					and sct_site  = 'EYE01'
					WHERE pt_part = :part
					WITH (noLock)
				";
			$qirSearchQuery = $this->db1->prepare($qirSearch);
			$qirSearchQuery->bindParam(':part', $p, PDO::PARAM_STR);
			$qirSearchQuery->execute();
			$qadResults = $qirSearchQuery->fetch();

			$obj = array(
				"failureType" => $row['failureType'],
				"qirNumber" => $qir,
				"componentType" => $row['componentType'],
				"type" => $row['type1'],
				"partNumber" => $row['eyefiPartNumber'],
				"partDescription" => $qadResults['FULLDESC'],
				"itemCost" => $qadResults['PT_PRICE'],
				"dateReported" => $row['customerReportedDate'],
				"qtyRejected" => $row['qtyAffected'],
				"wo_so" => $row['purchaseOrder'],
				"id" => $row['id'],
				"disposition" => isset($row['disposition']) ? $row['disposition'] : null,
				"comments" => isset($row['comments']) ? $row['comments'] : '',
				"rma" => isset($row['rma']) ? $row['rma'] : '',
				"status" => null,
				"mrbFound" => "false",
				"found" => true,
				"active" => $row['active'],
				"mrbNumber" => '',
				"lotNumber" => isset($row['lotNumber']) ? $row['lotNumber'] : ''
			);
		} else {
			$obj = array(
				"qirNumber" => $qir, "found" => false
			);
		}

		return $obj;
	}

	public function sendEmail($updatedId, $typeOfApproval, $toEmail, $message)
	{
		$link = 'https://dashboard.eye-fi.com/dist/v1/quality/mrb?view=' . $updatedId;

		$to         = $toEmail;
		//$to         = 'john.kim@the-fi-company.com';
		$subject   	= "MRB# $updatedId Scrap - $typeOfApproval ";

		
		$mail = new PHPMailer(true);
		$mail->isHTML(true);
		$mail->CharSet = 'UTF-8';
		$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
		$mail->Subject = $subject;
	
		$mail->AddAddress($to);

		$mail->Body  = 'Hello Team, <br><br>';
		if ($message) {
			$mail->Body  .= "$message <br><br>";
		}
		$mail->Body .= 'Please click <a href="' . $link . '">here</a> to view the MRB scrap item by Quality Control.<br> <br>';
		$mail->Body .= '<br><br>';

		$mail->Body .= '<br><hr>';
		$mail->Body .= 'This is an automated email. Please do not respond. <br>';
		$mail->Body .= 'Thank you.';

		$mail->Body .= "</body></html>";

		$mail->send();
	}


	public function SaveForm($post)
	{
		$err = false;
		$errTyp = "";
		$errMSG = "";

		$obj = array();
		$this->db->beginTransaction();
		try {

			if (!$err) {

				$itemCost = isset($post['itemCost']) ? $post['itemCost'] : 0;
				$disposition = isset($post['disposition']) ? $post['disposition'] : "";
				$status = isset($post['status']) ? $post['status'] : "";
				$failureType = isset($post['failureType']) ? $post['failureType'] : "";
				$componentType = isset($post['componentType']) ? $post['componentType'] : "";
				$type = isset($post['type']) ? $post['type'] : "";
				$partNumber = isset($post['partNumber']) ? $post['partNumber'] : "";
				$partDescription = isset($post['partDescription']) ? $post['partDescription'] : "";
				$dateReported = $post['dateReported'] ? $post['dateReported'] : NULL;
				$qtyRejected = isset($post['qtyRejected']) ? $post['qtyRejected'] : 0;
				$wo_so = isset($post['wo_so']) ? $post['wo_so'] : "";
				$qirNumber = isset($post['qirNumber']) ? $post['qirNumber'] : "";
				$id = isset($post['id']) ? $post['id'] : "";
				$comments = isset($post['comments']) ? $post['comments'] : "";
				$rma = isset($post['rma']) ? $post['rma'] : "";
				$lotNumber = isset($post['lotNumber']) ? $post['lotNumber'] : "";

				if ($post['typeOfTransaction'] == "Add") {
					$qry = "
							INSERT INTO eyefidb.mrb_request(
								qirNumber
								, createdBy
								, itemCost
								, disposition
								, status
								, failureType
								, componentType
								, type
								, partNumber
								, partDescription
								, dateReported
								, qtyRejected
								, wo_so
								, comments
								, rma
								, lotNumber
							) 
							VALUES(
								:qirNumber
								, :createdBy
								, :itemCost
								, :disposition
								, :status
								, :failureType
								, :componentType
								, :type
								, :partNumber
								, :partDescription
								, :dateReported
								, :qtyRejected
								, :wo_so
								, :comments
								, :rma
								, :lotNumber
							)
						";
					$query = $this->db->prepare($qry);
					$query->bindParam(':qirNumber', $qirNumber, PDO::PARAM_STR);
					$query->bindParam(':createdBy', $this->sessionId, PDO::PARAM_INT);
					$query->bindParam(':itemCost', $itemCost, PDO::PARAM_STR);
					$query->bindParam(':disposition', $disposition, PDO::PARAM_STR);
					$query->bindParam(':status', $status, PDO::PARAM_STR);
					$query->bindParam(':failureType', $failureType, PDO::PARAM_STR);
					$query->bindParam(':componentType', $componentType, PDO::PARAM_STR);
					$query->bindParam(':type', $type, PDO::PARAM_STR);
					$query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
					$query->bindParam(':partDescription', $partDescription, PDO::PARAM_STR);
					$query->bindParam(':dateReported', $dateReported, PDO::PARAM_STR);
					$query->bindParam(':qtyRejected', $qtyRejected, PDO::PARAM_STR);
					$query->bindParam(':wo_so', $wo_so, PDO::PARAM_STR);
					$query->bindParam(':comments', $comments, PDO::PARAM_STR);
					$query->bindParam(':rma', $rma, PDO::PARAM_STR);
					$query->bindParam(':lotNumber', $lotNumber, PDO::PARAM_STR);
					$query->execute();
					$updatedId = $this->db->lastInsertId();

					if ($updatedId) {

						$err = false;
						$errTyp = "danger";
						$errMSG = "MRB# " . $updatedId . " created.";

						$currentData = $this->getById($updatedId);

						$newMrbNumber = $this->generateMRBNumber($currentData['mrbNumber'], $currentData['year'], $currentData['month']);

						$qry = "
							UPDATE eyefidb.mrb_request
							set mrbNumber = :newMrbNumber
							WHERE id = :id					
						";
						$query = $this->db->prepare($qry);
						$query->bindParam(':newMrbNumber', $newMrbNumber, PDO::PARAM_STR);
						$query->bindParam(':id', $updatedId, PDO::PARAM_INT);
						$query->execute();

						

						$this->db->commit();

//Trang Tran <trang.tran@the-fi-company.com>; Nick  Walter <nick.walter@the-fi-company.com>; Juvenal Torres <juvenal.torres@the-fi-company.com>; Monica  Hubbard <monica.hubbard@the-fi-company.com>; Casey Cushing <casey.cushing@the-fi-company.com>				
$to = "trang.tran@the-fi-company.com,nick.walter@the-fi-company.com,juvenal.torres@the-fi-company.com,monica.hubbard@the-fi-company.com";
$to = "ritz.dacanay@the-fi-company.com";
$cc = "ritz.dacanay@the-fi-company.com";

$link = 'https://dashboard.eye-fi.com/dist/v1/quality/mrb?view=' . $updatedId;

$subject = "New MRB Submitted " . $updatedId;


$mail = new PHPMailer(true);
$mail->isHTML(true);
$mail->CharSet = 'UTF-8';
$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
$mail->Subject = $subject;

$to = explode(',', $to);
foreach ($to as $address) {
	$mail->AddAddress($address);
}

$mail->addCC($cc);

$mail->Body = '<html><body style="padding:50px">';

$mail->Body .= "Hello All, A new MRB request submitted. To view this MRB, click on the direct link to <a href='{$link}' target='_parent'>MRB Report</a>. <br><br>";

$mail->Body .= '<br>';
$mail->Body .= '<hr>';
$mail->Body .= "Thank you <br>";
$mail->Body .= "</body></html>";

$mail->send();

						if ($disposition == 'Scrap')
							$this->sendEmail($updatedId, 'Quality Manager Approval needed', 'chad.bierman@the-fi-company.com', false);
					}
				} else {
					$qry = "
							UPDATE eyefidb.mrb_request
							set qirNumber = :qirNumber
								, itemCost = :itemCost
								, disposition = :disposition
								, status = :status
								, failureType = :failureType
								, componentType = :componentType
								, type = :type
								, partNumber = :partNumber
								, partDescription = :partDescription
								, dateReported = :dateReported
								, qtyRejected = :qtyRejected
								, comments = :comments
								, rma = :rma
								, wo_so = :wo_so
								, active = :active
								, lotNumber = :lotNumber
							WHERE id = :id					
						";
					$query = $this->db->prepare($qry);
					$query->bindParam(':qirNumber', $qirNumber, PDO::PARAM_STR);
					$query->bindParam(':itemCost', $itemCost, PDO::PARAM_STR);
					$query->bindParam(':disposition', $disposition, PDO::PARAM_STR);
					$query->bindParam(':status', $status, PDO::PARAM_STR);
					$query->bindParam(':failureType', $failureType, PDO::PARAM_STR);
					$query->bindParam(':componentType', $componentType, PDO::PARAM_STR);
					$query->bindParam(':type', $type, PDO::PARAM_STR);
					$query->bindParam(':partNumber', $partNumber, PDO::PARAM_STR);
					$query->bindParam(':partDescription', $partDescription, PDO::PARAM_STR);
					$query->bindParam(':dateReported', $dateReported, PDO::PARAM_STR);
					$query->bindParam(':qtyRejected', $qtyRejected, PDO::PARAM_STR);
					$query->bindParam(':wo_so', $wo_so, PDO::PARAM_STR);
					$query->bindParam(':id', $id, PDO::PARAM_INT);
					$query->bindParam(':comments', $comments, PDO::PARAM_STR);
					$query->bindParam(':rma', $rma, PDO::PARAM_STR);
					$query->bindParam(':active', $post['active'], PDO::PARAM_INT);
					$query->bindParam(':lotNumber', $lotNumber, PDO::PARAM_STR);
					$query->execute();

					if ($status == 'Closed') {
						if ($post['firstApproval'] == "") {
							if ($disposition == 'Scrap') {
								$this->db->rollBack();
								http_response_code(400);
								die('Quality manager approval needed before closing MRB.');
							}
						} else if ($post['secondApproval'] == "") {
							if ($disposition == 'Scrap') {
								$this->db->rollBack();
								http_response_code(400);
								die('VP approval needed before closing MRB.');
							}
						} else {
							$this->sendEmail($id, 'Scrap completed by QC. QAD update pending by Logistics.', 'trang.tran@the-fi-company.com', 'Scrap parts completed by QC. Please update QAD systematically');
						}

$to = "trang.tran@the-fi-company.com,nick.walter@the-fi-company.com,juvenal.torres@the-fi-company.com,monica.hubbard@the-fi-company.com";
$to = "ritz.dacanay@the-fi-company.com";
$cc = "ritz.dacanay@the-fi-company.com";

$link = 'https://dashboard.eye-fi.com/dist/v1/quality/mrb?view=' . $id;

$subject = "MRB is completed - " . $id;


$mail = new PHPMailer(true);
$mail->isHTML(true);
$mail->CharSet = 'UTF-8';
$mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
$mail->Subject = $subject;

$to = explode(',', $to);
foreach ($to as $address) {
	$mail->AddAddress($address);
}

$mail->addCC($cc);

$mail->Body = '<html><body style="padding:50px">';

$mail->Body .= "Hello All, This MRB is complete. To view this MRB, click on the direct link to <a href='{$link}' target='_parent'>MRB Report</a>. <br><br>";

$mail->Body .= '<br>';
$mail->Body .= '<hr>';
$mail->Body .= "Thank you <br>";
$mail->Body .= "</body></html>";

$headers = array(
	'From' => 'noreply@the-fi-company.com',
	'Reply-To' => 'noreply@the-fi-company.com',
	'Reply-Path' => $to,
	'CC' => $cc,
	'X-Mailer' => 'PHP/' . phpversion(),
	'Content-Type' => 'text/html; charset=ISO-8859-1'
);

$mail->send();
					}

					$err = false;
					$errTyp = "danger";
					$errMSG = "MRB# Updated";

					$this->db->commit();
				}
			}

			$obj = array(
				"message" => $errMSG, "type" => $errTyp, "err" => $err
			);

			return $obj;
		} catch (PDOException $e) {

			$this->db->rollBack();
			http_response_code(500);
			return $e->getMessage();
		}
	}

	public function update($data)
	{
		$qry = "
			UPDATE eyefidb.mrb_request
			set firstApproval = :firstApproval
				, secondApproval = :secondApproval
			WHERE id = :id					
		";
		$query = $this->db->prepare($qry);
		$query->bindParam(':firstApproval', $data['firstApproval'], PDO::PARAM_STR);
		$query->bindParam(':secondApproval', $data['secondApproval'], PDO::PARAM_STR);
		$query->bindParam(':id', $data['id'], PDO::PARAM_STR);
		$query->execute();

		if ($data['firstApproval'] != "" && $data['secondApproval'] == "") {
			if ($data['disposition'] == 'Scrap')
				$this->sendEmail($data['id'], 'VP Operations Approval Needed', 'nick.walter@the-fi-company.com', false);
		}
		if ($data['firstApproval'] != "" && $data['secondApproval'] != "") {
			if ($data['disposition'] == 'Scrap')
				$this->sendEmail($data['id'], 'Scrap approved by Quality Manager & VP Operations', 'trang.tran@the-fi-company.com', '<h3>Please scrap the parts physically. When completed, please update status to CLOSED.</h3>');
		}

		return "updated";
	}

	public function __destruct()
	{
		$this->db = null;
	}
}
