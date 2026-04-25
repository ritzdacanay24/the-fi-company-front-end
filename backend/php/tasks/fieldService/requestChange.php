<?php

use PHPMailer\PHPMailer\PHPMailer;
	class FSRequestPastDue
	{
	 
		protected $db;
		
		public function __construct($db)
		{
			$this->db = $db;
		}			

		public function get()
		{
			
			$sql = "
                SELECT * FROM fs_comments 
                WHERE request_change = 1 
                    AND request_change_completed IS NULL
            ";
			$query = $this->db->prepare($sql);
            $query->execute();
            return  $query->fetchAll(PDO::FETCH_ASSOC);

		}
		
	}
	
use EyefiDb\Databases\DatabaseEyefi;

$db_connect_qad = new DatabaseEyefi();
$dbQad = $db_connect_qad->getConnection();

	$d = new FSRequestPastDue($dbQad);
    
    $data = $d->get();

    //echo json_encode($data);
    

    $emailUsers = emailNotification('field_service_pending_request_changes');

    
    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Field Service Pending Request Changes";

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }
       


    $mail->Body  = 'Good morning team, <br> Please review the below request changes';

    $mail->Body .= '<br><br>';
    $mail->Body .= '<html><body>';
    

    $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
    $mail->Body .= "<tr style='background: #eee;'>";
    $mail->Body .= "<td><strong>Request ID</strong></td>";
    $mail->Body .= "<td><strong>Created Date</strong></td>";
    $mail->Body .= "<td><strong>View Request</strong></td>";
    $mail->Body .= "</tr>";



    foreach ($data as $row) {
        $link = "https://dashboard.eye-fi.com/dist/web/field-service/request/edit?comment_id_=". $row['id']  ."id=" . $row['fs_request_id'];
        $mail->Body .= "<tr>";
        $mail->Body .= "<td>" . $row['fs_request_id'] . "</td>";
        $mail->Body .= "<td>" . $row['created_date'] . "</td>";
        $mail->Body .= '<td> <a href="' . $link . '">View</a> </td>';
        $mail->Body .= "</tr>";
    }
    $mail->Body .= "</table>";
    $mail->Body .= '<br><hr>';


    $mail->Body .= 'This automated email will be sent daily at 6 am <br>';
    $mail->Body .= 'Thank you.';

    $mail->Body .= "</body></html>";

    if(count($data) > 0){
        $mail->send();
    }
