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
                select a.created_date
                    , DATEDIFF(curDate(), a.created_date) total_days 
                    , b.id fs_scheduler_id
                    , a.token
                    , a.id request_id
                from fs_request a
                left join fs_scheduler b ON b.request_id = a.id
                where a.active = 1 AND b.id IS NULL
                Having total_days >= 3
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
    

    $emailUsers = emailNotification('field_service_overdue_requests');

    $mail = new PHPMailer(true);
    $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
    $mail->setFrom('noreply@the-fi-company.com', 'DB The-Fi-Company');
    $mail->Subject = "Field Service Overdue Requests";

    $addresses = explode(',', $emailUsers);
    foreach ($addresses as $address) {
        $mail->AddAddress($address);
    }
       


    $mail->Body  = 'Good morning team, <br> Please review the below past due requests.';

    $mail->Body .= '<br><br>';
    $mail->Body .= '<html><body>';
    

    $mail->Body .= '<table rules="all" style="border-color: #666;" cellpadding="5" border="1">';
    $mail->Body .= "<tr style='background: #eee;'>";
    $mail->Body .= "<td><strong>Request ID</strong></td>";
    $mail->Body .= "<td><strong>Request Created Date</strong></td>";
    $mail->Body .= "<td><strong>Total Days Open</strong></td>";
    $mail->Body .= "<td><strong>View Request</strong></td>";
    $mail->Body .= "</tr>";


    $is_really_past_due = false;
    $is_late_days = 7;

    foreach ($data as $row) {
        if($row['total_days'] >= $is_late_days){
            $is_really_past_due = true;
        }

        $link = "https://dashboard.eye-fi.com/dist/web/field-service/request/edit?id=" . $row['request_id'];
        $mail->Body .= "<tr>";
        $mail->Body .= "<td>" . $row['request_id'] . "</td>";
        $mail->Body .= "<td>" . $row['created_date'] . "</td>";
        $mail->Body .= "<td>" . $row['total_days'] . "</td>";
        $mail->Body .= '<td> <a href="' . $link . '">View</a> </td>';
        $mail->Body .= "</tr>";
    }
    $mail->Body .= "</table>";
    $mail->Body .= '<br><hr>';

    // if($is_really_past_due){
    //     $emailUsers .= "
    //         ritz.dacanay@the-fi-company.com,
    //     ";
    // }
    
    $mail->Body .= 'This automated email will be sent daily at 6 am <br>';
    $mail->Body .= 'Thank you.';

    $mail->Body .= "</body></html>";

    if(count($data) > 0){
        $mail->send();
        echo "Email Sent";
    } else{
        echo "Email not sent";
    }
