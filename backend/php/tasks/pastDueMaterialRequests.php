<?php

use PHPMailer\PHPMailer\PHPMailer;

class pastDueMaterialRequestValidations
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

	public function notificationSubscribers($ubscribedTo)
	{
		$mainQry = "
			select email
			from eyefidb.cron_email_notifications 
			where active = 1
			and subscribed_to = :subscribed_to
		";
		$query = $this->db1->prepare($mainQry);
		$query->bindParam(":subscribed_to", $ubscribedTo, PDO::PARAM_STR);
		$query->execute();
		$results = $query->fetch(PDO::FETCH_ASSOC);

		if ($results['email']) {
			return json_encode($results['email']);
		} else {
			return false;
		}
	}

	public function sendEmail()
	{

		$subscribers = $this->notificationSubscribers('past_due_material_request_validation');

		if ($subscribers == "") {
			echo "No subscribers";
			die();
		}

		$mainQry = "
			select *, 
				dateDiff(curDate(), dueDate) age 
			from eyefidb.mrf 
			where validated is null 
				and active = 1 
				and createdBy != 3 
				and dateDiff(curDate(), dueDate) >= 2
		";
		$query = $this->db1->prepare($mainQry);
		$query->execute();
		$data = $query->fetchAll(PDO::FETCH_ASSOC);

		$subscribers = explode(",", $subscribers);
		$emailUsers = trim(implode(',', $subscribers), '"'); // your email address;

        $mail = new PHPMailer(true);
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
        $mail->Subject = "Past due material request validations";

        $addresses = explode(',', $emailUsers);
        foreach ($addresses as $address) {
            $mail->AddAddress($address);
        }
           

		$mail->Body  = 'Hello Team, <br>';
		$mail->Body .= 'Please review the below past due material validation work orders. These orders are over 2 days old. If MRs are not needed, please delete them.';
		$mail->Body .= '<br><br>';
		$mail->Body .= '<html><body>';
		$mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
		$mail->Body .= "<tr style='background: #eee;'>";
		$mail->Body .= "<td><strong>MR number</strong></td>";
		$mail->Body .= "<td><strong>Requestor</strong></td>";
		$mail->Body .= "<td><strong>Pick List</strong></td>";
		$mail->Body .= "<td><strong>Due Date</strong></td>";
		$mail->Body .= "<td><strong>Age</strong></td>";
		$mail->Body .= "</tr>";

		foreach ($data as $row) {

			$mail->Body .= "<tr> \r\n";
			$mail->Body .= "<td>" . $row['id'] . "</td> \r\n";
			$mail->Body .= "<td>" . $row['requestor'] . "</td> \r\n";
			$mail->Body .= "<td>" . $row['pickList'] . "</td> \r\n";
			$mail->Body .= "<td>" . $row['dueDate'] . "</td> \r\n";
			$mail->Body .= "<td>" . $row['age'] . "</td> \r\n";
			$mail->Body .= "</tr> \r\n";
		}

		$mail->Body .= "</table>";
		$mail->Body .= '<br><hr>';
		$mail->Body .= 'This is an automated email. Please do not respond. <br>';
		$mail->Body .= 'Thank you.';

		$mail->Body .= "</body></html>";

		//only send if there is new orders, that have not been sent yet. 
		if (count($data) > 0) {
			$mail->send();
			echo "email sent";
		} else {
			echo "email failed";
		}
	}
}


use EyefiDb\Databases\DatabaseEyefi as DatabaseEyefi;
use EyefiDb\Databases\DatabaseQad as DatabaseQad;

$db_connect = new DatabaseEyefi();
$db = $db_connect->getConnection();

$db_connect_qad = new DatabaseQad();
$dbQad = $db_connect_qad->getConnection();

$data = new pastDueMaterialRequestValidations($db, $dbQad);
$data->sendEmail();
