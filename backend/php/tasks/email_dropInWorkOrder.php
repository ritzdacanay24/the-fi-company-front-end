<?php

class SENDEMAIL
{

	protected $db;

	public function __construct($db, $dbQad)
	{

		$this->db = $dbQad;
		$this->db1 = $db;
		$this->nowDate = date("Y-m-d", time());
		$this->nowDateTime = date("Y-m-d h:m:s", time());
		$this->app_email_error_from = 'noreply@the-fi-company.com';
	}

	public function SendMail()
	{

		$mainQry = "
				select a.wo_nbr wo_nbr
					, a.wo_lot wo_lot
					, a.wo_ord_date wo_ord_date
					, a.wo_due_date wo_due_date
					, a.wo_due_date wo_due_date
					, a.wo_qty_ord wo_qty_ord
					, a.wo_part wo_part
					, b.pt_desc1 pt_desc1
					, b.pt_desc2 pt_desc2
					, a.wo_so_job
				from wo_mstr a
				LEFT JOIN (
					SELECT pt_part
						, max(pt_desc1) pt_desc1
						, max(pt_desc2) pt_desc2
					FROM pt_mstr
					WHERE pt_domain = 'EYE'
					GROUP BY pt_part
				) b ON b.pt_part = a.wo_part
				where a.wo_qty_ord != a.wo_qty_comp
					AND wo_domain = 'EYE'
					AND (wo_so_job = 'dropin' OR wo_so_job = 'DROPIN')
				with (noLock) 
			";
		$query = $this->db->prepare($mainQry);
		$query->execute();
		$hotDropIn = $query->fetchAll(PDO::FETCH_ASSOC);


		$mainQry1 = "
				SELECT orderNum
				FROM eyefidb.email
				WHERE orderNum = :orderNum
			";

		$mainQryInsert = "
				INSERT INTO eyefidb.email (
					email 
					, createdDate
					, subject
					, orderNum
				) value (
					:email 
					, :createdDate
					, 'Hot Drop In - Work Order'
					, :orderNum
				)
			";

		$emailUsers = "hotdrops@eye-fi.com";

		//$emailUsers = " ritz.dacanay@the-fi-company.com ";

		$sendemailCheck = false;
		$to         = $emailUsers;
		$subject   	= "Hot Drop In - Work Order ";
		$from       = $this->app_email_error_from;

		$body  = 'Hello Team, <br>';
		$body .= 'Listed below are hot drop in order(s) that need immediate action.<br>';
		$body .= '<br><br>';
		$body .= '<html><body>';
		$body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
		$body .= "<tr style='background: #eee;'>";
		$body .= "<td><strong>Work Order Number</strong></td>";
		$body .= "<td><strong>Ordered Date</strong></td>";
		$body .= "<td><strong>Qty Ordered</strong></td>";
		$body .= "<td><strong>Due Date</strong></td>";
		$body .= "<td><strong>Item #</strong></td>";
		$body .= "<td><strong>Description</strong></td>";
		$body .= "</tr>";

		foreach ($hotDropIn as $row) {

			$queryCheck = $this->db1->prepare($mainQry1);
			$queryCheck->bindParam(':orderNum', $row['WO_NBR'], PDO::PARAM_STR);
			$queryCheck->execute();
			$emailCheck = $queryCheck->fetch();

			if ($row['WO_NBR'] != $emailCheck['orderNum']) {

				$query = $this->db1->prepare($mainQryInsert);
				$query->bindParam(':email', $emailUsers, PDO::PARAM_STR);
				$query->bindParam(':createdDate', $this->nowDateTime, PDO::PARAM_STR);
				$query->bindParam(':orderNum', $row['WO_NBR'], PDO::PARAM_STR);
				$query->execute();


				$body .= "<tr> \r\n";
				$body .= "<td>" . $row['WO_NBR'] . "</td> \r\n";
				$body .= "<td>" . $row['WO_ORD_DATE'] . "</td> \r\n";
				$body .= "<td>" . $row['WO_QTY_ORD'] . "</td> \r\n";
				$body .= "<td>" . $row['WO_DUE_DATE'] . "</td> \r\n";
				$body .= "<td>" . $row['WO_PART'] . "</td> \r\n";
				$body .= "<td>" . $row['PT_DESC1'] . " " . $row['PT_DESC2'] . "</td> \r\n";
				$body .= "</tr> \r\n";

				$sendemailCheck = true;
				echo "test";
			}
		}

		$body .= "</table>";
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

		//only send if there is new orders, that have not been sent yet. 
		if ($sendemailCheck) {
			mail($to, $subject, $finalMessage, $headers);
			echo "email sent";
		}else{
			echo "email failed";
		}
		echo $sendemailCheck;
	}
}

use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new SENDEMAIL($db, $dbQad);
$data->SendMail();
